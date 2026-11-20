#!/usr/bin/env python3
"""
Atualiza data/petroleo-mercado.json: as três premissas físicas e de mercado que movem a receita de petróleo do Estado, no realizado,
mês a mês, para comparar com as premissas da LDO (Brent, câmbio e produção de petróleo do Espírito Santo).

Fontes (todas públicas):
  Brent (US$/barril, média do mês dos preços diários FOB): Ipeadata, série EIA366_PBRENT366 (origem: U.S. EIA).
  Câmbio (R$/US$, média do mês da PTAX de venda): Banco Central do Brasil, SGS série 1.
  Produção de petróleo do ES (mil barris/dia, terra e mar): ANP, dados abertos, produção de petróleo por UF (m³/mês, convertido a
  6,28981 barris por m³ e dividido pelos dias do mês).

Uso:
    python3 scripts/atualizar_petroleo_mercado.py
"""
import calendar
import collections
import csv
import io
import json
import sys
import time
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "petroleo-mercado.json"
PRIMEIRO = "2019-01"
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-petroleo-mercado/1.0)"}
BBL_POR_M3 = 6.28981
MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
URL_BRENT = "http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='EIA366_PBRENT366')"
URL_PTAX = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=01/01/2019&dataFinal={fim}"
URL_ANP = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/ppgn-el/producao-petroleo-m3.csv"


def baixar(url, tentativas=4):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)
            time.sleep(2 * (i + 1))


def media_mensal(pares):
    agrupa = collections.defaultdict(list)
    for chave, v in pares:
        if chave >= PRIMEIRO:
            agrupa[chave].append(v)
    return {k: round(sum(v) / len(v), 3) for k, v in sorted(agrupa.items())}


def brent():
    dados = json.loads(baixar(URL_BRENT))["value"]
    return media_mensal((x["VALDATA"][:7], float(x["VALVALOR"])) for x in dados if x["VALVALOR"] is not None)


def cambio():
    fim = date.today().strftime("%d/%m/%Y")
    dados = json.loads(baixar(URL_PTAX.format(fim=fim)))
    pares = []
    for x in dados:
        d, m, a = x["data"].split("/")
        pares.append((f"{a}-{m}", float(x["valor"])))
    return media_mensal(pares)


def producao():
    texto = baixar(URL_ANP).decode("utf-8-sig")
    total = collections.defaultdict(float)
    for r in csv.DictReader(io.StringIO(texto), delimiter=";"):
        if r["UNIDADE DA FEDERAÇÃO"] != "ESPÍRITO SANTO":
            continue
        ano, mes = int(r["ANO"]), MESES.index(r["MÊS"]) + 1
        chave = f"{ano}-{mes:02d}"
        if chave >= PRIMEIRO:
            total[chave] += float(r["PRODUÇÃO"].replace(".", "").replace(",", "."))
    saida = {}
    for chave, m3 in sorted(total.items()):
        if m3 <= 0:  # meses futuros vêm zerados no arquivo
            continue
        ano, mes = int(chave[:4]), int(chave[5:])
        saida[chave] = round(m3 * BBL_POR_M3 / calendar.monthrange(ano, mes)[1] / 1000, 1)
    return saida


def main():
    b, c, p = brent(), cambio(), producao()
    if not (b and c and p):
        sys.exit("alguma das séries veio vazia")
    SAIDA.write_text(json.dumps({
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fontes": {
            "brent": "Ipeadata (EIA366_PBRENT366, origem U.S. EIA): média mensal do preço diário FOB, US$/barril",
            "cambio": "Banco Central do Brasil, SGS 1: média mensal da PTAX de venda, R$/US$",
            "producao": "ANP, dados abertos: produção de petróleo do Espírito Santo (terra e mar), mil barris por dia",
        },
        "brent": b, "cambio": c, "producao": p,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)}: brent até {max(b)}, câmbio até {max(c)}, produção até {max(p)}", file=sys.stderr)


if __name__ == "__main__":
    main()
