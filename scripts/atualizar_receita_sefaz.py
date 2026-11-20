#!/usr/bin/env python3
"""
Atualiza data/receita-sefaz.json: receita realizada bruta, acumulada no ano, por natureza (de 2 a 8 dígitos: espécie, alínea e rubrica), mês a mês desde 2023, a partir do
"Demonstrativo mensal da realização da receita orçamentária" publicado pela SEFAZ-ES.

Para que serve: o Portal de Dados Abertos só tem a receita mês a mês de 2025 em diante, o que deixa IPVA, IRRF, ITCD e as demais linhas
com uma única sazonalidade para projetar o fechamento do ano. Os demonstrativos remontam a 2023 e dão três anos fechados de história.

Fonte: https://sefaz.es.gov.br/receita-realizada-mensal-2 (PDFs mensais). Guardamos só o "realizado acumulado no ano" de cada linha, sem
recalcular nada. Linhas partidas em duas no PDF (nome longo) são recompostas.

Conferência: o acumulado do ICMS (111450) de cada mês de 2025 e 2026 coincide, em até 0,5%, com a soma mensal da receita bruta de ICMS em
data/receita.json (Portal).

Requer o utilitário pdftotext (poppler-utils). Uso:
    python3 scripts/atualizar_receita_sefaz.py
"""
import json
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "receita-sefaz.json"
BASE = "https://sefaz.es.gov.br"
PAGINA = BASE + "/receita-realizada-mensal-2"
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-receita-sefaz/1.0)"}
PRIMEIRO_ANO = 2023
NUM = r"-?[\d.]+,\d\d"
CODIGO = re.compile(r"^\s*(\d{2,8}) - ")
QUATRO = re.compile(rf"({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s*$")


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


def links_mensais():
    html = baixar(PAGINA).decode("utf-8", "replace")
    achados = {}
    for href in re.findall(r'href="([^"]*\.pdf[^"]*)"', html):
        dec = urllib.parse.unquote(href)
        if "emonst" not in dec:
            continue
        m = re.search(r"(?<!\d)(\d{2})-(20\d{2})(?!\d)", dec)
        if not m:
            continue
        mes, ano = int(m.group(1)), int(m.group(2))
        if ano >= PRIMEIRO_ANO and 1 <= mes <= 12:
            achados.setdefault((ano, mes), href if href.startswith("http") else BASE + href)
    return dict(sorted(achados.items()))


def numero(txt):
    return float(txt.replace(".", "").replace(",", "."))


def ler_pdf(conteudo):
    with tempfile.TemporaryDirectory() as tmp:
        pdf = Path(tmp) / "m.pdf"
        pdf.write_bytes(conteudo)
        texto = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
    saida, pendente = {}, None
    for linha in texto.splitlines():
        m = CODIGO.match(linha)
        if m:
            nums = QUATRO.search(linha)
            if nums:
                saida[m.group(1)] = numero(nums.group(3))
                pendente = None
            else:
                pendente = m.group(1)  # nome longo: os números vêm na linha seguinte
            continue
        if pendente:
            nums = QUATRO.search(linha)
            if nums:
                saida[pendente] = numero(nums.group(3))
                pendente = None
            elif linha.strip() and not re.match(r"^\s*[A-Za-zÀ-ú]", linha):
                pendente = None
    return saida


def main():
    links = links_mensais()
    if not links:
        sys.exit("nenhum demonstrativo mensal encontrado na página da SEFAZ")
    meses = {}
    for (ano, mes), url in links.items():
        print(f"{mes:02d}/{ano}", file=sys.stderr)
        dados = ler_pdf(baixar(url))
        if "111450" not in dados:
            sys.exit(f"{mes:02d}/{ano}: ICMS (111450) não encontrado no PDF")
        meses[f"{ano}-{mes:02d}"] = dados

    # conferência do ICMS contra o Portal
    portal = json.loads((RAIZ / "data" / "receita.json").read_text(encoding="utf-8"))
    avisos = []
    for chave, d in meses.items():
        ano, mes = int(chave[:4]), int(chave[5:])
        linhas = portal["anos"].get(str(ano), {}).get("linhas", [])
        ate = sum(l[3] for l in linhas if l[1] == "111450" and l[0] <= mes)
        if ate and abs(d["111450"] / ate - 1) > 0.005:
            avisos.append(f"{chave}: ICMS SEFAZ {d['111450'] / 1e6:.1f} mi x Portal {ate / 1e6:.1f} mi")
    for a in avisos:
        print("AVISO conferência:", a, file=sys.stderr)

    SAIDA.write_text(json.dumps({
        "fonte": "SEFAZ-ES, Demonstrativo mensal da realização da receita orçamentária; receita bruta realizada acumulada no ano, em reais, por natureza",
        "pagina": PAGINA,
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "meses": meses,
        "conferencia": avisos,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)}: {len(meses)} meses, {SAIDA.stat().st_size / 1e3:.0f} kB", file=sys.stderr)


if __name__ == "__main__":
    main()
