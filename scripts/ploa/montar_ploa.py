#!/usr/bin/env python3
"""Monta e confere o Programa de Trabalho da PLOA 2027 a partir de pages2/*.json (ocr2.py).

Regra de ouro: nenhum numero e aceito por palpite. Cada valor tem varias leituras de OCR; escolhe-se a combinacao de
leituras que faz fechar, em cascata, os totais impressos no proprio documento:
   linhas da acao == total da acao   (corrige leituras erradas de linhas ou do total)
   acoes == programa == UO == orgao  (so confere; diverge => sinaliza)
   UO x GND x fonte == "Resumo geral do orgao"
Saida: JSON com linhas, totais, divergencias remanescentes.
Uso: python3 -I monta2.py PAGES2_DIR PAG_INI PAG_FIM OUT_JSON
"""
import json, os, re, sys
from collections import Counter, defaultdict
from itertools import product

CONF = {"0": "8", "8": "03569", "3": "58", "5": "36", "6": "58", "1": "7", "7": "1", "9": "4", "4": "9", "2": "7"}

R_GND = re.compile(r"^(\d)\s*[-–—]\s*[A-ZÇÃÕÉÍÓÚÂÊÔ]")
R_FONTE_L = re.compile(r"(\d{3})\s*[-–—]\s*\S")


def dig(s):
    d = re.sub(r"\D", "", s or "")
    return int(d) if d else None


def cands(vars_):
    c = Counter(d for d in (dig(v) for v in vars_) if d is not None)
    return [v for v, _ in c.most_common()], c


def variantes_1dig(n, maxn=1):
    """Candidatos que diferem de n por troca de 1 digito entre confusoes visuais conhecidas."""
    s = str(n)
    out = set()
    for i, ch in enumerate(s):
        for alt in CONF.get(ch, ""):
            t = s[:i] + alt + s[i + 1:]
            if t[0] != "0" or len(t) == 1:
                out.add(int(t))
    return sorted(out)


def resolve_soma(H, Ls, beam=3000):
    """H: (cands, counter) do total; Ls: lista de (cands, counter). Devolve (h, [l...], custo, nivel) ou None.
    Custo = soma dos 'postos' (0 = leitura mais votada). nivel 0: so leituras de OCR; 1: com trocas de 1 digito."""
    for nivel in ((0, 1) if len(Ls) <= 10 else (0,)):
        def lista(c):
            base, cnt = c
            tot = sum(cnt.values()) or 1
            res = [(v, 1 - cnt[v] / tot) for v in base]  # custo menor para a leitura mais votada
            if nivel == 1:
                extra = set()
                for v in base[:2]:
                    extra |= set(variantes_1dig(v))
                res += [(v, 1.5) for v in sorted(extra) if v not in base]
            return res or [(0, 9)]
        estados = {0: (0, [])}
        for c in Ls:
            novo = {}
            for s, (cu, asg) in estados.items():
                for v, r in lista(c):
                    k = s + v
                    cc = cu + r
                    if k not in novo or novo[k][0] > cc:
                        novo[k] = (cc, asg + [v])
            if len(novo) > beam:
                novo = dict(sorted(novo.items(), key=lambda kv: kv[1][0])[:beam])
            estados = novo
        melhor = None
        for hv, hr in lista(H):
            if hv in estados:
                cu = estados[hv][0] + hr
                if melhor is None or cu < melhor[2]:
                    melhor = (hv, estados[hv][1], cu, nivel)
        if melhor:
            return melhor
    return None


def parse_attr(r, vl):
    out = {"gnd": None, "mod": None, "id": None, "fonte": None, "esfera": None, "funcao": None, "subf": None}
    for d in r.get("B", []):
        x, t = d["x"], d["t"]
        if x < vl[5] - 12:
            out["gnd"] = t[-1]
        elif x < vl[6] - 12:
            out["mod"] = t
        elif x < vl[7] - 12:
            out["id"] = t
        else:
            out["fonte"] = t[-3:] if len(t) >= 3 else t
    for d in r.get("A", []):
        x, t = d["x"], d["t"]
        if x < vl[2] - 12:
            out["esfera"] = "F" if t.startswith("F") else "S"
        elif x < vl[3] - 12:
            out["funcao"] = t[-2:] if len(t) >= 2 else t
        else:
            out["subf"] = t[-3:] if len(t) >= 3 else t
    return out


