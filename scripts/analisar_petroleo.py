#!/usr/bin/env python3
"""
Gera data/petroleo-sensibilidade.json: como a receita do Estado ligada ao petróleo responde à cotação (Brent em reais), à produção do ES e
ao câmbio, estimado sobre a história mensal. Alimenta o quadro "Petróleo: sensibilidade à cotação" do painel.

Três relações, todas só com a biblioteca padrão:
  1. Royalties + excedente da produção (cota-parte do Estado). Receita do mês t proporcional ao preço em reais (Brent × câmbio) e à
     produção do mês t-2 (a ANP paga no segundo mês após a produção). Elasticidade fixada em 1 (a regressão livre dá ~1,0 para o preço e ~1,0
     para a produção); só se estima a constante (k), com a janela dos 36 meses mais recentes.
  2. Participação especial. Paga por trimestre (fev, mai, ago, nov); regressão do log do pagamento sobre o log da média de preço × produção
     dos três meses que terminam dois meses antes. Poucos pagamentos: a elasticidade é indicativa.
  3. ICMS do segmento "indústria do petróleo" (CAF). Regressão mensal do log sobre o log do preço em reais, defasado um mês.

Validação fora da amostra: ajusta até dez/2025 e compara com o realizado de jan a jul/2026 (royalties + excedente) e com os pagamentos de
fev e mai/2026 (participação especial).

Entradas: data/petroleo-mercado.json, data/rreo.json (royalties mensais até 2025), data/receita-sefaz.json (naturezas 2023 em diante),
data/icms-caf.json (ICMS mensal por CAF até 2024).

Uso:
    python3 scripts/analisar_petroleo.py
"""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
D = RAIZ / "data"
SAIDA = D / "petroleo-sensibilidade.json"
LAG_ROYALTIES = 2
JANELA_K = 36


def carrega(nome):
    return json.loads((D / nome).read_text(encoding="utf-8"))


def desloca(chave, n):
    a, m = int(chave[:4]), int(chave[5:])
    t = a * 12 + m - 1 - n
    return f"{t // 12}-{t % 12 + 1:02d}"


def mensal_da_sefaz(sefaz, cods):
    """Receita do mês (R$) a partir do acumulado no ano de cada natureza no demonstrativo mensal."""
    out = {}
    for k in sorted(sefaz):
        mes = int(k[5:])
        if not all(c in sefaz[k] for c in cods):
            continue
        atual = sum(sefaz[k][c] for c in cods)
        ant = sum(sefaz[f"{k[:4]}-{mes - 1:02d}"].get(c, 0) for c in cods) if mes > 1 else 0
        out[k] = atual - ant
    return out


def ols1(x, y):
    n = len(x)
    mx, my = sum(x) / n, sum(y) / n
    sxx = sum((a - mx) ** 2 for a in x)
    b = sum((a - mx) * (c - my) for a, c in zip(x, y)) / sxx
    a0 = my - b * mx
    sse = sum((c - (a0 + b * a)) ** 2 for a, c in zip(x, y))
    sst = sum((c - my) ** 2 for c in y)
    se_b = math.sqrt(sse / (n - 2) / sxx) if n > 2 else float("nan")
    return a0, b, 1 - sse / sst, se_b, math.sqrt(sse / (n - 2)) if n > 2 else float("nan")


def ols2(x1, x2, y):
    """Mínimos quadrados com constante e dois regressores (equações normais)."""
    n = len(y)
    X = [[1.0, a, b] for a, b in zip(x1, x2)]
    A = [[sum(r[i] * r[j] for r in X) for j in range(3)] for i in range(3)]
    v = [sum(r[i] * c for r, c in zip(X, y)) for i in range(3)]
    for i in range(3):
        p = max(range(i, 3), key=lambda r: abs(A[r][i]))
        A[i], A[p] = A[p], A[i]; v[i], v[p] = v[p], v[i]
        for r in range(i + 1, 3):
            f = A[r][i] / A[i][i]
            for c in range(i, 3):
                A[r][c] -= f * A[i][c]
            v[r] -= f * v[i]
    beta = [0.0] * 3
    for i in (2, 1, 0):
        beta[i] = (v[i] - sum(A[i][j] * beta[j] for j in range(i + 1, 3))) / A[i][i]
    pred = [beta[0] + beta[1] * a + beta[2] * b for a, b in zip(x1, x2)]
    my = sum(y) / n
    return beta, 1 - sum((c - p) ** 2 for c, p in zip(y, pred)) / sum((c - my) ** 2 for c in y)


