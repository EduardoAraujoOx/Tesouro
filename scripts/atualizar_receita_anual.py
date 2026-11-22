#!/usr/bin/env python3
"""
Atualiza data/receita-anual.json: arrecadação líquida de deduções do Estado, por ano, em fluxo a partir de Receitas-AAAA.csv.

Fonte: Portal de Dados Abertos do Espírito Santo, conjunto "[Portal da Transparência] Receitas" (o mesmo de atualizar_receita.py,
cujas funções de leitura são reutilizadas). Soma, no ano, ARRECADADA-BRUTA e ARRECADADA-DEDUCAO; a líquida é a soma das duas.

Conferência: os anos 2023 a 2025 são comparados à receita total do quadro "Evolução da Receita" da PLOA 2027
(data/ploa2027-macro.json); o script falha se a diferença passar de 1%.

Uso:
    python3 scripts/atualizar_receita_anual.py [ANO ...]      (padrão: 2022 até o ano anterior)

Os arquivos de 2021 e anteriores têm outro leiaute (livro contábil com débito e crédito, sem colunas de arrecadação
bruta e dedução) e não são lidos por este script.
"""
import importlib.util
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "receita-anual.json"
spec = importlib.util.spec_from_file_location("ar", RAIZ / "scripts" / "atualizar_receita.py")
ar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ar)


def liquida(ano, ids):
    chave = next((k for k in (f"receitas-{ano}.csv", f"receitas{ano}.csv") if k in ids), None)
    if not chave:
        sys.exit(f"{ano}: arquivo não publicado")
    rid, url = ids[chave]
    bruta = ded = 0.0
    with ar.abrir(f"https://dados.es.gov.br/dataset/{ar.PACOTE}/resource/{rid}/download/{url.split('/')[-1]}") as resp:
        for r in ar.linhas_csv(resp):
            tipo, a, _m, _al, _f, b, d, _l, _n, _nf = ar.normaliza(r)
            if a != str(ano):
                continue
            if tipo == "ARRECADADA-BRUTA":
                bruta += b
            elif tipo == "ARRECADADA-DEDUCAO":
                ded += d
    return round(bruta), round(ded)


def main():
    anos = [int(a) for a in sys.argv[1:]] or list(range(2022, date.today().year))
    saida = json.loads(SAIDA.read_text(encoding="utf-8")) if SAIDA.exists() else {"anos": {}}
    ids = ar.recursos()
    macro = json.loads(ar.MACRO.read_text(encoding="utf-8"))
    total = {x["chave"]: x["valores"] for x in macro["receita"]}["total"]
    col = {2023: 0, 2024: 1, 2025: 2}
    for ano in anos:
        print(f"{ano}: lendo em fluxo", flush=True)
        b, d = liquida(ano, ids)
        liq = b + d
        print(f"  bruta {b / 1e9:.3f} bi; dedução {d / 1e9:.3f} bi; líquida {liq / 1e9:.3f} bi", flush=True)
        if ano in col and abs(liq / total[col[ano]] - 1) > 0.01:
            sys.exit(f"{ano}: líquida {liq:,.0f} difere do quadro da PLOA ({total[col[ano]]:,.0f}) em mais de 1%")
        saida["anos"][str(ano)] = {"bruta": b, "deducao": d, "liquida": liq}
        saida["fonte"] = "Portal de Dados Abertos do ES, Receitas (ARRECADADA-BRUTA e ARRECADADA-DEDUCAO)"
        saida["coletado_em"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
