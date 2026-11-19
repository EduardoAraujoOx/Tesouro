#!/usr/bin/env python3
"""
Atualiza data/ritmo-receita.json: receita realizada acumulada do Estado, por linha do Balanço Orçamentário (RREO, Anexo 01), até o
5º e o 6º bimestres de cada ano fechado e até o bimestre mais recente do ano corrente.

Para que serve: medir a sazonalidade da arrecadação (que fração do ano já está arrecadada em outubro, por tipo de receita) e o ritmo
de cada ano até o mesmo ponto, para projetar o fechamento do ano corrente e compará-lo com a proposta orçamentária. Não usa previsão
nem orçamento de anos anteriores, só o realizado.

Fonte: Siconfi, API de dados abertos do Tesouro Nacional (RREO, Anexo 01, ente 32 = Espírito Santo). Os valores são os "Até o Bimestre (c)",
já líquidos das deduções (transferências constitucionais aos municípios e Fundeb), como no demonstrativo. Nenhum número é recalculado.

Conferência: o acumulado do ano corrente no RREO precisa coincidir com a soma mensal líquida de data/receita.json (Portal de Dados Abertos).

Uso:
    python3 scripts/atualizar_ritmo.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "ritmo-receita.json"
URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo"
ENTE = 32
PRIMEIRO_ANO = 2019
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-ritmo/1.0)"}
CONTAS = [
    "Impostos", "Taxas", "CONTRIBUIÇÕES", "RECEITA PATRIMONIAL", "RECEITA AGROPECUÁRIA", "RECEITA INDUSTRIAL", "RECEITA DE SERVIÇOS",
    "TRANSFERÊNCIAS CORRENTES", "OUTRAS RECEITAS CORRENTES", "OPERAÇÕES DE CRÉDITO", "ALIENAÇÃO DE BENS", "AMORTIZAÇÕES DE EMPRÉSTIMOS",
    "TRANSFERÊNCIAS DE CAPITAL", "OUTRAS RECEITAS DE CAPITAL", "RECEITAS (INTRA-ORÇAMENTÁRIAS) (II)", "SUBTOTAL DAS RECEITAS (III) = (I + II)",
]


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
    """Valores 'Até o Bimestre (c)' das linhas de interesse. Contas repetidas (receita intraorçamentária) ficam com a linha-resumo."""
    out = {}
    for x in itens:
        if x["coluna"] != "Até o Bimestre (c)" or x["conta"] not in CONTAS:
            continue
        # "Contribuições" e "Receita de serviços" aparecem de novo sob a receita intraorçamentária: a primeira ocorrência é a da receita exceto intra
        out.setdefault(x["conta"], x["valor"])
    return out


def main():
    hoje = date.today()
    saida = {"fonte": "Siconfi, RREO Anexo 01 (Balanço Orçamentário), Espírito Santo; valores acumulados no ano, líquidos das deduções", "anos": {}}
    for ano in range(PRIMEIRO_ANO, hoje.year):
        saida["anos"][str(ano)] = {}
        for per in (5, 6):
            itens = baixar(ano, per)
            if not itens:
                raise SystemExit(f"{ano}: bimestre {per} sem dados")
            saida["anos"][str(ano)][str(per)] = acumulado(itens)
        print(f"{ano}: ok")
    # ano corrente: bimestre mais recente publicado
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
