#!/usr/bin/env python3
"""
Atualiza os indicadores do painel fiscal (data/indicadores.json) e os CSVs abertos
(public/dados/*.csv) com dados OFICIAIS, sem recalcular nada além de razões entre valores
publicados:

  * LRF: RGF do Poder Executivo do Espírito Santo no Siconfi (API de dados abertos do Tesouro
    Nacional): despesa com pessoal, dívida consolidada líquida, garantias e operações de crédito,
    com os limites e alertas informados no próprio relatório. Série desde 2019.
  * CAPAG: conjunto de dados abertos "Capacidade de Pagamento dos Estados e do DF" do Tesouro
    Transparente (notas e os três indicadores), edições 2018 em diante.

Uso:
    python3 scripts/atualizar_indicadores.py

Somente biblioteca padrão. Se o Siconfi estiver fora do ar, o script falha sem apagar os dados atuais.
"""
import csv
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "indicadores.json"
CSV_DIR = RAIZ / "public" / "dados"

ID_ENTE = 32  # Espírito Santo (código IBGE)
API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"
CKAN = "https://www.tesourotransparente.gov.br/ckan/api/3/action/package_show?id=capag-estados"
PAGINA_CAPAG = "https://www.tesourotransparente.gov.br/ckan/dataset/capag-estados"
ANO_INICIAL = 2019
UA = {"User-Agent": "tesouro-portal-indicadores/1.0"}


def http_json(url, tentativas=4):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return json.load(r)
        except Exception:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(3 * (i + 1))


def http_bytes(url, tentativas=4):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(3 * (i + 1))


# ------------------------------------------------------------------ LRF (Siconfi)
def rgf(ano, per, anexo):
    q = urllib.parse.urlencode({
        "an_exercicio": ano, "in_periodicidade": "Q", "nr_periodo": per,
        "co_tipo_demonstrativo": "RGF", "no_anexo": anexo, "co_poder": "E", "id_ente": ID_ENTE,
    })
    return http_json(f"{API}/rgf?{q}").get("items", [])


def achar(linhas, conta, coluna=None):
    """Primeiro valor numérico cuja conta casa com `conta` (regex, sem caixa) e a coluna com `coluna`."""
    rc = re.compile(conta, re.I)
    rcol = re.compile(coluna, re.I) if coluna else None
    for l in linhas:
        if rc.search(l.get("conta") or "") and (rcol is None or rcol.search(l.get("coluna") or "")):
            v = l.get("valor")
            if v is not None:
                return float(v)
    return None


