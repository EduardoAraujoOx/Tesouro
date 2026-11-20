#!/usr/bin/env python3
"""
Atualiza data/despesa-mensal.json: despesa empenhada, liquidada e paga do Estado, acumulada no ano até o fim de cada mês, por grupo de
natureza da despesa (GND), a partir dos lançamentos diários do Portal de Dados Abertos do Espírito Santo.

Para que serve: o RREO só dá a execução acumulada ao fim de cada bimestre e sai com defasagem. Os lançamentos diários permitem medir a
execução até o último mês fechado (por exemplo, 31 de outubro) e compará-la com a mesma data dos anos anteriores, o que dá precisão à
projeção do fechamento do ano. Para o ano corrente, o arquivo traz também o acumulado até o último dia disponível.

Fonte: conjunto "[Portal da Transparência] Despesas, execução orçamentária e financeira", arquivos Despesas-AAAA.csv (uma linha por
lançamento, com data, GND e os valores empenhado, liquidado e pago; anulações aparecem como valores negativos). Os valores são somados por
(dia, GND) sem outra transformação. O arquivo é lido em fluxo e descartado.

Detalhamento: para o ano corrente e o anterior, o arquivo traz também o empenhado acumulado por elemento de despesa dentro de cada GND
(`elementos`), com os nomes em `nomes_elemento`. A PLOA 2027 só publica o detalhe por elemento em meio magnético, fora do PDF.

Conferência: o total anual por GND de cada ano fechado é comparado ao de data/orcamento.json (que vem de outro arquivo do mesmo conjunto); a
diferença relativa fica em `conferencia`.

Os arquivos são grandes e os anos fechados não mudam; por isso, por padrão, atualiza só o ano corrente e o anterior:
    python3 scripts/atualizar_despesa_mensal.py [ANO ...]
"""
import csv
import io
import json
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import atualizar_orcamento as orc  # noqa: E402  (reaproveita o acesso ao Portal)

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "despesa-mensal.json"


def br(s):
    s = (s or "").strip()
    return float(s.replace(".", "").replace(",", ".")) if s else 0.0


def agregar(url):
    """Lê o CSV em fluxo e devolve {GND: {AAAA-MM-DD: [empenhado, liquidado, pago]}}."""
    acc = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0, 0.0]))
    elem = defaultdict(lambda: defaultdict(float))  # (GND, elemento) -> dia -> empenhado
    nomes = {}
    linhas = 0
    with orc.abrir(url) as r:
        texto = io.TextIOWrapper(r, encoding="utf-8-sig", newline="")
        for x in csv.DictReader(texto, delimiter=";"):
            linhas += 1
            d = (x["Data"] or "")[:10]
            if len(d) != 10:
                continue
            dia = f"{d[6:10]}-{d[3:5]}-{d[0:2]}"
            gnd = (x["CodigoGrupoDespesa"] or "").strip() or "?"
            a = acc[gnd][dia]
            a[0] += br(x["ValorEmpenho"])
            a[1] += br(x["ValorLiquidado"])
            a[2] += br(x["ValorPago"])
            el = (x.get("CodigoElementoDespesa") or "").strip()
            if el:
                elem[(gnd, el)][dia] += br(x["ValorEmpenho"])
                nomes.setdefault(el, (x.get("ElementoDespesa") or "").strip())
    diario = {g: {d: [round(v) for v in vs] for d, vs in sorted(dias.items()) if any(round(v) for v in vs)} for g, dias in acc.items()}
    return diario, {k: {d: round(v) for d, v in dias.items() if round(v)} for k, dias in elem.items()}, nomes, linhas


def compactar_elementos(elem, completos):
    """{(GND, elemento): {dia: empenhado}} -> {GND: {elemento: [acumulado no ano ao fim de cada mês completo]}}."""
    saida = {}
    for (g, el), dias in elem.items():
        serie = [sum(v for d, v in dias.items() if int(d[5:7]) <= m) for m in range(1, completos + 1)]
        if any(serie):
            saida.setdefault(g, {})[el] = serie
    return saida


def compactar(dados):
    """{GND: {dia: [e, l, p]}} -> acumulado no ano ao fim de cada mês completo e até o último dia disponível."""
    ultimo = max((d for g in dados.values() for d in g), default="")
    # um mês só é completo se há lançamento em data posterior ao seu último dia (ou se o ano acabou)
    completos = 12 if ultimo[5:] >= "12-30" else int(ultimo[5:7]) - 1
    meses = {}
    ate = {}
    for g, dias in dados.items():
        meses[g] = [[sum(v[i] for d, v in dias.items() if int(d[5:7]) <= m) for i in range(3)] for m in range(1, completos + 1)]
        ate[g] = [sum(v[i] for v in dias.values()) for i in range(3)]
    return {"ultimo_dia": ultimo, "meses_completos": completos, "gnd": meses, "ate_ultimo_dia": ate}


def main():
    hoje = date.today()
    anos = [int(a) for a in sys.argv[1:]] or [hoje.year - 1, hoje.year]
    ids = orc.recursos()
    saida = json.loads(SAIDA.read_text(encoding="utf-8")) if SAIDA.exists() else {"anos": {}}
    saida.setdefault("anos", {})
    base = json.loads((RAIZ / "data" / "orcamento.json").read_text(encoding="utf-8"))
    saida["conferencia"] = saida.get("conferencia", {})
    for ano in anos:
        nome = f"Despesas-{ano}.csv"
        if nome not in ids:
            print(f"{nome}: não encontrado, ignorado", file=sys.stderr)
            continue
        t0 = time.time()
        dados, elem, nomes_el, n = agregar(orc.url_recurso(ids[nome], nome))
        saida["anos"][str(ano)] = compactar(dados)
        if ano >= hoje.year - 1:
            saida["anos"][str(ano)]["elementos"] = compactar_elementos(elem, saida["anos"][str(ano)]["meses_completos"])
            saida.setdefault("nomes_elemento", {}).update(nomes_el)
        ultimo = max((d for g in dados.values() for d in g), default="")
        print(f"{ano}: {n} lançamentos, último dia {ultimo}, {time.time() - t0:.0f} s", file=sys.stderr)
        # conferência contra o orçamento (empenhado por GND, ano inteiro)
        ref = defaultdict(float)
        for l in base["anos"].get(str(ano), {}).get("linhas", []):
            ref[l[3]] += l[9]
        conf = {}
        for g, dias in dados.items():
            soma = sum(v[0] for v in dias.values())
            if ref.get(g):
                conf[g] = round(soma / ref[g] - 1, 5)
        saida["conferencia"][str(ano)] = {"ultimo_dia": ultimo, "empenhado_x_orcamento": conf}
    saida["fonte"] = "Portal de Dados Abertos do ES, Despesas-AAAA.csv: valores empenhado, liquidado e pago por dia e GND, em reais"
    saida["coletado_em"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)}: {SAIDA.stat().st_size / 1e3:.0f} kB", file=sys.stderr)


if __name__ == "__main__":
    main()
