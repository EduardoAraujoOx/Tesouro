#!/usr/bin/env python3
"""OCR por celula da grade (PLOA 2027, Programa de Trabalho). Versao 2.

Cada pagina vira uma lista de linhas da coluna de valores (celulas delimitadas pelas linhas horizontais da grade):
  kind 'data' : linha de dado (tem linha vertical entre funcao e subfuncao): leitura de valor, faixa A (esfera/funcao/subfuncao)
                e faixa B (gnd/modalidade/id/fonte)
  kind 'head' : linha de cabecalho (orgao, UO, programa, acao, resumo geral...): texto da linha e codigo lido so com digitos
Saida: pages2/pNNN.json.  Uso: python3 -I ocr2.py PDF OUTDIR PAG_INI PAG_FIM [NPROC]
"""
import csv, io, json, os, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image

DPI = 300
ENV = {**os.environ, "OMP_THREAD_LIMIT": "1"}
PADRAO = [224, 836, 950, 1075, 1235, 1513, 1726, 1876, 2045, 2258]


def runs_mask(dark, minrun):
    h, w = dark.shape
    mask = np.zeros_like(dark)
    for y in range(h):
        row = dark[y]
        if not row.any():
            continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        for a, b in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            if b - a >= minrun:
                mask[y, a:b] = True
    return mask


def dilate(mask, r):
    out = mask.copy()
    for k in range(1, r + 1):
        out[k:, :] |= mask[:-k, :]; out[:-k, :] |= mask[k:, :]
        out[:, k:] |= mask[:, :-k]; out[:, :-k] |= mask[:, k:]
    return out


def render(pdf, pag):
    base = f"/tmp/o2_{os.getpid()}_{pag}"
    subprocess.run(["pdftoppm", "-r", str(DPI), "-gray", "-f", str(pag), "-l", str(pag), "-png", "-singlefile", pdf, base], check=True)
    arr = np.array(Image.open(base + ".png").convert("L"))
    os.remove(base + ".png")
    return arr


def ocr(img, psm=7, wl=None, scale=3):
    """Devolve lista de palavras (x, w, t, conf) em coordenadas do recorte original."""
    if img.size == 0:
        return []
    im = Image.fromarray(img)
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    tmp = f"/tmp/o2_{os.getpid()}_c.png"
    im.save(tmp)
    cmd = ["tesseract", tmp, "stdout", "-l", "por", "--psm", str(psm)]
    if wl:
        cmd += ["-c", f"tessedit_char_whitelist={wl}"]
    cmd += ["tsv"]
    r = subprocess.run(cmd, capture_output=True, text=True, env=ENV)
    out = []
    rd = csv.reader(io.StringIO(r.stdout), delimiter="\t", quoting=csv.QUOTE_NONE)
    next(rd, None)
    for c in rd:
        if len(c) >= 12 and c[0] == "5" and c[11].strip():
            out.append({"x": int(c[6]) / scale, "w": int(c[8]) / scale, "t": c[11].strip(), "conf": float(c[10])})
    return out


def agrupa(ws, gap=40):
    """Junta palavras vizinhas (mesma coluna) em tokens por distancia horizontal."""
    ws = sorted(ws, key=lambda d: d["x"])
    out = []
    for d in ws:
        if out and d["x"] - (out[-1]["x"] + out[-1]["w"]) < gap and False:
            pass
        out.append(d)
    return out


