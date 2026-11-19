#!/usr/bin/env python3
"""
Atualiza data/orcamento.json: dotação e execução da despesa do Estado, por unidade orçamentária, programa, ação,
grupo de natureza da despesa (GND) e fonte de recursos.

Fonte: Portal de Dados Abertos do Espírito Santo, conjunto "[Portal da Transparência] Despesas, execução orçamentária
e financeira" (arquivos OrcamentosDespesa-AAAA.csv). O arquivo traz uma linha por combinação de classificações (e,
quando há favorecido, por pagamento); os cinco valores de cada linha são somados sem nenhuma outra transformação:

  dotação inicial, dotação atualizada, empenhado, liquidado, pago.

Conferência: o total de cada ano é comparado ao consolidado por unidade gestora (OrcamentosExecucoes-AAAA.csv). A
dotação inicial e a atualizada precisam coincidir ao centavo; o empenhado e o liquidado do ano em curso podem diferir
levemente porque os dois arquivos são atualizados em horários diferentes. O resultado da conferência fica em
`conferencia` no próprio JSON, e o script falha se a dotação não bater.

Para guardar só o necessário, o arquivo bruto (≈ 45 MB por ano) é lido em fluxo e descartado; o JSON final traz valores
inteiros em reais.

Uso:
    python3 scripts/atualizar_orcamento.py [ANO ...]      (padrão: ano anterior e ano corrente)
"""
import csv
import io
import json
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "orcamento.json"
PACOTE = "99e16b13-0e6f-4504-8544-00de842ab1fd"
CKAN = "https://dados.es.gov.br/api/3/action/package_show?id=" + PACOTE
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-orcamento/1.0)"}
VALORES = ("DotacaoInicial", "DotacaoAtualizada", "DespesaEmpenhada", "DespesaLiquidada", "DespesaPaga")


def abrir(url, tentativas=4, espera=3):
    for i in range(tentativas):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=240)
        except Exception as e:  # rede instável: tenta de novo
            if i == tentativas - 1:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)
            time.sleep(espera * (i + 1))


def recursos():
    with abrir(CKAN) as r:
        pacote = json.load(r)["result"]
    return {x["name"]: x["id"] for x in pacote["resources"]}


def url_recurso(rid, nome):
    return f"https://dados.es.gov.br/dataset/{PACOTE}/resource/{rid}/download/{nome.lower()}"


def baixar(url):
    """Baixa para arquivo temporário (o arquivo é grande demais para guardar em memória sem necessidade)."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    with abrir(url) as r:
        while True:
            bloco = r.read(1 << 20)
            if not bloco:
                break
            tmp.write(bloco)
    tmp.close()
    return Path(tmp.name)


def br(s):
    s = (s or "").strip()
    return float(s.replace(".", "").replace(",", ".")) if s else 0.0


def cod(s, n):
    s = (s or "").strip()
    return s.zfill(n) if s.isdigit() else s


def agregar(caminho):
    """Soma os cinco valores por (UO, programa, ação, GND, fonte). Devolve linhas, dicionários de nomes e totais."""
    acc = defaultdict(lambda: [0.0] * 5)
    nomes = {"uo": {}, "programa": {}, "acao": {}, "fonte": {}, "gnd": {}, "funcao": {}}
    total = [0.0] * 5
    n = 0
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f, delimiter=";"):
            n += 1
            uo = cod(r["UnidadeOrcamentaria"], 5)
            prog = cod(r["CodigoPrograma"], 4)
            acao = cod(r["CodigoAcao"], 4)
            gnd = (r["CodigoGrupoDespesa"] or "").strip()
            fonte = cod(r["CodigoFonte"], 3)
            nomes["uo"][uo] = (r["NomeUnidadeOrcamentaria"] or "").strip()
            nomes["programa"][prog] = (r["Programa"] or "").strip()
            nomes["acao"][acao] = (r["Acao"] or "").strip()
            nomes["fonte"][fonte] = (r["Fonte"] or "").strip()
            nomes["gnd"][gnd] = (r["GrupoDespesa"] or "").strip()
            nomes["funcao"][cod(r["CodigoFuncao"], 2)] = (r["Funcao"] or "").strip()
            v = [br(r[c]) for c in VALORES]
            linha = acc[(uo, prog, acao, gnd, fonte, cod(r["CodigoFuncao"], 2), cod(r["CodigoSubFuncao"], 3))]
            for i in range(5):
                linha[i] += v[i]
                total[i] += v[i]
    linhas = []
    for k, v in sorted(acc.items()):
        vals = [round(x) for x in v]
        if any(vals):
            linhas.append(list(k) + vals)
    return linhas, nomes, total, n


def consolidado(rid, nome, ano):
    with abrir(url_recurso(rid, nome)) as r:
        texto = r.read().decode("utf-8-sig")
    tot = [0.0] * 5
    for x in csv.DictReader(io.StringIO(texto), delimiter=";"):
        for i, c in enumerate(("ValorOrcadoInicial", "ValorOrcado", "ValorEmpenho", "ValorLiquidado", "ValorPago")):
            tot[i] += br(x[c])
    return tot


def main():
    hoje = date.today()
    anos = [int(a) for a in sys.argv[1:]] or [hoje.year - 1, hoje.year]
    ids = recursos()
    saida = json.loads(SAIDA.read_text(encoding="utf-8")) if SAIDA.exists() else {"anos": {}}
    saida.setdefault("anos", {})
    nomes_all = saida.get("nomes", {"uo": {}, "programa": {}, "acao": {}, "fonte": {}, "gnd": {}, "funcao": {}})
    saida["conferencia"] = saida.get("conferencia", {})
    for ano in anos:
        nome = f"OrcamentosDespesa-{ano}.csv"
        if nome not in ids:
            print(f"{nome}: não publicado, ano ignorado", file=sys.stderr)
            continue
        print(f"{ano}: baixando {nome}", flush=True)
        caminho = baixar(url_recurso(ids[nome], nome))
        try:
            linhas, nomes, total, n = agregar(caminho)
        finally:
            caminho.unlink(missing_ok=True)
        for k, d in nomes.items():
            nomes_all.setdefault(k, {}).update({c: t for c, t in d.items() if t})
        ref = consolidado(ids[f"OrcamentosExecucoes-{ano}.csv"], f"OrcamentosExecucoes-{ano}.csv", ano)
        dif = [round(total[i] - ref[i], 2) for i in range(5)]
        conf = {"linhas_brutas": n, "total_detalhe": [round(x) for x in total], "total_consolidado": [round(x) for x in ref],
                "diferenca": dif}
        saida["conferencia"][str(ano)] = conf
        if abs(dif[0]) > 1 or abs(dif[1]) > 1:
            raise SystemExit(f"{ano}: a dotação do detalhe não bate com o consolidado (diferença {dif[:2]}); JSON não atualizado")
        saida["anos"][str(ano)] = {
            "fechado": ano < hoje.year,
            "colunas": ["uo", "programa", "acao", "gnd", "fonte", "funcao", "subfuncao", "dotacao_inicial", "dotacao_atualizada",
                        "empenhado", "liquidado", "pago"],
            "linhas": linhas,
        }
        print(f"  {len(linhas)} linhas; dotação inicial {total[0]:,.0f}; empenhado {total[2]:,.0f}".replace(",", "."))
    saida["nomes"] = nomes_all
    saida["fonte"] = "Portal de Dados Abertos do ES, Despesas: OrcamentosDespesa-AAAA.csv (conferido com OrcamentosExecucoes-AAAA.csv)"
    saida["coletado_em"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"gravado {SAIDA} ({SAIDA.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