def periodo_lrf(ano, per):
    a1, a2, a3, a4 = (rgf(ano, per, f"RGF-Anexo 0{n}") for n in (1, 2, 3, 4))
    if not a1:
        return None
    pct_pessoal = r"%\s*sobre a RCL"
    reg = {"ano": ano, "quad": per}

    # Anexo 01 – despesa total com pessoal (limites em % da RCL ajustada)
    reg["pessoal"] = {
        "valor": achar(a1, r"^DESPESA TOTAL COM PESSOAL - DTP", pct_pessoal),
        "limite": achar(a1, r"^LIMITE M[ÁA]XIMO", pct_pessoal),
        "prudencial": achar(a1, r"^LIMITE PRUDENCIAL", pct_pessoal),
        "alerta": achar(a1, r"^LIMITE DE ALERTA", pct_pessoal),
        "montante": achar(a1, r"^DESPESA TOTAL COM PESSOAL - DTP", r"^Valor$"),
        "rcl_ajustada": achar(a1, r"RECEITA CORRENTE L[ÍI]QUIDA AJUSTADA PARA C[ÁA]LCULO DOS LIMITES DE DESPESA COM PESSOAL", r"^Valor$"),
    }

    # Anexo 02 – dívida (colunas "Até o Nº Quadrimestre"); limite do Senado vem em R$, converte-se em % da RCL
    col = rf"At[ée] o {per}[ºo°]? Quadrimestre"
    rcl_end = achar(a2, r"^RECEITA CORRENTE L[ÍI]QUIDA AJUSTADA PARA C[ÁA]LCULO DOS LIMITES DE ENDIVIDAMENTO", col)
    lim_end = achar(a2, r"^LIMITE DEFINIDO POR RESOLU", col)
    ale_end = achar(a2, r"^LIMITE DE ALERTA", col)
    reg["divida"] = {
        "valor": achar(a2, r"^% da DCL sobre a RCL", col),
        "dc": achar(a2, r"^% da DC sobre a RCL", col),
        "limite": round(100 * lim_end / rcl_end, 1) if lim_end and rcl_end else None,
        "alerta": round(100 * ale_end / rcl_end, 1) if ale_end and rcl_end else None,
        "dcl_montante": achar(a2, r"^D[ÍI]VIDA CONSOLIDADA L[ÍI]QUIDA \(DCL\)", col),
        "deducoes": achar(a2, r"^DEDU[ÇC][ÕO]ES", col),
        "caixa_bruta": achar(a2, r"^Disponibilidade de Caixa Bruta", col),
        "haveres": achar(a2, r"^Demais Haveres Financeiros", col),
        "rcl_ajustada": rcl_end,
    }

    # Anexo 03 – garantias
    rcl3 = achar(a3, r"^RECEITA CORRENTE L[ÍI]QUIDA AJUSTADA PARA C[ÁA]LCULO DOS LIMITES DE ENDIVIDAMENTO", col)
    lim3 = achar(a3, r"^LIMITE DEFINIDO POR RESOLU", col)
    ale3 = achar(a3, r"^LIMITE DE ALERTA", col)
    reg["garantias"] = {
        "valor": achar(a3, r"^% do TOTAL DAS GARANTIAS sobre a RCL", col),
        "limite": round(100 * lim3 / rcl3, 1) if lim3 and rcl3 else None,
        "alerta": round(100 * ale3 / rcl3, 1) if ale3 and rcl3 else None,
        "montante": achar(a3, r"^TOTAL GARANTIAS CONCEDIDAS", col),
    }

    # Antes de 2024 o relatório não trazia o limite em R$; ele é fixo (Resoluções do Senado nº 40 e nº 43/2001):
    # dívida consolidada líquida ≤ 200% da RCL e garantias ≤ 22%; o limite de alerta é 90% do limite (LRF, art. 59, § 1º, III).
    for chave, fixo in (("divida", 200.0), ("garantias", 22.0)):
        if reg[chave]["limite"] is None:
            reg[chave]["limite"] = fixo
            reg[chave]["alerta"] = round(fixo * 0.9, 1)
            reg[chave]["limiteFixo"] = True

    # Anexo 04 – operações de crédito (colunas por tipo de valor)
    reg["credito"] = {
        "valor": achar(a4, r"^TOTAL CONSIDERADO PARA FINS DA APURA", r"% SOBRE A RCL"),
        "limite": achar(a4, r"^LIMITE GERAL DEFINIDO POR RESOLU", r"% SOBRE A RCL"),
        "alerta": achar(a4, r"^LIMITE DE ALERTA", r"% SOBRE A RCL"),
        "montante": achar(a4, r"^TOTAL CONSIDERADO PARA FINS DA APURA", r"^VALOR$"),
    }
    return reg


def entrega_rgf(ano, per):
    """Data da última entrega homologada do RGF no Siconfi (extrato de entregas)."""
    try:
        itens = http_json(f"{API}/extrato_entregas?id_ente={ID_ENTE}&an_referencia={ano}").get("items", [])
    except Exception:  # noqa: BLE001
        return None
    datas = [i["data_status"] for i in itens
             if i.get("entregavel") == "Relatório de Gestão Fiscal" and i.get("periodo") == per
             and i.get("status_relatorio") in ("HO", "RE") and i.get("data_status")]
    return max(datas)[:10] if datas else None


def coletar_lrf():
    ano_atual = datetime.now().year
    alvos = [(a, p) for a in range(ANO_INICIAL, ano_atual + 1) for p in (1, 2, 3)]
    with ThreadPoolExecutor(max_workers=4) as ex:
        regs = list(ex.map(lambda t: periodo_lrf(*t), alvos))
    serie = [r for r in regs if r and r["pessoal"]["valor"] is not None]
    if not serie:
        raise RuntimeError("Siconfi não retornou nenhum quadrimestre")
    serie.sort(key=lambda r: (r["ano"], r["quad"]))
    ultimo = serie[-1]
    ultimo["entregaEm"] = entrega_rgf(ultimo["ano"], ultimo["quad"])
    return serie


