#!/usr/bin/env python3
"""
Atualiza data/ritmo-despesa.json: despesa empenhada e liquidada acumulada do Estado, por grupo de natureza, até o 4º e o 6º bimestres
de cada ano fechado e até o bimestre mais recente do ano corrente.

Para que serve: medir a sazonalidade da despesa (que fração do ano já está executada em agosto, por grupo) e projetar o fechamento do
ano corrente pelo ritmo de execução, para compará-lo com a proposta orçamentária. É o espelho do ritmo da receita
(scripts/atualizar_ritmo.py). Não usa dotação nem orçamento de anos anteriores, só o executado.

Fonte: Siconfi, API de dados abertos do Tesouro Nacional (RREO, Anexo 01, ente 32 = Espírito Santo), colunas "Despesas empenhadas
até o bimestre" e "Despesas liquidadas até o bimestre", despesas exceto intraorçamentárias. Nenhum número é recalculado.

Uso:
    python3 scripts/atualizar_ritmo_despesa.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "ritmo-despesa.json"
URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo"
ENTE = 32
PRIMEIRO_ANO = 2019
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-ritmo-despesa/1.0)"}
COLUNAS = {"empenhada": "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)", "liquidada": "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)"}
CONTAS = {
    "DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (VIII)": "total",
    "PESSOAL E ENCARGOS SOCIAIS": "pessoal",
    "JUROS E ENCARGOS DA DÍVIDA": "juros",
    "OUTRAS DESPESAS CORRENTES": "outras_correntes",
    "INVESTIMENTOS": "investimento",
    "INVERSÕES FINANCEIRAS": "inversoes",
    "AMORTIZAÇÃO DA DÍVIDA": "amortizacao",
}


def baixar(ano, periodo, tentativas=4):
    q = urllib.parse.urlencode({"an_exercicio": ano, "nr_periodo": periodo, "co_tipo_demonstrativo": "RREO", "no_anexo": "RREO-Anexo 01", "id_ente": ENTE})
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(f"{URL}?{q}", headers=UA), timeout=90) as r:
                return json.load(r)["items"]
        except Exception as e:  # rede instável: tenta de novo
            if i == tentativas - 1:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)
            time.sleep(3 * (i + 1))


def acumulado(itens):
    """Valores acumulados por conta de interesse. A primeira ocorrência de cada conta é a da despesa exceto intraorçamentária."""
    out = {nome: {} for nome in COLUNAS}
    for x in itens:
        chave = CONTAS.get(x["conta"])
        if not chave:
            continue
        for nome, coluna in COLUNAS.items():
            if x["coluna"] == coluna:
                out[nome].setdefault(chave, x["valor"])
    return out


def main():
    hoje = date.today()
    saida = {"fonte": "Siconfi, RREO Anexo 01 (Balanço Orçamentário), Espírito Santo; despesas exceto intraorçamentárias, acumuladas no ano", "anos": {}}
    for ano in range(PRIMEIRO_ANO, hoje.year):
        saida["anos"][str(ano)] = {}
        for per in (4, 6):
            itens = baixar(ano, per)
            if not itens:
                raise SystemExit(f"{ano}: bimestre {per} sem dados")
            saida["anos"][str(ano)][str(per)] = acumulado(itens)
        print(f"{ano}: ok")
    for per in range(6, 0, -1):
        itens = baixar(hoje.year, per)
        if itens:
            saida["anos"][str(hoje.year)] = {str(per): acumulado(itens)}
            print(f"{hoje.year}: bimestre {per}")
            break
    saida["coletado_em"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"gravado {SAIDA} ({SAIDA.stat().st_size / 1e3:.0f} kB)")


if __name__ == "__main__":
    main()