def codigo_cab(r, n):
    """Codigo de n digitos de uma linha de cabecalho: cruza a leitura de so-digitos com o inicio do texto."""
    a = [t["t"] for t in r.get("code", []) if len(t["t"]) == n]
    m = re.match(r"^\W*([0-9OIlSBZGH]{%d})\b" % n, r["txt"])
    b = None
    if m:
        b = m.group(1).translate(str.maketrans("OIlSBZGH", "01158266"))
    return (a[0] if a else None), b


def nome_cab(txt):
    m = re.match(r"^[^-–—]{0,10}?[-–—]\s*(\S.*)$", txt)
    if m:
        res = m.group(1).strip()
        m2 = re.match(r"^[\d%\W]{1,8}?[-–—]\s*(\S.*)$", res)
        return (m2.group(1) if m2 else res).strip()
    return re.sub(r"^\W*[0-9A-Z]{2,5}\s+", "", txt).strip()


def norm_nome(s):
    s = re.sub(r"[^A-Z0-9ÇÃÕÁÉÍÓÚÂÊÔ ]", "", s.upper())
    return re.sub(r"\s+", " ", s).strip()[:34]


def carrega_ref():
    cam = os.environ.get("ORC_REF")
    ref = {"uo": {}, "acao": {}, "programa": {}, "fonte": {}}
    if cam and os.path.exists(cam):
        n = json.load(open(cam))["nomes"]
        for k in ref:
            ref[k] = {c: nm for c, nm in n.get(k, {}).items() if nm}
    por_nome = {k: defaultdict(Counter) for k in ref}
    for k, d in ref.items():
        for c, nm in d.items():
            por_nome[k][norm_nome(nm)][c] += 1
    return ref, por_nome