# ------------------------------------------------------------------ CAPAG (Tesouro Transparente)
def num_pct(s):
    s = (s or "").strip()
    if not s or s.upper() in ("N.D.", "ND", "-"):
        return None
    if s.endswith("%"):
        return float(s[:-1].replace(".", "").replace(",", "."))
    v = float(s.replace(",", "."))
    return round(v * 100, 2) if abs(v) < 5 else v  # arquivos antigos trazem fração (0,50 = 50%)


def linha_es(texto):
    linhas = texto.splitlines()
    ini = next((i for i, l in enumerate(linhas) if l.upper().startswith("UF;")), 0)
    leitor = csv.reader(io.StringIO("\n".join(linhas[ini:])), delimiter=";")
    cab = [c.strip() for c in next(leitor)]
    for r in leitor:
        if r and r[0].strip() == "ES":
            return dict(zip(cab, r))
    return None


def coletar_capag():
    pacote = http_json(CKAN)["result"]
    escolhidos = {}
    for r in pacote["resources"]:
        m = re.search(r"(20\d{2})", r["name"])
        if r["format"] != "CSV" or not m:
            continue
        ano = int(m.group(1))
        # em caso de duas versões do mesmo ano, vale a revisada
        if ano not in escolhidos or "revis" in r["name"].lower():
            escolhidos[ano] = r
    serie = []
    for ano in sorted(escolhidos):
        raw = http_bytes(escolhidos[ano]["url"])
        try:
            texto = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            texto = raw.decode("latin-1")
        d = linha_es(texto)
        if not d:
            continue
        serie.append({
            "ano": ano,
            "classificacao": d.get("Classificação da CAPAG") or None,
            "endividamento": num_pct(d.get("Indicador 1")), "notaEndividamento": d.get("Nota 1") or None,
            "poupanca": num_pct(d.get("Indicador 2")), "notaPoupanca": d.get("Nota 2") or None,
            "liquidez": num_pct(d.get("Indicador 3")), "notaLiquidez": d.get("Nota 3") or None,
            "qualidadeInformacao": (d.get("Qualidade da informação contábil e fiscal") or "").strip().upper().replace("ICF", "") or None,
        })
    return serie, pacote.get("metadata_modified", "")[:10]


# ------------------------------------------------------------------ saída
def gravar_csvs(lrf, capag):
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    with open(CSV_DIR / "limites-lrf-es.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ano", "quadrimestre", "indicador", "valor_pct_rcl", "limite_pct_rcl", "alerta_pct_rcl", "prudencial_pct_rcl", "fonte"])
        nomes = {"pessoal": "Despesa total com pessoal (Poder Executivo)", "divida": "Dívida consolidada líquida", "garantias": "Garantias concedidas", "credito": "Operações de crédito"}
        for r in lrf:
            for k, nome in nomes.items():
                d = r[k]
                w.writerow([r["ano"], r["quad"], nome, d.get("valor"), d.get("limite"), d.get("alerta"), d.get("prudencial"), "Siconfi/RGF"])
    with open(CSV_DIR / "capag-es.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["edicao", "classificacao", "endividamento_pct", "nota_endividamento", "poupanca_corrente_pct", "nota_poupanca", "liquidez_pct", "nota_liquidez", "qualidade_info_contabil_fiscal", "fonte"])
        for c in capag:
            w.writerow([c["ano"], c["classificacao"], c["endividamento"], c["notaEndividamento"], c["poupanca"], c["notaPoupanca"], c["liquidez"], c["notaLiquidez"], c["qualidadeInformacao"], "Tesouro Transparente/CAPAG Estados"])


def main():
    print("Coletando LRF (Siconfi)…")
    lrf = coletar_lrf()
    u = lrf[-1]
    print(f"  {len(lrf)} quadrimestres; último: {u['quad']}º de {u['ano']} (entrega {u.get('entregaEm')})")
    print("Coletando CAPAG (Tesouro Transparente)…")
    capag, modificado = coletar_capag()
    print(f"  edições: {[c['ano'] for c in capag]} (conjunto atualizado em {modificado})")
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps({
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fontes": {"siconfi": "https://apidatalake.tesouro.gov.br/docs/siconfi/", "capag": PAGINA_CAPAG},
        "capag": {"conjuntoAtualizadoEm": modificado, "serie": capag},
        "lrf": {"serie": lrf},
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    gravar_csvs(lrf, capag)
    print("OK ->", SAIDA)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print("ERRO:", e, file=sys.stderr)
        sys.exit(1)
