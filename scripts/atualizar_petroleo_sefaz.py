#!/usr/bin/env python3
"""
Atualiza data/petroleo-sefaz.json: receita de petróleo do Estado aberta por natureza (royalties, excedente da produção, participação
especial e FEP), mês a mês, a partir do "Demonstrativo mensal da realização da receita orçamentária" publicado pela SEFAZ-ES.

Para que serve: o Portal de Dados Abertos traz o petróleo numa alínea só (171252). A participação especial é volátil (paga por trimestre,
muito sensível a preço, câmbio e produção), e os royalties são mais estáveis. Separar os dois muda a leitura do que é recorrente.

Fonte: https://sefaz.es.gov.br/receita-realizada-mensal-2 (PDFs mensais, de 2025 em diante). Para cada mês pegamos, de cada natureza, a
previsão atualizada, o realizado no mês e o acumulado no ano, sem recalcular nada. Só as linhas "Principal" (multas e juros ficam de fora).

Conferência: a soma das quatro naturezas principais, acumulada no ano, precisa ficar até 5% abaixo do total da alínea 171252 em
data/receita.json (a diferença são multas e juros de mora).

Requer o utilitário pdftotext (poppler-utils). Uso:
    python3 scripts/atualizar_petroleo_sefaz.py
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
SAIDA = RAIZ / "data" / "petroleo-sefaz.json"
BASE = "https://sefaz.es.gov.br"
PAGINA = BASE + "/receita-realizada-mensal-2"
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-petroleo/1.0)"}
PRIMEIRO_ANO = 2025
NATUREZAS = {
    "17125211": "Royalties (Lei 7.990/89)",
    "17125221": "Excedente da produção (Lei 9.478/97, art. 49)",
    "17125231": "Participação especial (Lei 9.478/97, art. 50)",
    "17125241": "Fundo Especial do Petróleo (FEP)",
}
NUM = r"-?[\d.]+,\d\d"
LINHA = re.compile(rf"^\s*(\d{{8}}) - .*?\s{{2,}}({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s*$")


def baixar(url, tentativas=4):
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
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
        m = re.search(r"(?:Rec[_ ]|rec_)(\d{2})-(\d{4})", dec)
        if not m or "Demonst" not in dec and "demonst" not in dec:
            continue
        mes, ano = int(m.group(1)), int(m.group(2))
        if ano >= PRIMEIRO_ANO:
            achados[(ano, mes)] = href if href.startswith("http") else BASE + href
    return dict(sorted(achados.items()))


def numero(txt):
    return float(txt.replace(".", "").replace(",", "."))


def ler_pdf(conteudo):
    with tempfile.TemporaryDirectory() as tmp:
        pdf = Path(tmp) / "m.pdf"
        pdf.write_bytes(conteudo)
        texto = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
    saida = {}
    for linha in texto.splitlines():
        m = LINHA.match(linha)
        if m and m.group(1) in NATUREZAS:
            prev, mes, acum, _saldo = (numero(x) for x in m.groups()[1:])
            saida[m.group(1)] = {"prevista": prev, "mes": mes, "acumulado": acum}
    return saida


def main():
    links = links_mensais()
    if not links:
        sys.exit("nenhum demonstrativo mensal encontrado na página da SEFAZ")
    meses = []
    for (ano, mes), url in links.items():
        print(f"{mes:02d}/{ano}", file=sys.stderr)
        dados = ler_pdf(baixar(url))
        faltam = [c for c in NATUREZAS if c not in dados]
        if faltam:
            sys.exit(f"{mes:02d}/{ano}: natureza(s) não encontrada(s) no PDF: {faltam}")
        meses.append({"ano": ano, "mes": mes, "url": url, "naturezas": dados})

    # conferência contra o Portal (alínea 171252, receita bruta acumulada no mesmo mês)
    portal = json.loads((RAIZ / "data" / "receita.json").read_text(encoding="utf-8"))
    avisos = []
    for m in meses:
        linhas = portal["anos"].get(str(m["ano"]), {}).get("linhas", [])
        ate = sum(l[3] for l in linhas if l[1] == "171252" and l[0] <= m["mes"])
        princ = sum(v["acumulado"] for v in m["naturezas"].values())
        if ate and not (0.0 <= (ate - princ) / ate <= 0.05):
            avisos.append(f"{m['mes']:02d}/{m['ano']}: principais {princ / 1e6:.1f} mi x alínea 171252 {ate / 1e6:.1f} mi")
    for a in avisos:
        print("AVISO conferência:", a, file=sys.stderr)

    SAIDA.write_text(json.dumps({
        "fonte": "SEFAZ-ES, Demonstrativo mensal da realização da receita orçamentária (valores em reais; naturezas 'Principal')",
        "pagina": PAGINA,
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "naturezas": NATUREZAS,
        "meses": [{k: v for k, v in m.items() if k != "url"} for m in meses],
        "conferencia": avisos,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)}: {len(meses)} meses", file=sys.stderr)


if __name__ == "__main__":
    main()