def processa(args):
    pdf, outdir, pag = args
    arr = render(pdf, pag)
    h, w = arr.shape
    dark = arr < 110
    # grade vertical
    colfrac = dark[int(h * 0.12):int(h * 0.92), :].mean(axis=0)
    xs = np.where(colfrac > 0.18)[0]
    det, grp = [], []
    for x in xs:
        if grp and x - grp[-1] > 3:
            det.append(int(np.mean(grp))); grp = []
        grp.append(x)
    if grp:
        det.append(int(np.mean(grp)))
    vl = []
    for p in PADRAO:
        c = [x for x in det if abs(x - p) <= 25]
        vl.append(min(c, key=lambda x: abs(x - p)) if c else p)
    # linhas horizontais na coluna de valores
    xa, xb = vl[8] + 3, vl[9] - 2
    hm = runs_mask(dark[:, xa:xb], int(0.8 * (xb - xa)))
    ys = np.where(hm.any(axis=1))[0]
    hl, grp = [], []
    for y in ys:
        if grp and y - grp[-1] > 4:
            hl.append(int(np.mean(grp))); grp = []
        grp.append(y)
    if grp:
        hl.append(int(np.mean(grp)))
    # limpa a grade e binariza
    m = runs_mask(dark, 110) | runs_mask(dark.T.copy(), 110).T
    clean = arr.copy()
    clean[dilate(m, 2)] = 255
    bw = np.where(clean < 140, 0, 255).astype(np.uint8)
    # corpo da tabela: apos a segunda linha longa do cabecalho (cabecalho da tabela = 1a celula) ate a ultima linha
    linhas = []
    cel = [(hl[i] + 3, hl[i + 1] - 2) for i in range(len(hl) - 1) if hl[i + 1] - hl[i] >= 18]
    # a primeira celula e o cabecalho da tabela (ESFERA/FONTE...): descarta
    if cel and (cel[0][1] - cel[0][0]) > 60 and "VALOR" in "".join(x["t"].upper() for x in ocr(bw[cel[0][0]:cel[0][1], xa:xb], 6, None, 2)):
        cel = cel[1:]
    for (ya, yb) in cel:
        vc = bw[ya:yb, xa + 3:xb - 3]
        ink = int((vc == 0).sum())
        # linha vertical entre funcao e subfuncao => linha de dado
        def cont(k):
            s = dark[ya + 2:yb - 2, vl[k] - 2:vl[k] + 3]
            return bool(s.size and s.any(axis=1).mean() > 0.85)
        eh_dado = cont(1) and cont(2) and cont(3)
        reg = {"y0": ya, "y1": yb, "ink": ink, "kind": "data" if eh_dado else "head"}
        if ink >= 40:
            gc = clean[ya:yb, xa + 3:xb - 3]
            vars_ = []
            for img, sc, psm in ((vc, 3, 7), (gc, 3, 7), (gc, 2, 7), (gc, 4, 7), (vc, 4, 7), (gc, 3, 8)):
                ws = ocr(img, psm, "0123456789.", sc)
                vars_.append("".join(d["t"] for d in ws))
            reg["vars"] = vars_
            reg["val"] = vars_[0]
        if eh_dado:
            if ink < 40:
                continue  # linha de produto/meta (sem valor)
            A = ocr(bw[ya:yb, vl[1] + 6:vl[4] - 4], 7, "FS0123456789", 3)
            B = ocr(bw[ya:yb, vl[4] + 6:vl[8] - 4], 7, "0123456789", 3)
            reg["A"] = [{"x": vl[1] + 6 + d["x"], "t": d["t"], "conf": d["conf"]} for d in A]
            reg["B"] = [{"x": vl[4] + 6 + d["x"], "t": d["t"], "conf": d["conf"]} for d in B]
        else:
            band = bw[ya:yb, vl[0] + 4:vl[8] - 4]
            T = ocr(band, 7, None, 2)
            reg["txt"] = " ".join(d["t"] for d in T)
            reg["x"] = vl[0] + 4 + (T[0]["x"] if T else 0)
            C = ocr(bw[ya:yb, vl[0] + 4:vl[0] + 420], 7, "0123456789", 3)
            reg["code"] = [{"x": vl[0] + 4 + d["x"], "t": d["t"], "conf": d["conf"]} for d in C]
            reg["bg"] = float(np.median(arr[ya + 4:yb - 4, vl[0] + 6:vl[0] + 22])) if yb - ya > 10 else 255.0
        linhas.append(reg)
    os.makedirs(outdir, exist_ok=True)
    json.dump({"pag": pag, "vlines": vl, "rows": linhas}, open(os.path.join(outdir, f"p{pag:03d}.json"), "w"), ensure_ascii=False)
    return pag


if __name__ == "__main__":
    pdf, outdir, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    n = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    with ProcessPoolExecutor(n) as ex:
        for p in ex.map(processa, [(pdf, outdir, p) for p in range(a, b + 1)]):
            print("ok", p, flush=True)