def monta(dirp, a, b):
    ref, por_nome = carrega_ref()

    def fonte_por_nome(cod, nome):
        """Codigo da fonte: o nome impresso e estavel; se ele identifica uma unica fonte da base de 2026, vale o codigo dela."""
        nm = norm_nome(nome)
        c = por_nome["fonte"].get(nm) if ref["fonte"] else None
        if c and len(c) == 1:
            achado = next(iter(c))
            if achado != cod:
                avisos.append((0, 0, "fonte_resumo_por_nome", f"{cod} -> {achado} ({nome[:40]})"))
            return achado
        return cod
    seq = []
    for p in range(a, b + 1):
        f = os.path.join(dirp, f"p{p:03d}.json")
        if os.path.exists(f):
            pg = json.load(open(f))
            for r in pg["rows"]:
                seq.append((pg["pag"], pg["vlines"], r))
    dic = {}
    for pag, vl, r in seq:
        if r["kind"] == "head" and r.get("bg", 255) >= 240 and 285 <= (r.get("x", 0) if not r.get("refeito") else 290) and not re.match(r"^\W*\d{5}\b", r["txt"]):
            c1, c2 = codigo_cab(r, 4)
            if c1 and c1 == c2:
                dic.setdefault(norm_nome(nome_cab(r["txt"])), Counter())[c1] += 1
    org = uo = prog = acao = None
    modo = "prog"
    esfera = funcao = subf = None
    gnd_atual = None
    resumo_uo = None
    resumo_gnd = None
    H = {"org": {}, "uo": {}, "prog": {}, "acao": {}}  # (cands, counter)
    nomes = {"org": {}, "uo": {}, "prog": {}, "acao": {}}
    linhas = []
    resumo = []
    avisos = []
    for pag, vl, r in seq:
        txt = r.get("txt", "")
        cv = cands(r["vars"]) if r.get("vars") else ([], Counter())
        if r["kind"] == "head":
            if txt.upper().replace(" ", "").startswith("RESUMOGERAL"):
                modo = "resumo"; resumo_uo = None; resumo_gnd = None
                continue
            x = r["x"]
            ml = re.match(r"^\W*([0-9A-Za-z]{1,5})(?=\s|[-–—]|$)", txt)
            n = len(ml.group(1)) if (ml and re.search(r"\d", ml.group(1))) else 0
            orgs_ref = {c[:2] for c in ref["uo"]}
            def eh_org():
                c1_, c2_ = codigo_cab(r, 2)
                c_ = c2_ or c1_
                return c_ if (c_ and x < 262 and (not orgs_ref or c_ in orgs_ref)) else None
            if modo == "resumo":
                if n == 2 and eh_org():  # orgao (repetido) ou novo orgao: compara o NOME, que e estavel, e nao o codigo lido
                    c1, c2 = codigo_cab(r, 2)
                    cod = c2 or c1
                    igual = norm_nome(nome_cab(txt)) == norm_nome(nomes["org"].get(org, ""))
                    if not igual and cod != org:
                        modo = "prog"
                    else:
                        continue
                elif n == 5:
                    c1, c2 = codigo_cab(r, 5)
                    resumo_uo = c2 or c1
                    continue
                else:
                    mg = R_GND.match(txt)
                    if mg and cv[0]:
                        resumo_gnd = mg.group(1)
                        mf = re.search(r"(\d{3,4})\s*[-–—]\s*(\S.*)$", txt[mg.end():])
                        resumo.append({"uo": resumo_uo, "gnd": resumo_gnd, "fonte": fonte_por_nome(mf.group(1)[-3:], mf.group(2)) if mf else None, "v": cv, "pag": pag})
                        continue
                    mf = re.match(r"^\W*(\d{3,4})\s*[-–—]\s*(\S.*)$", txt)
                    if mf and cv[0] and resumo_gnd:
                        resumo.append({"uo": resumo_uo, "gnd": resumo_gnd, "fonte": fonte_por_nome(mf.group(1)[-3:], mf.group(2)), "v": cv, "pag": pag})
                        continue
                    avisos.append((pag, r["y0"], "resumo_nao_lido", txt[:60]))
                    continue
            # modo prog
            if n == 2 and eh_org():
                c1, c2 = codigo_cab(r, 2)
                org = c2 or c1
                H["org"][org] = cv; nomes["org"][org] = nome_cab(txt)
                uo = prog = acao = None
            elif r.get("bg", 255) < 200:
                c1, c2 = codigo_cab(r, 5)
                cod = c1 if (c1 and org and c1.startswith(org)) else (c2 if (c2 and org and c2.startswith(org)) else (c1 or c2))
                if c1 != c2 or (ref["uo"] and cod not in ref["uo"]):
                    bons = [c for c in {c1, c2} if c and c in ref["uo"] and (not org or c.startswith(org))]
                    nm = norm_nome(nome_cab(txt))
                    if len(bons) == 1:
                        cod = bons[0]
                    elif nm in por_nome["uo"] and len(por_nome["uo"][nm]) == 1:
                        cod = next(iter(por_nome["uo"][nm]))
                    if cod is None or (ref["uo"] and cod not in ref["uo"] and nm in por_nome["uo"] and len(por_nome["uo"][nm]) == 1):
                        if nm in por_nome["uo"] and len(por_nome["uo"][nm]) == 1:
                            cod = next(iter(por_nome["uo"][nm]))
                    avisos.append((pag, r["y0"], "uo_codigo_discorda", f"{c1} / {c2} -> {cod}"))
                if cod and org and not cod.startswith(org):
                    alt = org + cod[2:]
                    nm2 = norm_nome(nome_cab(txt))
                    if alt in ref["uo"] or (nm2 in por_nome["uo"] and alt in por_nome["uo"][nm2]) or not ref["uo"]:
                        avisos.append((pag, r["y0"], "uo_prefixo_corrigido", f"{cod} -> {alt}"))
                        cod = alt
                uo = cod
                H["uo"][uo] = cv; nomes["uo"][uo] = nome_cab(txt)
                prog = acao = None
            else:
                c1, c2 = codigo_cab(r, 4)
                cod = c1 or c2
                if cod is None:
                    tr = "programa" if r.get("bg", 255) < 240 else "acao"
                    nmx = norm_nome(nome_cab(txt))
                    if nmx in por_nome[tr] and len(por_nome[tr][nmx]) == 1:
                        cod = next(iter(por_nome[tr][nmx]))
                    elif nmx in dic:
                        cod = dic[nmx].most_common(1)[0][0]
                    avisos.append((pag, r["y0"], "cod4_ilegivel", f"{txt[:40]} -> {cod}"))
                if c1 and c2 and c1 != c2:
                    tipo_ref = ref["programa"] if r.get("bg", 255) < 240 else ref["acao"]
                    so_um = [c for c in (c1, c2) if c in tipo_ref]
                    if len(so_um) == 1:
                        cod = so_um[0]
                    nm = norm_nome(nome_cab(txt))
                    best = dic.get(nm) if len(so_um) != 1 else None
                    if best:
                        for cand in (c1, c2):
                            if cand == best.most_common(1)[0][0]:
                                cod = cand
                                break
                        else:
                            cod = best.most_common(1)[0][0]
                    avisos.append((pag, r["y0"], "cod4_discorda", f"{c1} / {c2}"))
                if r.get("bg", 255 if x >= 281 else 220) < 240:
                    prog = cod; acao = None
                    H["prog"][(uo, prog)] = cv; nomes["prog"][(uo, prog)] = nome_cab(txt)
                else:
                    acao = cod; gnd_atual = None
                    H["acao"][(uo, prog, acao)] = cv; nomes["acao"][(uo, prog, acao)] = nome_cab(txt)
            continue
        # linha de dado
        if not cv[0]:
            avisos.append((pag, r["y0"], "dado_sem_valor", ""))
            continue
        a_ = parse_attr(r, vl)
        if a_["esfera"]: esfera = a_["esfera"]
        if a_["funcao"]: funcao = a_["funcao"]
        if a_["subf"]: subf = a_["subf"]
        if a_["gnd"]: gnd_atual = a_["gnd"]
        linhas.append({"pag": pag, "y": r["y0"], "org": org, "uo": uo, "prog": prog, "acao": acao, "esfera": esfera,
                       "funcao": funcao, "subf": subf, "gnd": gnd_atual, "gnd_lido": a_["gnd"], "mod": a_["mod"],
                       "fonte": a_["fonte"], "v": cv})
    return {"H": H, "nomes": nomes, "linhas": linhas, "resumo": resumo, "avisos": avisos, "ref_fontes": sorted(ref["fonte"])}