def main():
    m = carrega("petroleo-mercado.json")
    B, F, Q = m["brent"], m["cambio"], m["producao"]
    P = {k: B[k] * F[k] for k in B if k in F}  # preço em R$/barril
    rreo = carrega("rreo.json")
    sefaz = carrega("receita-sefaz.json")["meses"]
    caf = carrega("icms-caf.json")

    # ---------- 1. royalties + excedente ----------
    roy = dict(rreo["mensal"]["royalties"])
    rec_sefaz = mensal_da_sefaz(sefaz, ["17125211", "17125221"])
    for k, v in rec_sefaz.items():
        if k >= "2026-01":
            roy[k] = v
    meses = sorted(k for k in roy if roy[k] > 0 and desloca(k, LAG_ROYALTIES) in P and desloca(k, LAG_ROYALTIES) in Q)
    pq = lambda k: P[desloca(k, LAG_ROYALTIES)] * Q[desloca(k, LAG_ROYALTIES)]
    # defasagem: R² da regressão livre por defasagem (para documentar a escolha)
    lags = []
    for L in range(0, 5):
        ks = [k for k in sorted(roy) if roy[k] > 0 and desloca(k, L) in P and desloca(k, L) in Q]
        beta, r2 = ols2([math.log(P[desloca(k, L)]) for k in ks], [math.log(Q[desloca(k, L)]) for k in ks], [math.log(roy[k]) for k in ks])
        lags.append({"defasagem": L, "r2": round(r2, 3), "elast_preco": round(beta[1], 2), "elast_producao": round(beta[2], 2)})
    # constante k: média do log da razão receita / (preço × produção), janela dos últimos 36 meses até dez/2025 (para a validação) e até o último mês
    razao = {k: math.log(roy[k] / pq(k)) for k in meses}
    ate25 = [k for k in meses if k <= "2025-12"][-JANELA_K:]
    k25 = math.exp(sum(razao[k] for k in ate25) / len(ate25))
    todas = meses[-JANELA_K:]
    k_atual = math.exp(sum(razao[k] for k in todas) / len(todas))
    desvio = math.sqrt(sum((razao[k] - math.log(k_atual)) ** 2 for k in todas) / (len(todas) - 1))
    oos = [{"mes": k, "previsto": k25 * pq(k), "realizado": roy[k]} for k in meses if k >= "2026-01"]
    oos_total = (sum(o["previsto"] for o in oos), sum(o["realizado"] for o in oos))
    k_por_ano = {}
    for k in meses:
        k_por_ano.setdefault(k[:4], []).append(razao[k])
    k_por_ano = {a: math.exp(sum(v) / len(v)) / k_atual for a, v in k_por_ano.items()}

    # ---------- 2. participação especial ----------
    pe_mes = mensal_da_sefaz(sefaz, ["17125231"])
    pagos = {k: v for k, v in pe_mes.items() if v > 5e7}
    def x_pe(k):
        ks = [desloca(k, 2 + j) for j in range(3)]
        return math.log(sum(P[x] * Q[x] for x in ks) / 3) if all(x in P and x in Q for x in ks) else None
    # pagamentos posteriores ao último demonstrativo da SEFAZ: derivados do Portal (alínea 171252 do mês menos royalties + excedente estimados
    # pelo modelo 1, descontados FEP, multas e juros em 3%); o pagamento de novembro do ano corrente só entra depois de fechado o mês
    portal = carrega("receita.json")
    derivados = {}
    ultimo_sefaz = max(pe_mes)
    mes_portal = {}
    for mm, al, _f, br, _de, _li in portal["anos"][str(datetime.now(timezone.utc).year)]["linhas"]:
        if str(al) == "171252":
            mes_portal[f"{datetime.now(timezone.utc).year}-{int(mm):02d}"] = mes_portal.get(f"{datetime.now(timezone.utc).year}-{int(mm):02d}", 0) + br
    for k in sorted(mes_portal):
        if k > ultimo_sefaz and k[5:] in ("02", "05", "08") and desloca(k, LAG_ROYALTIES) in P and desloca(k, LAG_ROYALTIES) in Q:
            pe_est = (mes_portal[k] - k25 * pq(k)) * 0.97
            if pe_est > 5e7:
                derivados[k] = pe_est
    pagos_todos = {**pagos, **derivados}
    pts = [(k, x_pe(k), math.log(v)) for k, v in sorted(pagos_todos.items()) if x_pe(k) is not None]
    a_pe, b_pe, r2_pe, se_pe, s_pe = ols1([p[1] for p in pts], [p[2] for p in pts])
    pts25 = [p for p in pts if p[0] <= "2025-12"]
    a25, b25, _, _, _ = ols1([p[1] for p in pts25], [p[2] for p in pts25])
    oos_pe = [{"mes": p[0], "previsto": math.exp(a25 + b25 * p[1]), "realizado": math.exp(p[2]), "derivado": p[0] in derivados} for p in pts if p[0] >= "2026-01"]

    # ---------- 3. ICMS da indústria do petróleo ----------
    ic = {k: v["industria do petroleo"] for k, v in caf["mensal"].items() if v.get("industria do petroleo")}
    ks = [k for k in sorted(ic) if desloca(k, 1) in P]
    a_ic, b_ic, r2_ic, se_ic, s_ic = ols1([math.log(P[desloca(k, 1)]) for k in ks], [math.log(ic[k]) for k in ks])

    # ---------- base de 2025 e de 2026 ----------
    def media(serie, ano, ate=12):
        v = [x for k, x in serie.items() if k.startswith(str(ano)) and int(k[5:]) <= ate]
        return sum(v) / len(v)
    base25 = {
        "brent": media(B, 2025), "cambio": media(F, 2025), "producao": media(Q, 2025),
        "roy_exc": sum(v for k, v in roy.items() if k.startswith("2025")),
        "pe": sum(v for k, v in pagos.items() if k.startswith("2025")),
        "icms_petroleo": sum(caf["anual"]["2025"]["industria do petroleo"] for _ in [0]),
    }
    ult = max(k for k in B if k.startswith("2026"))
    ult_prod = max(k for k in Q if k.startswith("2026"))
    base26 = {"brent": media(B, 2026), "cambio": media(F, 2026), "producao": media(Q, 2026), "ate_preco": ult, "ate_producao": ult_prod}

    # relação entre a alínea 171252 (Portal) e as naturezas principais (royalties + excedente + participação especial + FEP), para comparar com a PLOA
    alinea = sum(l[3] for l in portal["anos"]["2025"]["linhas"] if str(l[1]) == "171252")
    principais = base25["roy_exc"] + base25["pe"] + sum(sefaz["2025-12"].get("17125241", 0) for _ in [0])
    fator_alinea = alinea / (base25["roy_exc"] + base25["pe"])

    saida = {
        "coletado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metodo": "Estimado sobre a história mensal; ver scripts/analisar_petroleo.py",
        "royalties": {
            "defasagem_meses": LAG_ROYALTIES, "k": k_atual, "k_ate_2025": k25, "n": len(todas), "desvio_log": desvio,
            "amostra": {"de": meses[0], "ate": meses[-1], "n": len(meses)}, "por_defasagem": lags,
            "k_por_ano_relativo": {a: round(v, 3) for a, v in k_por_ano.items()},
            "fora_da_amostra": {"meses": [{**o, "previsto": round(o["previsto"]), "realizado": round(o["realizado"])} for o in oos], "previsto": round(oos_total[0]), "realizado": round(oos_total[1])},
        },
        "participacao_especial": {
            "a": a_pe, "elasticidade": b_pe, "erro_padrao_elasticidade": se_pe, "r2": r2_pe, "n": len(pts), "desvio_log": s_pe,
            "elasticidade_ate_2025": b25, "pagamentos_derivados": sorted(derivados),
            "fora_da_amostra": [{**o, "previsto": round(o["previsto"]), "realizado": round(o["realizado"])} for o in oos_pe],
        },
        "icms_petroleo": {"a": a_ic, "elasticidade_preco": b_ic, "erro_padrao": se_ic, "r2": r2_ic, "n": len(ks), "defasagem_meses": 1, "de": ks[0], "ate": ks[-1]},
        "base_2025": base25, "base_2026": base26, "fator_alinea_171252": fator_alinea,
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"royalties: k={k_atual:.4f}, desvio {desvio:.3f}; OOS 2026 previsto {oos_total[0] / 1e6:.0f} x realizado {oos_total[1] / 1e6:.0f} mi", file=sys.stderr)
    print(f"PE: elasticidade {b_pe:.2f} (ep {se_pe:.2f}), R² {r2_pe:.2f}, n={len(pts)}; OOS {[(o['mes'], round(o['previsto'] / 1e6), round(o['realizado'] / 1e6)) for o in oos_pe]}", file=sys.stderr)
    print(f"ICMS petróleo: elasticidade {b_ic:.2f} (ep {se_ic:.2f}), R² {r2_ic:.2f}, n={len(ks)}", file=sys.stderr)
    print(f"k por ano (rel.): {saida['royalties']['k_por_ano_relativo']}; fator alínea {fator_alinea:.3f}", file=sys.stderr)


if __name__ == "__main__":
    main()
