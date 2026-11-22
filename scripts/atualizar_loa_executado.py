#!/usr/bin/env python3
"""
Atualiza data/loa-executado.json: despesa do Estado por ano, do orçamento inicial (LOA) ao empenhado.

Fonte: Portal de Dados Abertos do Espírito Santo, conjunto "[Portal da Transparência] Despesas, execução orçamentária e
financeira", arquivos OrcamentosExecucoes-AAAA.csv (consolidado por unidade gestora, pequeno). Soma, por ano,
ValorOrcadoInicial (dotação inicial da LOA), ValorOrcado (dotação atualizada), ValorEmpenho, ValorLiquidado e ValorPago.

Conferência: para os anos que já estão em data/orcamento.json (detalhado por ação), a dotação inicial precisa coincidir
ao centavo; o script falha se não coincidir.

Uso:
    python3 scripts/atualizar_loa_executado.py [ANO ...]      (padrão: 2019 até o ano corrente)
"""
import csv
import importlib.util
import io
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "loa-executado.json"
spec = importlib.util.spec_from_file_location("ao", RAIZ / "scripts" / "atualizar_orcamento.py")
ao = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ao)
CAMPOS = ("ValorOrcadoInicial", "ValorOrcado", "ValorEmpenho", "ValorLiquidado", "ValorPago")
CHAVES = ("dotacao_inicial", "dotacao_atualizada", "empenhado", "liquidado", "pago")


def main():
    anos = [int(a) for a in sys.argv[1:]] or list(range(2019, date.today().year + 1))
    ids = ao.recursos()
    saida = {"anos": {}}
    for ano in anos:
        nome = f"OrcamentosExecucoes-{ano}.csv"
        with ao.abrir(ao.url_recurso(ids[nome], nome)) as r:
            texto = r.read().decode("utf-8-sig")
        tot = [0.0] * 5
        for x in csv.DictReader(io.StringIO(texto), delimiter=";"):
            for i, c in enumerate(CAMPOS):
                tot[i] += ao.br(x[c])
        saida["anos"][str(ano)] = dict(zip(CHAVES, (round(v) for v in tot)))
        print(ano, {k: f"{v / 1e9:.3f} bi" for k, v in saida["anos"][str(ano)].items()})
    orc = json.loads((RAIZ / "data" / "orcamento.json").read_text(encoding="utf-8"))["anos"]
    for ano, d in orc.items():
        if ano in saida["anos"]:
            ini = sum(l[7] for l in d["linhas"])
            dif = abs(ini - saida["anos"][ano]["dotacao_inicial"])
            if dif > 1:
                sys.exit(f"dotação inicial de {ano} não confere com data/orcamento.json (diferença de R$ {dif:,.0f})")
    saida["fonte"] = "Portal de Dados Abertos do ES, Despesas: OrcamentosExecucoes-AAAA.csv (consolidado por unidade gestora)"
    saida["coletado_em"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
