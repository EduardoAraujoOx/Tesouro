#!/usr/bin/env python3
"""
Atualiza data/pib-receita.json: PIB nominal e crescimento real do Brasil (Banco Central, SGS) e receita do Espírito Santo (Siconfi, RREO
Anexo 01, 6º bimestre) por ano, para medir como a arrecadação estadual acompanha a economia e dar uma faixa de plausibilidade à referência de 2027.

Fontes:
  PIB a preços correntes, anual (R$): Banco Central do Brasil, SGS série 1207.
  PIB, variação real anual (%): Banco Central do Brasil, SGS série 7326.
  Impostos e receita (exceto intraorçamentárias) do ES: Siconfi, RREO Anexo 01, "Até o Bimestre (c)" do 6º bimestre (acumulado do ano).

Uso:
    python3 scripts/atualizar_pib.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "pib-receita.json"
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-pib/1.0)"}
ENTE = 32
PRIMEIRO_ANO = 2015
RREO = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo"
CONTAS = {"Impostos": "impostos", "RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)": "receita"}


def baixar(url, tentativas=4):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)
            time.sleep(3 * (i + 1))


def sgs(serie):
    dados = baixar(f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados?formato=json&dataInicial=01/01/{PRIMEIRO_ANO - 1}")
    return {int(x["data"][-4:]): float(x["valor"]) for x in dados}


def main():
    pib, real = sgs(1207), sgs(7326)
    impostos, receita = {}, {}
    for ano in range(PRIMEIRO_ANO, date.today().year):
        q = urllib.parse.urlencode({"an_exercicio": ano, "nr_periodo": 6, "co_tipo_demonstrativo": "RREO", "no_anexo": "RREO-Anexo 01", "id_ente": ENTE})
        itens = baixar(f"{RREO}?{q}").get("items", [])
        achou = {}
        for x in itens:
            if x["coluna"] == "Até o Bimestre (c)" and x["conta"] in CONTAS:
                achou.setdefault(CONTAS[x["conta"]], x["valor"])
        if len(achou) == 2:
            impostos[ano], receita[ano] = achou["impostos"], achou["receita"]
            print(f"{ano}: ok", file=sys.stderr)
    if not impostos or not pib:
        sys.exit("séries vazias")
    SAIDA.write_text(json.dumps({
        "fonte": "PIB: Banco Central do Brasil, SGS 1207 (valores correntes) e 7326 (variação real); receita do ES: Siconfi, RREO Anexo 01, 6º bimestre",
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pib_nominal": {str(a): v for a, v in pib.items()}, "pib_real": {str(a): v for a, v in real.items()},
        "impostos": {str(a): v for a, v in impostos.items()}, "receita": {str(a): v for a, v in receita.items()},
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"gravado {SAIDA.relative_to(RAIZ)}", file=sys.stderr)


if __name__ == "__main__":
    main()