def fecha(m):
    """Resolve valores pela cascata de somas. Devolve linhas finais e relatorio."""
    H, L = m["H"], m["linhas"]
    por_acao = defaultdict(list)
    for i, l in enumerate(L):
        por_acao[(l["uo"], l["prog"], l["acao"])].append(i)
    rel = {"acao_ok": 0, "acao_ok_nivel1": 0, "acao_falha": [], "acao_sem_cabecalho": []}
    tot_acao = {}
    for k, idx in por_acao.items():
        if k not in H["acao"]:
            rel["acao_sem_cabecalho"].append(k)
            continue
        res = resolve_soma(H["acao"][k], [L[i]["v"] for i in idx])
        if res is None:
            rel["acao_falha"].append(k)
            continue
        hv, ls, cu, nivel = res
        tot_acao[k] = hv
        for i, v in zip(idx, ls):
            L[i]["valor"] = v
        rel["acao_ok"] += 1
        rel["acao_ok_nivel1"] += (nivel == 1)
    # acoes sem linhas (so cabecalho) -> usa leitura mais votada
    for k, c in H["acao"].items():
        if k not in tot_acao and k not in por_acao and c[0]:
            tot_acao[k] = c[0][0]
    # programa / UO / orgao
    def sobe(pai_de, tot_filho, Hpai, nome):
        soma = defaultdict(int)
        for k, v in tot_filho.items():
            if None in (k if isinstance(k, tuple) else (k,)):
                rel.setdefault("sem_pai", []).append(k)
                continue
            soma[pai_de(k)] += v
        tot, div = {}, []
        for k, s in soma.items():
            c = Hpai.get(k)
            if c and s in c[0]:
                tot[k] = s
            else:
                tot[k] = s
                div.append((k, s, c[0][:3] if c else None))
        return tot, div
    tot_prog, rel["prog_div"] = sobe(lambda k: (k[0], k[1]), tot_acao, H["prog"], "prog")
    tot_uo, rel["uo_div"] = sobe(lambda k: k[0], tot_prog, H["uo"], "uo")
    tot_org, rel["org_div"] = sobe(lambda k: k[:2], tot_uo, H["org"], "org")
    # resumo por UO x GND x fonte
    got = defaultdict(int)
    for l in L:
        if "valor" in l:
            got[(l["uo"], l["gnd"], l["fonte"])] += l["valor"]
    res_ = defaultdict(list)
    for r in m["resumo"]:
        res_[(r["uo"], r["gnd"], r["fonte"])].append(r["v"])
    rel["resumo_div"] = []
    for k in sorted(set(got) | set(res_), key=str):
        cs = res_.get(k)
        impresso = None
        if cs:
            # soma das leituras mais votadas (cada fonte aparece 1x por UO x GND)
            impresso = sum(c[0][0] for c in cs if c[0])
        if impresso != got.get(k):
            rel["resumo_div"].append((k, impresso, got.get(k)))
    rel["total_linhas"] = sum(l.get("valor", 0) for l in L)
    rel["total_orgaos"] = sum(tot_org.values())
    return {"tot_acao": tot_acao, "tot_prog": tot_prog, "tot_uo": tot_uo, "tot_org": tot_org}, rel


