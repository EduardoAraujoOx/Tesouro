#!/usr/bin/env python3
"""
Corrige data/ploa2027.json (lido por OCR do Programa de Trabalho da Mensagem nº 189/2026) com o detalhamento por elemento (data/ploa2027-elementos.json),
extraído do PDF com camada de texto da mesma proposta e, por isso, a referência para os códigos.

A comparação é por (unidade, programa, ação, GND, fonte). Onde a base por OCR tem valor a mais numa chave e o PDF tem a menos, a linha da base é
movida para a chave do PDF dentro do mesmo (unidade, programa), desde que o valor caiba. Casos tratados na primeira execução (16 chaves): ação 1161
do programa 0018 da Secretaria de Recuperação do Rio Doce lida como 4161 (R$ 687,7 milhões), ação 2301 lida como 2501, fontes 703/704 e 753/754
trocadas e dois valores de R$ 100 entre GND 4 e 5. Os totais não mudam. Ao fim, todas as chaves precisam coincidir com as do PDF.

Uso: python3 scripts/ploa/corrige_com_elementos.py
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent.parent
BASE = RAIZ / "data" / "ploa2027.json"
ELEM = RAIZ / "data" / "ploa2027-elementos.json"


def main():
    base = json.loads(BASE.read_text(encoding="utf-8"))
    el = json.loads(ELEM.read_text(encoding="utf-8"))
    ic = {c: i for i, c in enumerate(base["colunas"])}
    chave = lambda r: (str(r[ic["uo"]]), str(r[ic["programa"]]), str(r[ic["acao"]]), str(r[ic["gnd"]]), str(r[ic["fonte"]]))
    got = defaultdict(int)
    for uo, _f, _s, prog, acao, _e, nat, fonte, v in el["linhas"]:
        got[(uo, prog, acao, nat[1], fonte)] += v
    ref = defaultdict(int)
    for r in base["linhas"]:
        ref[chave(r)] += int(r[ic["valor"]])
    movidas = 0
    for r in base["linhas"]:
        k = chave(r)
        v = int(r[ic["valor"]])
        if ref[k] <= got.get(k, 0):
            continue
        # chaves com falta no mesmo (unidade, programa) em que a linha cabe
        alvos = [k2 for k2 in got if k2[:2] == k[:2] and got[k2] - ref.get(k2, 0) >= v and k2 != k]
        if not alvos:
            sys.exit(f"sem destino para a linha {r}")
        k2 = sorted(alvos, key=lambda x: got[x] - ref.get(x, 0))[0]
        ref[k] -= v
        ref[k2] += v
        r[ic["acao"]], r[ic["gnd"]], r[ic["fonte"]] = k2[2], k2[3], k2[4]
        movidas += 1
    restantes = [k for k in set(got) | set(ref) if got.get(k, 0) != ref.get(k, 0)]
    if restantes:
        sys.exit(f"{len(restantes)} chaves ainda divergem: {sorted(restantes)[:5]}")
    base["metodo"] = base["metodo"].rstrip() + " Códigos de ação e de fonte conferidos e corrigidos com o detalhamento por elemento (PDF com camada de texto da mesma proposta; scripts/ploa/corrige_com_elementos.py)."
    BASE.write_text(json.dumps(base, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{movidas} linhas movidas; todas as chaves coincidem com o PDF", file=sys.stderr)


if __name__ == "__main__":
    main()
