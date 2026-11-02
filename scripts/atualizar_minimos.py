#!/usr/bin/env python3
"""
Atualiza os mínimos constitucionais de aplicação em educação e em saúde (data/minimos.json).

Os demonstrativos de Manutenção e Desenvolvimento do Ensino (Anexo 8 do RREO) e de Ações e Serviços Públicos de Saúde
(Anexo 12) não constam da API de dados abertos do Siconfi para o Espírito Santo. O percentual apurado, porém, está nos
próprios RREO do 6º bimestre que a SEFAZ publica (listados em data/acervo.json). O script baixa esses PDFs, extrai o
texto com `pdftotext` (pacote poppler-utils) e lê duas linhas do demonstrativo:

  * "Mínimo Anual de 25% das Receitas de Impostos na Manutenção e Desenvolvimento do Ensino": percentual aplicado;
  * "Percentual ... aplicado em ações e serviços públicos de saúde": percentual aplicado (mínimo de 12%).

Nada é calculado: apenas se transcreve o percentual informado no relatório. Anos já gravados são mantidos; os dois
últimos são sempre relidos. Se um PDF não puder ser lido, o ano é omitido e o script avisa.

Uso:
    python3 scripts/atualizar_minimos.py [--tudo]
"""
import csv
import json
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ACERVO = RAIZ / "data" / "acervo.json"
SAIDA = RAIZ / "data" / "minimos.json"
CSV_SAIDA = RAIZ / "public" / "dados" / "minimos-es.csv"
ANO_INICIAL = 2019
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-indicadores/1.0)"}

NUM = r"(\d{1,2},\d{2})"


def baixar(url, tentativas=4):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                return r.read()
        except Exception:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(3 * (i + 1))


def texto_do_pdf(conteudo):
    with tempfile.TemporaryDirectory() as tmp:
        pdf = Path(tmp) / "rreo.pdf"
        pdf.write_bytes(conteudo)
        saida = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, check=True)
    return saida.stdout.decode("utf-8", errors="ignore")


def ensino(texto):
    m = re.search(r"Manuten[çc][ãa]o e Desenvolvimento do Ensino[^\n]*?[\d.]+,\d+\s+25\s*%\s+" + NUM + r"\s*%", texto)
    return float(m.group(1).replace(",", ".")) if m else None


def saude(texto):
    linhas = texto.splitlines()
    for i, l in enumerate(linhas):
        if not re.search(r"PERCENTUAL (DE APLICA|DA RECEITA DE IMPOSTOS)", l, re.I):
            continue
        if not re.search(r"ASPS|SERVI[ÇC]OS P[ÚU]BLICOS", l, re.I):
            continue
        # o número fica no fim da própria linha ou numa das linhas seguintes
        for cand in [l] + linhas[i + 1 : i + 4]:
            m = re.search(NUM + r"\s*%?\s*$", cand)
            if m:
                return float(m.group(1).replace(",", "."))
    return None


def main():
    tudo = "--tudo" in sys.argv
    itens = json.loads(ACERVO.read_text(encoding="utf-8"))["itens"]
    por_ano = {i["ano"]: i for i in itens if i.get("tipo") == "rreo" and i.get("periodo") == "6º bimestre" and ANO_INICIAL <= i["ano"]}
    atual = {}
    if SAIDA.exists():
        atual = {r["ano"]: r for r in json.loads(SAIDA.read_text(encoding="utf-8")).get("serie", [])}
    recentes = sorted(por_ano)[-2:]
    serie = []
    for ano in sorted(por_ano):
        if ano in atual and not tudo and ano not in recentes:
            serie.append(atual[ano])
            continue
        item = por_ano[ano]
        try:
            texto = texto_do_pdf(baixar(item["url"]))
        except Exception as e:  # noqa: BLE001
            print(f"Aviso: {ano} não pôde ser lido ({e})", file=sys.stderr)
            if ano in atual:
                serie.append(atual[ano])
            continue
        e, s = ensino(texto), saude(texto)
        if e is None or s is None:
            print(f"Aviso: {ano} sem {'ensino' if e is None else ''}{' e ' if e is None and s is None else ''}{'saúde' if s is None else ''}", file=sys.stderr)
        serie.append({"ano": ano, "ensino": e, "saude": s, "fonte": item["url"]})
    if len(serie) < 4:
        sys.exit("Poucos exercícios lidos; os dados atuais foram mantidos.")
    SAIDA.write_text(json.dumps({
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": "RREO do 6º bimestre publicado pela SEFAZ-ES (percentuais apurados nos demonstrativos de ensino e de saúde)",
        "serie": serie,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CSV_SAIDA.parent.mkdir(parents=True, exist_ok=True)
    with CSV_SAIDA.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["ano", "ensino_pct_aplicado_minimo_25", "saude_pct_aplicado_minimo_12"])
        for r in serie:
            w.writerow([r["ano"], r["ensino"], r["saude"]])
    print(f"{len(serie)} exercícios gravados em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
