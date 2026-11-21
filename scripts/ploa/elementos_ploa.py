#!/usr/bin/env python3
"""
Extrai o "Detalhamento das Dotações por Elemento de Despesa" da PLOA 2027 do Espírito Santo (PL 525/2026, Assembleia Legislativa) e grava
data/ploa2027-elementos.json.

Fonte: PDF de 124 páginas com camada de texto (iText), publicado pela Assembleia com a proposta (arquivo 496278-20260929111842029_11c826f9.pdf;
SHA-256 36403a0aceb5064494c03dc68b5c233a6ca9b1cf7765cc24b9ee40853519a668), guardado em painel-es/fontes/ploa. É a proposta enviada em
29/09/2026 (dados de 25/09/2026), não a LOA aprovada.

Cada lançamento é um programa de trabalho (unidade, função, subfunção, programa, ação) com natureza da despesa de seis dígitos (categoria,
GND, modalidade e elemento), fonte de recursos e valor. Nenhum valor é recalculado.

Conferências (o script falha se alguma não fechar):
  1. a soma de todos os lançamentos é igual ao total da PLOA em data/ploa2027.json (R$ 35.426.564.064);
  2. a soma de cada uma das 108 unidades é igual ao total da unidade impresso no próprio PDF.
Informativo (não falha): a comparação chave a chave, por (unidade, programa, ação, GND, fonte), com data/ploa2027.json, que foi lida por OCR de outro
documento da mesma proposta. As poucas chaves que divergem são erros de código de ação ou de fonte daquela leitura (o PDF com camada de texto é a referência).

Requer pdftotext (poppler-utils). Uso:
    python3 scripts/ploa/elementos_ploa.py caminho/do/arquivo.pdf
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent.parent
SAIDA = RAIZ / "data" / "ploa2027-elementos.json"
BASE = RAIZ / "data" / "ploa2027.json"
SHA = "36403a0aceb5064494c03dc68b5c233a6ca9b1cf7765cc24b9ee40853519a668"

NUM = r"[\d.]+"
UNIDADE = re.compile(r"^\s*(\d{5}) - ")
# programa de trabalho: UUUUU.FFSSSPPPP.AAAA (o código da unidade vem com ponto: 01.101 = 01101)
PROGRAMA = re.compile(rf"^\s*(\d{{2}})\.(\d{{3}})\.(\d{{2}})(\d{{3}})(\d{{4}})\.(\d{{4}}) - .*?\s([FSI])\s{{2,}}(\d{{6}})\s+(\d{{3}})\s+({NUM})\s*$")
PROGRAMA_SEM_VALOR = re.compile(r"^\s*(\d{2})\.(\d{3})\.(\d{2})(\d{3})(\d{4})\.(\d{4}) - ")
NATUREZA = re.compile(rf"^\s{{20,}}(\d{{6}})\s+(\d{{3}})\s+({NUM})\s*$")
SO_FONTE = re.compile(rf"^\s{{20,}}(\d{{3}})\s{{2,}}({NUM})\s*$")
ESFERA_NAT = re.compile(rf"\s([FSI])\s{{2,}}(\d{{6}})\s+(\d{{3}})\s+({NUM})\s*$")


def reais(txt):
    return int(txt.replace(".", ""))


def texto(pdf):
    return subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout


def extrai(txt):
    linhas = []
    atual = None  # (uo, funcao, sub, programa, acao, esfera, natureza)
    natureza = None
    for l in txt.splitlines():
        if not l.strip() or "PÁGINA" in l or "E-DOCS" in l or re.search(r"\d{2}/\d{2}/\d{4} \d{2}:\d{2}", l) or "TOTAL" in l:
            continue
        m = PROGRAMA.match(l)
        if m:
            uo = m.group(1) + m.group(2)
            atual = (uo, m.group(3), m.group(4), m.group(5), m.group(6), m.group(7))
            natureza = m.group(8)
            linhas.append(atual + (natureza, m.group(9), reais(m.group(10))))
            continue
        m = PROGRAMA_SEM_VALOR.match(l)
        if m:
            # nome longo do programa de trabalho: os valores vêm na linha seguinte
            atual = (m.group(1) + m.group(2), m.group(3), m.group(4), m.group(5), m.group(6), None)
            natureza = None
            continue
        m = NATUREZA.match(l)
        if m and atual:
            natureza = m.group(1)
            linhas.append(atual + (natureza, m.group(2), reais(m.group(3))))
            continue
        m = SO_FONTE.match(l)
        if m and atual and natureza:
            linhas.append(atual + (natureza, m.group(1), reais(m.group(2))))
            continue
        m = ESFERA_NAT.search(l)
        if m and atual and atual[5] is None:
            atual = atual[:5] + (m.group(1),)
            natureza = m.group(2)
            linhas.append(atual + (natureza, m.group(3), reais(m.group(4))))
    return linhas


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pdf = Path(sys.argv[1])
    txt = texto(pdf)
    linhas = extrai(txt)
    total = sum(x[-1] for x in linhas)
    base = json.loads(BASE.read_text(encoding="utf-8"))
    esperado = base["conferencia"]["total_linhas"]
    if total != esperado:
        sys.exit(f"total {total} difere do total da PLOA {esperado} (diferença {total - esperado})")
    # conferência 2: soma por unidade contra o total impresso do próprio PDF (as 108 unidades)
    impresso = {}
    for l in txt.splitlines():
        m = re.match(rf"^\s*(\d{{5}}) - .*?\s{{2,}}({NUM})\s*$", l)
        if m:
            impresso[m.group(1)] = reais(m.group(2))
    por_uo = defaultdict(int)
    for x in linhas:
        por_uo[x[0]] += x[-1]
    erros = [(u, v, por_uo.get(u, 0)) for u, v in impresso.items() if v != por_uo.get(u, 0)]
    if erros or len(impresso) != 108:
        sys.exit(f"{len(erros)} unidades divergem do total impresso (de {len(impresso)}): {erros[:5]}")
    # informativo: contra a base por GND de data/ploa2027.json (lida por OCR do outro documento), chave por chave
    ic = {c: i for i, c in enumerate(base["colunas"])}
    ref = defaultdict(int)
    for r in base["linhas"]:
        ref[(str(r[ic["uo"]]), str(r[ic["programa"]]), str(r[ic["acao"]]), str(r[ic["gnd"]]), str(r[ic["fonte"]]))] += int(r[ic["valor"]])
    got = defaultdict(int)
    for uo, _f, _s, prog, acao, _e, nat, fonte, v in linhas:
        got[(uo, prog, acao, nat[1], fonte)] += v
    difs = sorted((k, got.get(k, 0), ref.get(k, 0)) for k in set(got) | set(ref) if got.get(k, 0) != ref.get(k, 0))
    for k, a, b in difs:
        print("base antiga diverge", k, "PDF", a, "base", b, file=sys.stderr)
    SAIDA.write_text(json.dumps({
        "fonte": "Assembleia Legislativa do ES, PL 525/2026: Detalhamento das Dotações por Elemento de Despesa, PLOA 2027 (124 páginas; dados de 25/09/2026), proposta e não a LOA",
        "sha256": SHA,
        "extraido_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "conferencia": {"lancamentos": len(linhas), "total": total, "unidades_conferidas": len(impresso), "chaves_base_ocr_divergentes": len(difs)},
        "colunas": ["uo", "funcao", "subfuncao", "programa", "acao", "esfera", "natureza", "fonte", "valor"],
        "linhas": [list(x) for x in linhas],
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(linhas)} lançamentos, total {total}, {len(impresso)} unidades conferidas; {SAIDA.relative_to(RAIZ)} ({SAIDA.stat().st_size / 1e3:.0f} kB)", file=sys.stderr)


if __name__ == "__main__":
    main()