def atribui(m, tot_uo=None):
    """GND e fonte de cada linha, conferidos contra o 'Resumo geral do orgao' (soma por UO x GND x fonte).
    Linhas com GND/fonte ilegiveis (ou que desequilibram o resumo) sao atribuidas ao par que fecha a soma exata."""
    R = defaultdict(lambda: defaultdict(int))
    por_uo_res = defaultdict(list)
    for r in m["resumo"]:
        if r["uo"] and r["v"][0]:
            por_uo_res[r["uo"]].append(r)
    corrigidos = []
    validas = set(m.get("ref_fontes") or [])
    linhas_uo = defaultdict(list)
    for l in m["linhas"]:
        if "valor" in l:
            linhas_uo[l["uo"]].append(l)
    for uo, es in por_uo_res.items():
        if validas:
            for e in es:
                if e["fonte"] and e["fonte"] not in validas:
                    cand = {l["fonte"] for l in linhas_uo[uo] if l["gnd"] == e["gnd"] and l["fonte"] in validas} \
                        - {x["fonte"] for x in es if x is not e and x["gnd"] == e["gnd"]}
                    if len(cand) == 1:
                        corrigidos.append((uo, e["gnd"], e["fonte"], "fonte", next(iter(cand))))
                        e["fonte"] = next(iter(cand))
        # fonte ilegivel no resumo: se a UO so tem uma fonte "livre" (nao usada por outra linha do mesmo GND), completa
        usadas = {x["fonte"] for x in es if x["fonte"]}
        for e in es:
            if not e["fonte"] and len(usadas) == 1:
                e["fonte"] = next(iter(usadas)); e["fonte_inferida"] = True
        if tot_uo and uo in tot_uo:
            soma = sum(e["v"][0][0] for e in es)
            if soma != tot_uo[uo] and len(es) <= 10:
                res = resolve_soma(([tot_uo[uo]], Counter({tot_uo[uo]: 1})), [e["v"] for e in es])
                if res:
                    for e, v in zip(es, res[1]):
                        if v != e["v"][0][0]:
                            corrigidos.append((uo, e["gnd"], e["fonte"], e["v"][0][0], v))
                            e["v"] = ([v] + e["v"][0], e["v"][1])
    for r in m["resumo"]:
        if r["uo"] and r["v"][0] and r["fonte"] and r["gnd"]:
            R[r["uo"]][(r["gnd"], r["fonte"])] += r["v"][0][0]
    por_uo = defaultdict(list)
    for l in m["linhas"]:
        if "valor" in l:
            por_uo[l["uo"]].append(l)
    rel = {"uo_ok": 0, "uo_resolvida": 0, "uo_falha": [], "uo_sem_resumo": [], "resumo_corrigido": corrigidos}
    for uo, ls in por_uo.items():
        if uo not in R:
            rel["uo_sem_resumo"].append(uo)
            continue
        alvo = dict(R[uo])
        chaves = list(alvo)
        fontes_uo = {k[1] for k in alvo}
        for l in ls:
            l["g_f"] = (l["gnd"], l["fonte"]); l["origem"] = "lido"
            f = l["fonte"]
            if f not in fontes_uo:
                def subseq(a, b):
                    it = iter(b)
                    return all(ch in it for ch in a)
                cand = [x for x in fontes_uo if f and ((len(f) < 3 and subseq(f, x)) or (len(f) == 3 and sum(a != b for a, b in zip(f, x)) == 1))
                        and (l["gnd"], x) in alvo]
                if len(cand) == 1:
                    l["g_f"] = (l["gnd"], cand[0]); l["origem"] = "fonte_corrigida"
        # fase 1: fixa as validas; as demais ficam livres
        livres = [l for l in ls if l["g_f"] not in alvo]
        def residuo(lista_fixa):
            r = dict(alvo)
            for l in lista_fixa:
                r[l["g_f"]] = r.get(l["g_f"], 0) - l["valor"]
            return r
        for rodada in range(3):
            fixas = [l for l in ls if l not in livres]
            res = residuo(fixas)
            ruim = {k for k, v in res.items() if v != 0}
            if not livres and not ruim:
                break
            if rodada > 0 or any(v < 0 for v in res.values()):
                # libera tambem as linhas atribuidas as chaves com residuo diferente de zero
                livres = [l for l in ls if l in livres or l["g_f"] in ruim]
                fixas = [l for l in ls if l not in livres]
                res = residuo(fixas)
            # DFS: distribui as linhas livres pelas chaves de modo a zerar todos os residuos
            alvos = {k: v for k, v in res.items() if v != 0 or True}
            ordem = sorted(livres, key=lambda l: -l["valor"])
            sol = []
            orc = [3000000]
            def dfs(i, r):
                orc[0] -= 1
                if orc[0] < 0:
                    return False
                if i == len(ordem):
                    return all(v == 0 for v in r.values())
                l = ordem[i]
                # prefere manter a leitura original
                ks = sorted(r, key=lambda k: (k != l["g_f"], k))
                for k in ks:
                    if r[k] >= l["valor"]:
                        r[k] -= l["valor"]; sol.append((l, k))
                        if dfs(i + 1, r):
                            return True
                        r[k] += l["valor"]; sol.pop()
                return False
            import sys as _s
            _s.setrecursionlimit(10000)
            if dfs(0, dict(res)):
                for l, k in sol:
                    if l["g_f"] != k:
                        l["g_f"] = k; l["origem"] = "resolvido_resumo"
                break
        fixas = [l for l in ls]
        fin = dict(alvo)
        for l in ls:
            fin[l["g_f"]] = fin.get(l["g_f"], 0) - l["valor"]
        if all(v == 0 for v in fin.values()):
            if any(l["origem"] != "lido" for l in ls):
                rel["uo_resolvida"] += 1
            else:
                rel["uo_ok"] += 1
        else:
            rel["uo_falha"].append((uo, {str(k): v for k, v in fin.items() if v != 0}))
    for l in m["linhas"]:
        if "g_f" in l:
            l["gnd"], l["fonte"] = l["g_f"]
    return rel


