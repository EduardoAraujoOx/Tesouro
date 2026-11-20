#!/usr/bin/env python3
"""
Atualiza data/brent-previsao.json: previsão oficial do preço do Brent para 2026 e 2027 (EIA, Short-Term Energy Outlook, planilha mensal) e a
mediana do Focus para o câmbio de 2027. É o parâmetro central das projeções de receita de petróleo do painel.

Técnica: valor central do Brent de 2027 = média dos 12 meses de 2027 da previsão mais recente da EIA (atualizada todo mês, com o preço
spot observado até a data da edição). Conferência com outras instituições (Banco Mundial e FMI), registradas abaixo como referência.

Fontes: https://www.eia.gov/outlooks/steo/xls/STEO_m.xlsx (série BREPUUS, "Brent Spot Average"); Banco Central do Brasil, Expectativas de
Mercado (Focus), indicador Câmbio, referência 2027.

Uso:
    python3 scripts/atualizar_brent_previsao.py
"""
import json
import re
import sys
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "brent-previsao.json"
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-brent/1.0)"}
URL_EIA = "https://www.eia.gov/outlooks/steo/xls/STEO_m.xlsx"
URL_FOCUS = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais"
# Previsões de outras instituições para o preço médio de 2027, conforme divulgadas (conferir nas publicações):
OUTRAS = [
    {"fonte": "Banco Mundial, Commodity Markets Outlook (outubro de 2026)", "preco_2027": 79.0, "nota": "Brent; cenário adverso: US$ 105"},
    {"fonte": "FMI, World Economic Outlook (outubro de 2026)", "preco_2027": 87.4, "nota": "média de Brent, Dubai e WTI, não só Brent"},
]


def baixar(url, tentativas=3):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)


def coluna(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def folha(z, nome):
    wb = z.read("xl/workbook.xml").decode("utf-8")
    rid = re.search(rf'<sheet [^>]*name="{nome}"[^>]*r:id="([^"]+)"', wb).group(1)
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    alvo = re.search(rf'<Relationship [^>]*Id="{rid}"[^>]*Target="([^"]+)"', rels) or re.search(rf'<Relationship [^>]*Target="([^"]+)"[^>]*Id="{rid}"', rels)
    return "xl/" + alvo.group(1).lstrip("/").replace("xl/", "")


def linhas(z, caminho):
    textos = [re.sub(r"<[^>]+>", "", si) for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), re.S)]
    out = []
    for lin in re.findall(r"<row[^>]*>(.*?)</row>", z.read(caminho).decode("utf-8"), re.S):
        cel = {}
        for ref, attrs, corpo in re.findall(r'<c r="([A-Z]+\d+)"([^>]*?)(?:/>|>(.*?)</c>)', lin, re.S):
            v = re.search(r"<v>(.*?)</v>", corpo or "")
            if 't="inlineStr"' in attrs:
                cel[coluna(ref)] = re.sub(r"<[^>]+>", "", corpo or "")
            elif v and 't="s"' in attrs:
                cel[coluna(ref)] = textos[int(v.group(1))]
            elif v and 't="str"' in attrs:
                cel[coluna(ref)] = v.group(1)
            elif v:
                cel[coluna(ref)] = float(v.group(1))
        out.append(cel)
    return out


def eia():
    z = zipfile.ZipFile(BytesIO(baixar(URL_EIA)))
    rows = linhas(z, folha(z, "2tab"))
    anos, meses = rows[2], rows[3]
    brent = next(r for r in rows if r.get(0) == "BREPUUS")
    cabecalho = " ".join(str(v) for v in rows[1].values())
    edicao = re.search(r"Outlook\s*-\s*(\w+ \d{4})", cabecalho)
    ano = None
    mensal = {}
    for j in sorted(meses):
        if isinstance(anos.get(j), float):
            ano = int(anos[j])
        m = meses[j]
        if isinstance(m, str) and ano and j in brent and m[:3] in ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"):
            n = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].index(m[:3]) + 1
            mensal[f"{ano}-{n:02d}"] = brent[j]
    media = lambda a: sum(v for k, v in mensal.items() if k.startswith(str(a))) / max(1, sum(1 for k in mensal if k.startswith(str(a))))
    return {"edicao": edicao.group(1) if edicao else "", "media_2026": media(2026), "media_2027": media(2027), "mensal": {k: v for k, v in mensal.items() if k >= "2026-01"}}


def focus_cambio():
    q = urllib.parse.urlencode({"$top": 1, "$filter": "Indicador eq 'Câmbio' and DataReferencia eq '2027'", "$orderby": "Data desc", "$format": "json", "$select": "Data,Mediana,numeroRespondentes"}, quote_via=urllib.parse.quote)
    v = json.loads(baixar(f"{URL_FOCUS}?{q}"))["value"][0]
    return {"mediana": v["Mediana"], "data": v["Data"], "respondentes": v["numeroRespondentes"]}


def main():
    e = eia()
    if not (60 < e["media_2027"] < 200):
        sys.exit(f"média de 2027 fora do esperado: {e['media_2027']}")
    SAIDA.write_text(json.dumps({
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tecnica": "Valor central do Brent de 2027 = média de 2027 da previsão mais recente da EIA (STEO); câmbio de 2027 = mediana do Focus",
        "eia": {**e, "fonte": "U.S. EIA, Short-Term Energy Outlook (BREPUUS, Brent Spot Average)", "url": "https://www.eia.gov/outlooks/steo/"},
        "cambio_focus_2027": focus_cambio(),
        "outras_previsoes_2027": OUTRAS,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"EIA {e['edicao']}: 2026 US$ {e['media_2026']:.1f}, 2027 US$ {e['media_2027']:.1f}", file=sys.stderr)


if __name__ == "__main__":
    main()
