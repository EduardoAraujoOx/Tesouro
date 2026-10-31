#!/usr/bin/env python3
"""
Atualiza data/acervo.json a partir das páginas públicas do Tesouro Estadual
no site da SEFAZ (https://sefaz.es.gov.br).

Uso:
    python3 scripts/atualizar_acervo.py

Somente biblioteca padrão. Os PDFs NÃO são copiados: o portal aponta para o
arquivo oficial na SEFAZ, que continua sendo a fonte única da verdade.

Observação importante: a data que a SEFAZ exibe em cada linha é a data de
ATUALIZAÇÃO do arquivo, não a do período de referência. Por isso o acervo
guarda `ano`/`periodo` (extraídos do título) separadamente de `atualizadoEm`.
"""
import hashlib
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://sefaz.es.gov.br"
SAIDA = Path(__file__).resolve().parent.parent / "data" / "acervo.json"

# slug da página na SEFAZ -> (tipo, rótulo curto para título de exibição)
PAGINAS = {
    "resultado-do-tesouro-estadual": ("resultado-tesouro", "Resultado do Tesouro Estadual"),
    "resultado-de-caixa-do-tesouro-estadual": ("resultado-caixa", "Resultado de Caixa do Tesouro"),
    "rreo": ("rreo", "RREO"),
    "rgf": ("rgf", "RGF"),
    "relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal": ("divida-paf", "Relatório Anual da Dívida Pública e do PAF"),
    "programa-de-reestruturacao-e-de-ajuste-fiscal-paf": ("divida-paf", None),
    "transferencias-constitucionais-aos-municipios": ("municipios", "Distribuição mensal aos Municípios"),
    "sistema-de-contabilidade": ("normas-contabeis", None),
    "sistema-financeiro": ("normas-contabeis", None),
    "rreo-cidadao": ("cidadao", "RREO Cidadão"),
    "rgf-cidadao": ("cidadao", "RGF Cidadão"),
}

ORDINAIS = {"primeiro": 1, "segundo": 2, "terceiro": 3, "quarto": 4, "quinto": 5, "sexto": 6}
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


def baixar(slug: str) -> str:
    req = urllib.request.Request(f"{BASE}/{slug}", headers={"User-Agent": "tesouro-portal-acervo/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="ignore")


def limpar(s: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def extrair_linhas(pagina: str):
    pagina = re.sub(r"<(script|style|svg)[\s\S]*?</\1>", "", pagina)
    m = re.search(r"<main[\s\S]*?</main>", pagina)
    corpo = m.group(0) if m else pagina
    grupo = None
    tokens = re.finditer(r"<(h[1-6]|button|span|div|p)\b[^>]*>([^<]{4,120})</\1>|<tr\b[\s\S]*?</tr>", corpo)
    for t in tokens:
        if t.group(0).startswith("<tr"):
            linha = t.group(0)
            a = re.search(r'href="([^"]+)"', linha)
            celulas = [limpar(c) for c in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", linha)]
            if a and celulas and celulas[0] not in ("Conteúdo", ""):
                d = re.search(r"\d{2}/\d{2}/\d{4}", linha)
                tam = next((c for c in celulas if re.search(r"\d\s*(KB|MB|GB)", c)), None)
                yield grupo, celulas[0], (d.group(0) if d else None), tam, a.group(1)
        else:
            txt = limpar(t.group(2))
            if re.match(r"^(Resultado|Relat|RGF|RREO|Execu|Balan|20\d\d|Demonstr|Transfer|Norma|Manual)", txt) and len(txt) < 100:
                grupo = txt


def ano_de(*textos):
    for t in textos:
        if not t:
            continue
        m = re.search(r"\b(19|20)\d{2}\b", t)
        if m:
            return int(m.group(0))
    return None


def periodo_de(titulo: str):
    """Devolve (rotulo, ordem) ou (None, 0). `ordem` serve para ordenar dentro do ano."""
    t = titulo.lower()
    m = re.search(r"(primeiro|segundo|terceiro|quarto|quinto|sexto|[1-6])\s*[°º]?\s*(bimestre|bim|quadrimestre|quad)", t)
    if m:
        n = ORDINAIS.get(m.group(1)) or int(m.group(1))
        tipo = "bimestre" if m.group(2).startswith("bim") else "quadrimestre"
        return f"{n}º {tipo}", n
    m = re.search(r"(primeiro|segundo|terceiro|quarto|quinto|sexto)\s+bimestre", t)
    if m:
        n = ORDINAIS[m.group(1)]
        return f"{n}º bimestre", n
    for i, mes in enumerate(MESES, 1):
        if mes in t:
            return mes.capitalize(), i
    m = re.search(r"(?:distribui[çc][ãa]o mensal[^\d]*)(\d{2})[_ ]\d{4}", t)
    if m and 1 <= int(m.group(1)) <= 12:
        n = int(m.group(1))
        return MESES[n - 1].capitalize(), n
    return None, 0


def iso(d):
    return datetime.strptime(d, "%d/%m/%Y").date().isoformat() if d else None


def main():
    itens, vistos = [], set()
    for slug, (tipo, rotulo) in PAGINAS.items():
        try:
            pagina = baixar(slug)
        except Exception as e:  # noqa: BLE001
            print(f"AVISO: falha ao baixar {slug}: {e}", file=sys.stderr)
            continue
        n = 0
        for grupo, titulo, data, tam, href in extrair_linhas(pagina):
            url = href if href.startswith("http") else BASE + href
            chave = (tipo, titulo, url)
            if chave in vistos:
                continue
            vistos.add(chave)
            ano = ano_de(titulo, grupo)
            periodo, ordem = periodo_de(titulo)
            if rotulo and tipo != "divida-paf" and ano and periodo:
                exibicao = f"{rotulo} — {periodo} de {ano}"
            elif tipo == "divida-paf" and rotulo and re.fullmatch(r"\d{4}", titulo.strip()):
                exibicao = f"{rotulo} — {titulo.strip()}"
            elif rotulo and ano and not periodo and tipo in ("resultado-tesouro",):
                exibicao = titulo
            else:
                exibicao = titulo
            itens.append({
                "id": hashlib.sha1(f"{tipo}|{titulo}|{url}".encode()).hexdigest()[:10],
                "tipo": tipo,
                "titulo": exibicao,
                "tituloOriginal": titulo,
                "ano": ano,
                "periodo": periodo,
                "ordem": ordem,
                "atualizadoEm": iso(data),
                "tamanho": tam,
                "formato": "pdf" if url.lower().endswith(".pdf") else ("xlsx" if re.search(r"\.xlsx?$", url.lower()) else "link"),
                "url": url,
                "fonte": f"{BASE}/{slug}",
            })
            n += 1
        print(f"{slug}: {n} itens")

    itens.sort(key=lambda i: (i["ano"] or 0, i["ordem"], i["atualizadoEm"] or ""), reverse=True)
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps({
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": BASE,
        "total": len(itens),
        "itens": itens,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"OK: {len(itens)} itens -> {SAIDA}")


if __name__ == "__main__":
    main()
