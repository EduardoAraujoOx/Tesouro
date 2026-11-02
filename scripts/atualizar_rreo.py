#!/usr/bin/env python3
"""
Atualiza os indicadores de execução orçamentária e de resultados fiscais do painel (data/rreo.json) e o CSV aberto
(public/dados/rreo-es.csv) a partir do RREO do Espírito Santo no Siconfi (API de dados abertos do Tesouro Nacional):

  * Anexo 01 (Balanço Orçamentário): receita prevista e realizada; despesa autorizada (dotação atualizada) e liquidada;
    investimentos autorizados e liquidados.
  * Anexo 03 (Receita Corrente Líquida): RCL dos últimos doze meses.
  * Anexo 06 (Resultado Primário e Nominal): resultado primário e nominal, acima da linha, e as metas fixadas na LDO.
  * Anexo 02 (Despesas por Função): despesa autorizada e liquidada nas funções de maior interesse.
  * Anexo 04 (Receitas e Despesas Previdenciárias do RPPS): resultado dos fundos em repartição e em capitalização,
    aportes do Tesouro e resultado dos inativos e pensionistas militares.

Os valores do RREO são acumulados no exercício. Para cada ano o script guarda o último bimestre disponível: nos anos
encerrados é o 6º bimestre (ano inteiro); no ano corrente é o bimestre mais recente (por isso o valor é parcial).
Nenhum número é recalculado: só são lidas linhas dos demonstrativos oficiais.

Uso:
    python3 scripts/atualizar_rreo.py

Somente biblioteca padrão. Se o Siconfi estiver fora do ar, o script falha sem apagar os dados atuais.
"""
import csv
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
SAIDA = RAIZ / "data" / "rreo.json"
CSV_SAIDA = RAIZ / "public" / "dados" / "rreo-es.csv"

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


def colher(ano):
    bim = ano_periodo(ano)
    if bim is None:
        return None
    a1 = rreo(ano, bim, "RREO-Anexo 01")
    a3 = rreo(ano, bim, "RREO-Anexo 03")
    a6 = rreo(ano, bim, "RREO-Anexo 06")
    a2 = rreo(ano, bim, "RREO-Anexo 02")
    a4 = rreo(ano, bim, "RREO-Anexo 04")
    prim_sem = valor(a6, "ResultadoPrimarioSemRPPSAcimaDaLinha", r"^VALOR")
    nom_sem = valor(a6, "ResultadoNominalAcimaDaLinhaSemRPPS", r"^VALOR")
    return {
        "ano": ano,
        "bimestre": bim,
        "receitaPrevista": valor(a1, "ReceitasExcetoIntraOrcamentarias", r"^PREVISÃO ATUALIZADA"),
        "receitaRealizada": valor(a1, "ReceitasExcetoIntraOrcamentarias", r"^Até o Bimestre"),
        "despesaAutorizada": valor(a1, "DespesasExcetoIntraOrcamentarias", r"^DOTAÇÃO ATUALIZADA"),
        "despesaLiquidada": valor(a1, "DespesasExcetoIntraOrcamentarias", r"^DESPESAS LIQUIDADAS ATÉ"),
        "investimentoAutorizado": valor(a1, "Investimentos", r"^DOTAÇÃO ATUALIZADA"),
        "investimentoLiquidado": valor(a1, "Investimentos", r"^DESPESAS LIQUIDADAS ATÉ"),
        "rcl12m": valor(a3, "RREO3ReceitaCorrenteLiquida", r"^TOTAL \(ÚLTIMOS 12 MESES\)"),
        # A partir de 2023 o demonstrativo separa o RPPS; antes, o resultado é um só.
        "primario": prim_sem if prim_sem is not None else valor(a6, "RREO6ResultadoPrimarioEstadosMunicipios", r"^VALOR"),
        "metaPrimario": valor(a6, r"~^(RREO6)?MetaDeResultadoPrimario", r"^VALOR"),
        "nominal": nom_sem if nom_sem is not None else valor(a6, "ResultadoNominalAcimaDaLinha", r"^VALOR"),
        "metaNominal": valor(a6, r"~^MetaDeResultadoNominal", r"^VALOR"),
        "semRpps": prim_sem is not None,
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
    saida = {
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": "Siconfi, RREO do Poder Executivo, Anexos 01, 03 e 06",
        "serie": linhas,
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CSV_SAIDA.parent.mkdir(parents=True, exist_ok=True)
    campos = [k for k in linhas[0] if k != "semRpps"]
    with CSV_SAIDA.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(campos)
        for r in linhas:
            w.writerow([r[k] for k in campos])
    print(f"{len(linhas)} exercícios gravados em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
