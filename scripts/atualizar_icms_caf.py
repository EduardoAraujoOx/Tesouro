#!/usr/bin/env python3
"""
Atualiza data/icms-caf.json: arrecadação de ICMS por segmento econômico (Código de Atividade Fiscal, CAF) do Espírito Santo, a partir
do relatório "Receita em Foco" da SEFAZ-ES: quadro anual (2023 a 2025) e quadro do 1º trimestre (2024 a 2026).

Fonte: https://sefaz.es.gov.br/receita-em-foco (PDFs trimestrais). O quadro CAF do relatório anual de 2025 soma R$ 22,78 bi, contra
R$ 22,62 bi do ICMS no RREO/Portal: a diferença (0,7%) vem de o relatório usar a arrecadação por CAF, antes de ajustes contábeis.

Os PDFs são grandes (15 a 30 MB) e saem poucas vezes por ano; por isso este coletor não está na rotina semanal. Rode quando a SEFAZ
publicar uma nova edição, acrescentando a URL em EDICOES:
    python3 scripts/atualizar_icms_caf.py

Requer o utilitário pdftotext (poppler-utils).
"""
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
import zipfile
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "icms-caf.json"
BASE = "https://sefaz.es.gov.br/media/Receita%20Estadual/"
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-icms-caf/1.0)"}
# (tipo, url): "anual" traz 3 anos fechados; "1T" traz o 1º trimestre de 3 anos seguidos
EDICOES = [
    ("anual", BASE + "Receita%20em%20foco%20%284%29.pdf?v=1772538587000"),
    ("1T", BASE + "ReceitaemFoco/receita-em-foco-3-2026.pdf?v=1783529880000"),
]
# planilhas mensais por CAF (arrecadação de ICMS por mês e segmento), de 2019 a 2024
PLANILHAS = {
    2019: "ReceitaemFoco/2019_Arrecada%C3%A7%C3%A3o%20por%20CAF.xlsx",
    2020: "ReceitaemFoco/2020_Arrecada%C3%A7%C3%A3o%20por%20CAF.xlsx",
    2021: "ReceitaemFoco/2021_Arrecada%C3%A7%C3%A3o%20por%20CAF.xlsx",
    2022: "ReceitaemFoco/2022_Arrecada%C3%A7%C3%A3o%20por%20CAF.xlsx",
    2023: "ReceitaemFoco/2023_Arrecada%C3%A7%C3%A3o%20por%20CAF.xlsx",
    2024: "ReceitaemFoco/Arrecada%C3%A7%C3%A3o%20por%20CAF%20-%202024.xlsx",
}
NUM = r"-?\d{1,3}(?:\.\d{3})*(?:,\d+)?"
LINHA = re.compile(rf"^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .()/-]*?)\s{{2,}}({NUM})\s+({NUM})\s+({NUM})\s+")


def normaliza(nome):
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s.replace("substituicao", "substituicao")


def desescapa(txt):
    """Os textos das planilhas trazem caracteres escapados como _x0032_ (o "2")."""
    return re.sub(r"_x([0-9A-Fa-f]{4})_", lambda m: chr(int(m.group(1), 16)), txt)


def planilha_mensal(conteudo):
    """Lê a primeira planilha (DATA, COD_CAF, DSC_CAF, RECEITA) só com a biblioteca padrão: {mês: {segmento: reais}}."""
    z = zipfile.ZipFile(BytesIO(conteudo))
    textos = [desescapa(re.sub(r"<[^>]+>", "", si)) for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), re.S)]
    folha = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    saida = {}
    for linha in re.findall(r"<row[^>]*>(.*?)</row>", folha, re.S)[1:]:
        cel = {}
        for ref, attrs, corpo in re.findall(r'<c r="([A-Z]+)\d+"([^>]*)>(.*?)</c>', linha, re.S):
            v = re.search(r"<v>(.*?)</v>", corpo)
            if not v:
                continue
            cel[ref] = textos[int(v.group(1))] if 't="s"' in attrs else v.group(1)
        if not {"A", "C", "D"} <= cel.keys():
            continue
        mes = cel["A"].replace("/", "-")
        if not re.fullmatch(r"\d{4}-\d{2}", mes):
            continue  # linha sem data (rótulo solto na planilha)
        seg = normaliza(cel["C"])
        saida.setdefault(mes, {})
        saida[mes][seg] = saida[mes].get(seg, 0.0) + float(cel["D"])
    return saida


def numero(txt):
    return float(txt.replace(".", "").replace(",", "."))


def baixar(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return r.read()


def quadro_caf(conteudo):
    with tempfile.TemporaryDirectory() as tmp:
        pdf = Path(tmp) / "r.pdf"
        pdf.write_bytes(conteudo)
        texto = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
    linhas = texto.splitlines()
    inicio = next((i for i, l in enumerate(linhas) if re.match(r"^\s*com[eé]rcio atacadista\s{2,}", l, re.I) and LINHA.match(l)), None)
    if inicio is None:
        raise SystemExit("quadro CAF não encontrado no PDF")
    anos = None
    for j in range(inicio, max(inicio - 12, 0), -1):
        m = re.search(r"(20\d\d)\s+(20\d\d)\s+(20\d\d)", linhas[j])
        if m:
            anos = [int(x) for x in m.groups()]
            break
    if not anos:
        raise SystemExit("anos do quadro CAF não encontrados")
    saida = {a: {} for a in anos}
    for l in linhas[inicio:]:
        if re.match(r"^\s*total geral", l, re.I):
            break
        m = LINHA.match(l)
        if not m:
            continue
        nome = normaliza(m.group(1))
        for a, v in zip(anos, m.groups()[1:4]):
            saida[a][nome] = numero(v)
    return saida


def main():
    saida = {"anual": {}, "primeiro_trimestre": {}}
    for tipo, url in EDICOES:
        print(f"{tipo}: {url.split('/')[-1][:50]}", file=sys.stderr)
        q = quadro_caf(baixar(url))
        destino = saida["anual"] if tipo == "anual" else saida["primeiro_trimestre"]
        for a, d in q.items():
            destino[str(a)] = d
    mensal = {}
    for ano, caminho in PLANILHAS.items():
        print(f"planilha {ano}", file=sys.stderr)
        mensal.update(planilha_mensal(baixar(BASE + caminho)))
    saida["mensal"] = dict(sorted(mensal.items()))
    SAIDA.write_text(json.dumps({
        "fonte": "SEFAZ-ES, Receita em Foco: ICMS por Código de Atividade Fiscal (CAF), em reais. Anual: 2023 a 2025; 1º trimestre: 2024 a 2026; mensal (planilhas): 2019 a 2024",
        "pagina": "https://sefaz.es.gov.br/receita-em-foco",
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **saida,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)}", file=sys.stderr)


if __name__ == "__main__":
    main()
