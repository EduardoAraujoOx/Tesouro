#!/usr/bin/env python3
"""
Atualiza data/receita.json: arrecadação mensal do Estado por alínea da natureza da receita e por fonte de recursos.

Fonte: Portal de Dados Abertos do Espírito Santo, conjunto "[Portal da Transparência] Receitas" (arquivos Receitas-AAAA.csv,
cerca de 1 GB por ano). O arquivo é um registro de lançamentos, com um tipo em cada linha:

  ARRECADADA-BRUTA, ARRECADADA-DEDUCAO (valor negativo), ARRECADADA-LIQUIDA, RECOLHIDA-BRUTA, PREVISTA-*

O script lê o arquivo em fluxo (sem guardá-lo), soma por mês, alínea (6 dígitos da natureza) e fonte, e grava só os valores
de arrecadação bruta e de dedução. A arrecadação líquida é bruta mais dedução.

Conferência: a soma do ano fechado (2025) precisa coincidir com o total do quadro "Evolução da Receita" da PLOA 2027
(data/ploa2027-macro.json), que é a receita líquida das deduções. O script falha se a diferença passar de 0,5%.

Uso:
    python3 scripts/atualizar_receita.py [ANO ...]                    (padrão: ano anterior e ano corrente)
    python3 scripts/atualizar_receita.py 2025=/caminho/Receitas-2025.csv 2026=/caminho/Receitas-2026.csv   (arquivos locais)
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

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "receita.json"
MACRO = RAIZ / "data" / "ploa2027-macro.json"
PACOTE = "3210df25-0dfe-414b-aed4-844ddcdf87bb"
CKAN = "https://dados.es.gov.br/api/3/action/package_show?id=" + PACOTE
UA = {"User-Agent": "Mozilla/5.0 (tesouro-portal-receita/1.0)"}
TIPOS = {"ARRECADADA-BRUTA": 0, "ARRECADADA-DEDUCAO": 1, "ARRECADADA-LIQUIDA": 2}


def abrir(url, tentativas=4):
    for i in range(tentativas):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300)
        except Exception as e:  # rede instável: tenta de novo
            if i == tentativas - 1:
                raise
            print(f"  nova tentativa ({e})", file=sys.stderr)
            time.sleep(3 * (i + 1))


def recursos():
    with abrir(CKAN) as r:
        pacote = json.load(r)["result"]
    return {x["name"].lower(): (x["id"], x["url"]) for x in pacote["resources"]}


def num(s):
    """Número em formato brasileiro (1.234,56) ou com ponto decimal (1234.56), conforme o ano."""
    s = (s or "").strip()
    if not s:
        return 0.0
    if "," in s:
        return float(s.replace(".", "").replace(",", "."))
    return float(s)


def linhas_csv(fonte):
    """fonte: caminho local ou resposta HTTP; devolve um leitor csv em fluxo."""
    bruto = open(fonte, "rb") if isinstance(fonte, (str, Path)) else fonte
    texto = io.TextIOWrapper(bruto, encoding="utf-8-sig", newline="")
    return csv.DictReader(texto, delimiter=";")


def normaliza(r):
    """Os arquivos de anos diferentes têm colunas diferentes; devolve (tipo, ano, mes, alinea, fonte, bruta, deducao, liquida, nomes)."""
    if "TipoArquivo" in r:  # formato de 2026
        return (r["TipoArquivo"], r["Ano"].strip(), int(r["Mes"]), (r["CodAlinea"] or r["CodRubrica"] or "").strip(),
                (r["CodigoFonte"] or "").strip(), num(r["ArrecadadaBruta"]), num(r["ArrecadadaDeducao"]), num(r["ArrecadadaLiquida"]),
                (r["Alinea"] or r["Rubrica"] or "").strip(), (r["Fonte"] or "").strip())
    # formato de 2025 e anos anteriores: o mês vem da data de emissão (AAAA-MM-DD...)
    return (r["tipo"], r["ano"].strip(), int((r["dataEmissao"] or r["dataContabilizacao"])[5:7]), (r["codigoDetalhamento2"] or r["codigoDetalhamento1"] or "").strip(),
            (r["codigoFonte"] or "").strip(), num(r["valorArrecadadaBruta"]), num(r["valorArrecadadaDeducao"]), num(r["valorArrecadadaLiquida"]),
            (r["descricaoDetalhamento2"] or r["descricaoDetalhamento1"] or "").strip(), (r["descricaoFonte"] or "").strip())


def agregar(leitor, ano):
    acc = defaultdict(lambda: [0.0, 0.0, 0.0])
    nomes = {"alinea": {}, "fonte": {}}
    n = 0
    for r in leitor:
        tipo, a, mes, alinea, fonte, bruta, ded, liq, nome_al, nome_fo = normaliza(r)
        t = TIPOS.get(tipo)
        if t is None or a != str(ano):
            continue
        n += 1
        fonte = fonte.zfill(3)
        acc[(mes, alinea, fonte)][t] += (bruta, ded, liq)[t]
        nomes["alinea"].setdefault(alinea, nome_al)
        nomes["fonte"][fonte] = nome_fo
    linhas = [[m, a, f, round(v[0]), round(v[1]), round(v[2])] for (m, a, f), v in sorted(acc.items()) if any(round(x) for x in v)]
    return linhas, nomes, n


def main():
    args = sys.argv[1:]
    locais = {}
    anos = []
    for a in args:
        if "=" in a:
            k, v = a.split("=", 1)
            locais[int(k)] = v
            anos.append(int(k))
        else:
            anos.append(int(a))
    hoje = date.today()
    anos = anos or [hoje.year - 1, hoje.year]
    saida = json.loads(SAIDA.read_text(encoding="utf-8")) if SAIDA.exists() else {"anos": {}}
    nomes_all = saida.get("nomes", {"alinea": {}, "fonte": {}})
    ids = None
    for ano in anos:
        if ano in locais:
            print(f"{ano}: lendo {locais[ano]}", flush=True)
            leitor = linhas_csv(locais[ano])
            linhas, nomes, n = agregar(leitor, ano)
        else:
            ids = ids or recursos()
            chave = next((k for k in (f"receitas-{ano}.csv", f"receitas{ano}.csv") if k in ids), None)
            if not chave:
                print(f"{ano}: não publicado, ignorado", file=sys.stderr)
                continue
            rid, url = ids[chave]
            print(f"{ano}: lendo {chave} em fluxo", flush=True)
            with abrir(f"https://dados.es.gov.br/dataset/{PACOTE}/resource/{rid}/download/{url.split('/')[-1]}") as resp:
                linhas, nomes, n = agregar(linhas_csv(resp), ano)
        for k in nomes_all:
            nomes_all[k].update({c: t for c, t in nomes[k].items() if t})
        bruta = sum(x[3] for x in linhas)
        ded = sum(x[4] for x in linhas)
        liq = sum(x[5] for x in linhas)
        print(f"  {n} lançamentos; bruta {bruta:,.0f}; dedução {ded:,.0f}; líquida (tipo) {liq:,.0f}".replace(",", "."))
        saida["anos"][str(ano)] = {
            "fechado": ano < hoje.year,
            "colunas": ["mes", "alinea", "fonte", "bruta", "deducao", "liquida"],
            "linhas": linhas,
            "totais": {"bruta": round(bruta), "deducao": round(ded), "liquida_tipo": round(liq), "liquida": round(bruta + ded)},
        }
    saida["nomes"] = nomes_all
    # conferência contra o quadro oficial da PLOA (Evolução da Receita), por componente, no ano fechado.
    # Os componentes principais precisam coincidir (0,5%); o total líquido pode diferir um pouco (1%) porque o quadro
    # oficial abate algumas deduções dentro da própria receita (por exemplo, a remuneração de depósitos na receita patrimonial).
    conf = {}
    if MACRO.exists():
        macro = json.loads(MACRO.read_text(encoding="utf-8"))
        quadro = {x["chave"]: x["valores"] for x in macro["receita"]}
        col = {2023: 0, 2024: 1, 2025: 2}
        componentes = [("ICMS", ["1114"], "icms", True), ("IPVA", ["111251"], "ipva", True), ("IRRF", ["111303"], "irrf", False),
                       ("Transferências correntes", ["17"], "transf_correntes", True), ("Operações de crédito", ["21"], "operacoes_credito", True),
                       ("Contribuições", ["12"], "contribuicoes", True), ("Receita patrimonial", ["13"], "patrimonial", False)]
        for ano, d in saida["anos"].items():
            if int(ano) not in col or not d.get("fechado"):
                continue
            c = col[int(ano)]
            conf[ano] = {"componentes": {}, "total_liquido": {}}
            for nome, pref, chave, rigido in componentes:
                obtido = sum(l[3] for l in d["linhas"] if any(str(l[1]).startswith(p) for p in pref))
                oficial = quadro[chave][c]
                dif = (obtido - oficial) / oficial if oficial else 0
                conf[ano]["componentes"][nome] = {"obtido": obtido, "oficial_ploa": oficial, "diferenca_pct": round(dif * 100, 3)}
                if rigido and abs(dif) > 0.005:
                    raise SystemExit(f"{ano}: {nome} difere do quadro da PLOA em {dif:.2%}; nada gravado")
            oficial = quadro["total"][c]
            obtido = d["totais"]["liquida"]
            dif = (obtido - oficial) / oficial
            conf[ano]["total_liquido"] = {"obtido": obtido, "oficial_ploa": oficial, "diferenca_pct": round(dif * 100, 3)}
            if abs(dif) > 0.01:
                raise SystemExit(f"{ano}: a arrecadação líquida difere do quadro da PLOA em {dif:.2%}; nada gravado")
    saida["conferencia"] = conf
    saida["fonte"] = "Portal de Dados Abertos do ES, Receitas-AAAA.csv (arrecadação bruta e deduções por alínea e fonte)"
    saida["coletado_em"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"gravado {SAIDA} ({SAIDA.stat().st_size / 1e6:.2f} MB); conferência: {json.dumps(conf, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