if __name__ == "__main__":
    d, a, b, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    m = monta(d, a, b)
    tots, rel = fecha(m)
    rel["atribuicao"] = atribui(m, tots["tot_uo"])

    def limpa(o):
        if isinstance(o, dict):
            return {str(k): limpa(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [limpa(x) for x in o]
        if isinstance(o, Counter):
            return dict(o)
        return o
    json.dump(limpa({"m": m, "tots": tots, "rel": rel}), open(out, "w"), ensure_ascii=False)
    L = m["linhas"]
    print(f"linhas {len(L)} | acoes {len(m['H']['acao'])} | programas {len(m['H']['prog'])} | UOs {len(m['H']['uo'])} | orgaos {len(m['H']['org'])}")
    print(f"acoes fechadas {rel['acao_ok']} (com troca de 1 digito: {rel['acao_ok_nivel1']}) | falhas {len(rel['acao_falha'])} | sem cabecalho {len(rel['acao_sem_cabecalho'])}")
    print(f"divergencias: programa {len(rel['prog_div'])} | UO {len(rel['uo_div'])} | orgao {len(rel['org_div'])}")
    at = rel["atribuicao"]
    print(f"UO x GND x fonte: ok {at['uo_ok']} | resolvidas pelo resumo {at['uo_resolvida']} | falhas {len(at['uo_falha'])} | sem resumo {len(at['uo_sem_resumo'])}")
    print(f"soma das linhas {rel['total_linhas']:,} | soma dos orgaos {rel['total_orgaos']:,} | avisos {len(m['avisos'])}")
