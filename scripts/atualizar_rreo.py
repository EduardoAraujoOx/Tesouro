#!/usr/bin/env python3
"""
Atualiza os indicadores de execução orçamentária e de resultados fiscais do painel (data/rreo.json) e o CSV aberto
(public/dados/rreo-es.csv) a partir do RREO do Espírito Santo no Siconfi (API de dados abertos do Tesouro Nacional):

  * Anexo 01 (Balanço Orçamentário): receita prevista e realizada; despesa autorizada (dotação atualizada) e liquidada;
    investimentos autorizados e liquidados.
  * Anexo 03 (Receita Corrente Líquida): RCL dos últimos doze meses e, mês a mês, a arrecadação de ICMS e a cota-parte do FPE,
    antes das transferências aos municípios e ao Fundeb.
  * Anexo 02 (Despesas por Função): despesa autorizada e liquidada nas funções de maior interesse.
  * Anexo 04 (Receitas e Despesas Previdenciárias do RPPS): resultado dos fundos em repartição e em capitalização,
    aportes do Tesouro e resultado dos inativos e pensionistas militares.

Os valores do RREO são acumulados no exercício. Para cada ano o script guarda o último bimestre disponível: nos anos
encerrados é o 6º bimestre (ano inteiro); no ano corrente é o bimestre mais recente (por isso o valor é parcial).
Também coleta: o caixa dos recursos não vinculados (RGF, Anexo 5, dezembro de cada ano); os royalties de petróleo e gás
distribuídos ao Estado, mês a mês (ANP, dados abertos); e o IPCA mensal (Banco Central, série 433), para corrigir valores.
Nenhum número é recalculado: só são lidas linhas dos demonstrativos oficiais.

Uso:
    python3 scripts/atualizar_rreo.py

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
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "rreo.json"
CSV_SAIDA = RAIZ / "public" / "dados" / "rreo-es.csv"
CSV_CAIXA = RAIZ / "public" / "dados" / "caixa-es.csv"
CSV_ARREC = RAIZ / "public" / "dados" / "arrecadacao-es.csv"

ID_ENTE = 32  # Espírito Santo (código IBGE)
API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"
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


def rreo(ano, bim, anexo):
    q = urllib.parse.urlencode({
        "an_exercicio": ano, "nr_periodo": bim, "co_tipo_demonstrativo": "RREO", "no_anexo": anexo, "id_ente": ID_ENTE,
    })
    return http_json(f"{API}/rreo?{q}").get("items", [])


def valor(linhas, cod, coluna):
    """Valor da linha com `cod_conta` igual a `cod` (ou regex, se começar com '~') e coluna que casa com `coluna` (regex)."""
    rc = re.compile(cod[1:], re.I) if cod.startswith("~") else None
    rcol = re.compile(coluna, re.I)
    for l in linhas:
        c = l.get("cod_conta") or ""
        if (rc.search(c) if rc else c == cod) and rcol.search(l.get("coluna") or "") and l.get("valor") is not None:
            return float(l["valor"])
    return None


# funções de governo (Portaria MOG nº 42/1999) expostas no painel
FUNCOES = {
    "educacao": "Educação",
    "saude": "Saúde",
    "seguranca": "Segurança Pública",
    "transporte": "Transporte",
    "previdencia": "Previdência Social",
    "encargos": "Encargos Especiais",
}


def valor_ano(linhas, cod, coluna, ano):
    """Como `valor`, mas, quando o demonstrativo traz a coluna do exercício e a do anterior ('... / 2019', '... / 2018'),
    escolhe a do exercício."""
    rcol = re.compile(coluna, re.I)
    achados = [l for l in linhas if (l.get("cod_conta") or "").startswith(cod) and rcol.search(l.get("coluna") or "") and l.get("valor") is not None]
    if not achados:
        return None
    atual = [l for l in achados if (l.get("coluna") or "").strip().endswith(f"/ {ano}")]
    return float((atual or achados)[0]["valor"])


def funcao(linhas, nome, coluna):
    """Valor da função de governo `nome` na linha das despesas exceto intraorçamentárias."""
    rcol = re.compile(coluna, re.I)
    for l in linhas:
        if l.get("cod_conta") == "RREO2TotalDespesas" and l.get("conta") == nome and rcol.search(l.get("coluna") or "") and l.get("valor") is not None:
            return float(l["valor"])
    return None


def ano_periodo(ano):
    """Último bimestre com Anexo 06 publicado para o ano."""
    for bim in range(6, 0, -1):
        if rreo(ano, bim, "RREO-Anexo 06"):
            return bim
    return None


def mensal(linhas, ano, bim, cod):
    """Valores mês a mês de uma linha do Anexo 03 (colunas <MR>, <MR-1>, ... <MR-11>), indexados por 'AAAA-MM'."""
    saida = {}
    for l in linhas:
        if l.get("cod_conta") != cod or l.get("valor") is None:
            continue
        m = re.fullmatch(r"<MR(?:-(\d+))?>", (l.get("coluna") or "").strip())
        if not m:
            continue
        k = 2 * bim - int(m.group(1) or 0)  # mês (pode ser <= 0: ano anterior)
        a, mes = (ano, k) if k > 0 else (ano - 1, k + 12)
        saida[f"{a}-{mes:02d}"] = float(l["valor"])
    return saida


def caixa(ano):
    """Caixa dos recursos não vinculados em dezembro (RGF, Anexo 5): bruto, líquido antes e depois dos restos a pagar."""
    q = urllib.parse.urlencode({
        "an_exercicio": ano, "in_periodicidade": "Q", "nr_periodo": 3, "co_tipo_demonstrativo": "RGF",
        "no_anexo": "RGF-Anexo 05", "co_poder": "E", "id_ente": ID_ENTE,
    })
    linhas = http_json(f"{API}/rgf?{q}").get("items", [])

    def v(cod):
        for l in linhas:
            if l.get("cod_conta") == cod and (l.get("conta") or "").startswith("TOTAL DOS RECURSOS NÃO VINCULADOS") and l.get("valor") is not None:
                return float(l["valor"])
        return None

    r = {"ano": ano, "bruta": v("DisponibilidadeDeCaixaBruta"), "liquidaAntes": v("DisponibilidadeDeCaixaLiquida"), "liquidaApos": v("DisponibilidadeDeCaixaLiquidaAposRP")}
    return r if r["bruta"] is not None else None


ANP = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/pg/royalties-estados/"
ANP_NOMES = ["royalties-estado-{a}.csv", "royalties-estados-{a}.csv", "royalties_estado_{a}.csv"]


def royalties(ano):
    """Royalties de petróleo e gás pagos ao Espírito Santo, por mês de caixa (ANP). None se o arquivo do ano não existe."""
    for nome in ANP_NOMES:
        try:
            texto = http_bytes(ANP + nome.format(a=ano)).decode("utf-8", errors="ignore")
        except Exception:  # noqa: BLE001
            continue
        meses = [None] * 12
        for l in csv.DictReader(io.StringIO(texto), delimiter=";"):
            cx, es = (l.get("caixa") or "").strip(), (l.get("espirito santo") or "").strip()
            if not cx.isdigit() or not es:
                continue
            d = datetime(1899, 12, 30) + timedelta(days=int(cx))
            if d.year == ano:
                meses[d.month - 1] = float(es.replace(".", "").replace(",", "."))
        if any(m is not None for m in meses):
            return meses
    return None


def ipca():
    """Variação mensal do IPCA (Banco Central, SGS 433)."""
    d = http_json("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2018")
    return [{"mes": f"{x['data'][6:]}-{x['data'][3:5]}", "var": float(x["valor"])} for x in d]


def http_bytes(url, tentativas=4):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(3 * (i + 1))


def colher(ano):
    bim = ano_periodo(ano)
    if bim is None:
        return None
    a1 = rreo(ano, bim, "RREO-Anexo 01")
    a3 = rreo(ano, bim, "RREO-Anexo 03")
    a2 = rreo(ano, bim, "RREO-Anexo 02")
    a4 = rreo(ano, bim, "RREO-Anexo 04")
    return {
        "ano": ano,
        "bimestre": bim,
        "receitaPrevista": valor(a1, "ReceitasExcetoIntraOrcamentarias", r"^PREVISÃO ATUALIZADA"),
        "receitaRealizada": valor(a1, "ReceitasExcetoIntraOrcamentarias", r"^Até o Bimestre"),
        "despesaAutorizada": valor(a1, "DespesasExcetoIntraOrcamentarias", r"^DOTAÇÃO ATUALIZADA"),
        "despesaLiquidada": valor(a1, "DespesasExcetoIntraOrcamentarias", r"^DESPESAS LIQUIDADAS ATÉ"),
        "investimentoAutorizado": valor(a1, "Investimentos", r"^DOTAÇÃO ATUALIZADA"),
        "investimentoLiquidado": valor(a1, "Investimentos", r"^DESPESAS LIQUIDADAS ATÉ"),
        "_mensal_icms": mensal(a3, ano, bim, "ICMSLiquidoExcetoTransferenciasEFUNDEB"),
        "_mensal_fpe": mensal(a3, ano, bim, "RREO3CotaParteDoFPE"),
        "rcl12m": valor(a3, "RREO3ReceitaCorrenteLiquida", r"^TOTAL \(ÚLTIMOS 12 MESES\)"),
        **{f"funcao_{k}_liquidada": funcao(a2, nome, r"^DESPESAS LIQUIDADAS ATÉ") for k, nome in FUNCOES.items()},
        **{f"funcao_{k}_autorizada": funcao(a2, nome, r"^DOTAÇÃO ATUALIZADA") for k, nome in FUNCOES.items()},
        # previdência: resultado liquidado do fundo em repartição (plano financeiro) e em capitalização (plano previdenciário),
        # aportes do Tesouro para cobrir a insuficiência do plano financeiro e resultado dos inativos e pensionistas militares
        "previdenciaReparticao": valor_ano(a4, "RREO4ResultadoRPPSFinanceiro", r"^DESPESAS LIQUIDADAS ATÉ", ano),
        "previdenciaCapitalizacao": valor_ano(a4, "RREO4ResultadoRPPSPrevidenciario", r"^DESPESAS LIQUIDADAS ATÉ", ano),
        "previdenciaAportes": valor_ano(a4, "AportesParaAPrevidenciaPlanoFinanceiro", r"^APORTES REALIZADOS", ano),
        "previdenciaMilitares": valor_ano(a4, "ResultadoAssociadoAInativosEPensionistasMilirares", r"^DESPESAS LIQUIDADAS ATÉ", ano),
    }


def main():
    ano_atual = datetime.now(timezone.utc).year
    anos = list(range(ANO_INICIAL, ano_atual + 1))
    with ThreadPoolExecutor(4) as ex:
        linhas = [r for r in ex.map(colher, anos) if r]
    if len(linhas) < 5:
        sys.exit("Siconfi devolveu poucos exercícios; os dados atuais foram mantidos.")
    for r in linhas:
        faltam = [k for k, v in r.items() if v is None]
        if faltam:
            print(f"Aviso: {r['ano']} sem {', '.join(faltam)}", file=sys.stderr)
    anos_caixa = [c for c in (caixa(a) for a in anos) if c]
    mensal_icms, mensal_fpe = {}, {}
    for r in linhas:
        mensal_icms.update(r.pop("_mensal_icms"))
        mensal_fpe.update(r.pop("_mensal_fpe"))
    roy = {}
    for a in anos:
        meses = royalties(a)
        for i, v in enumerate(meses or []):
            if v is not None:
                roy[f"{a}-{i + 1:02d}"] = v
    saida = {
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": "Siconfi, RREO e RGF do Poder Executivo; ANP (royalties); Banco Central (IPCA)",
        "serie": linhas,
        "caixa": anos_caixa,
        "mensal": {"icms": dict(sorted(mensal_icms.items())), "fpe": dict(sorted(mensal_fpe.items())), "royalties": dict(sorted(roy.items()))},
        "ipca": ipca(),
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CSV_SAIDA.parent.mkdir(parents=True, exist_ok=True)
    campos = list(linhas[0])
    with CSV_SAIDA.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(campos)
        for r in linhas:
            w.writerow([r[k] for k in campos])
    with CSV_CAIXA.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["ano", "caixa_bruto", "caixa_liquido_antes_dos_restos_a_pagar", "caixa_liquido_apos_os_restos_a_pagar"])
        for c in anos_caixa:
            w.writerow([c["ano"], c["bruta"], c["liquidaAntes"], c["liquidaApos"]])
    with CSV_ARREC.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["mes", "icms", "cota_parte_fpe", "royalties_petroleo_gas"])
        for mes in sorted(set(mensal_icms) | set(mensal_fpe) | set(roy)):
            w.writerow([mes, mensal_icms.get(mes), mensal_fpe.get(mes), roy.get(mes)])
    print(f"{len(linhas)} exercícios gravados em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
