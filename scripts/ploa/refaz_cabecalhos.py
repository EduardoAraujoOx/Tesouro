#!/usr/bin/env python3
"""Relê a primeira linha das celulas de cabecalho altas (titulo em duas linhas) e atualiza pages2/pNNN.json."""
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ocr_celulas as ocr2

def refaz(args):
    pdf, d, pag = args
    f = os.path.join(d, f"p{pag:03d}.json")
    pg = json.load(open(f))
    altos = [r for r in pg["rows"] if r["kind"] == "head" and (r["y1"] - r["y0"]) > 46]
    if not altos:
        return pag, 0
    arr = ocr2.render(pdf, pag)
    dark = arr < 110
    m = ocr2.runs_mask(dark, 110) | ocr2.runs_mask(dark.T.copy(), 110).T
    clean = arr.copy(); clean[ocr2.dilate(m, 2)] = 255
    bw = np.where(clean < 140, 0, 255).astype(np.uint8)
    vl = pg["vlines"]
    for r in altos:
        ya = r["y0"]; yb = min(r["y1"], ya + 38)
        band = bw[ya:yb, vl[0] + 4:vl[8] - 4]
        T = ocr2.ocr(band, 7, None, 2)
        r["txt"] = " ".join(d_["t"] for d_ in T)
        r["x"] = vl[0] + 4 + (T[0]["x"] if T else 0)
        C = ocr2.ocr(bw[ya:yb, vl[0] + 4:vl[0] + 420], 7, "0123456789", 3)
        r["code"] = [{"x": vl[0] + 4 + c["x"], "t": c["t"], "conf": c["conf"]} for c in C]
        r["refeito"] = True
    json.dump(pg, open(f, "w"), ensure_ascii=False)
    return pag, len(altos)

if __name__ == "__main__":
    pdf, d, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    with ProcessPoolExecutor(4) as ex:
        tot = 0
        for p, n in ex.map(refaz, [(pdf, d, p) for p in range(a, b + 1)]):
            tot += n
        print("celulas refeitas:", tot)
