"""Processa microdados do Censo Escolar para o Espírito Santo.

Calcula, de 2015 a 2025, o número de escolas com matrículas em tempo
integral nos Anos Finais do Ensino Fundamental, separando redes pública,
estadual e municipal.

A rotina baixa os ZIPs oficiais do INEP, identifica o CSV principal de
escolas, filtra Espírito Santo e gera arquivos CSV e XLSX em outputs/tabelas.
"""

from __future__ import annotations

import logging
import re
import zipfile
from io import BytesIO
from pathlib import Path

import pandas as pd
import requests


BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = BASE_DIR / "outputs" / "tabelas"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ANOS = list(range(2015, 2026))

URLS = {
    2015: "https://download.inep.gov.br/microdados/micro_censo_escolar_2015.zip",
    2016: "https://download.inep.gov.br/microdados/micro_censo_escolar_2016.zip",
    2017: "https://download.inep.gov.br/microdados/micro_censo_escolar_2017.zip",
    2018: "https://download.inep.gov.br/microdados/micro_censo_escolar_2018.zip",
    2019: "https://download.inep.gov.br/microdados/micro_censo_escolar_2019.zip",
    2020: "https://download.inep.gov.br/microdados/micro_censo_escolar_2020.zip",
    2021: "https://download.inep.gov.br/microdados/micro_censo_escolar_2021.zip",
    2022: "https://download.inep.gov.br/microdados/micro_censo_escolar_2022.zip",
    2023: "https://download.inep.gov.br/microdados/micro_censo_escolar_2023.zip",
    2024: "https://download.inep.gov.br/microdados/micro_censo_escolar_2024.zip",
    2025: "https://download.inep.gov.br/microdados/micro_censo_escolar_2025.zip",
}

# Alguns anos do INEP já apareceram com caminhos alternativos. A rotina testa
# estes caminhos caso o endereço principal falhe.
URLS_ALTERNATIVAS = {
    ano: [
        f"https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_{ano}.zip",
        f"https://download.inep.gov.br/dados_abertos/microdados/microdados_censo_escolar_{ano}.zip",
        f"https://download.inep.gov.br/microdados/microdados_censo_escolar_{ano}.zip",
    ]
    for ano in ANOS
}
URLS_ALTERNATIVAS[2025].append(
    "https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_2025_.zip"
)


def baixar_zip(ano: int) -> bytes:
    """Baixa o ZIP do Censo Escolar para um ano."""
    urls = [URLS[ano], *URLS_ALTERNATIVAS.get(ano, [])]
    ultimo_erro: Exception | None = None

    for url in urls:
        try:
            logging.info("Baixando %s: %s", ano, url)
            resp = requests.get(url, timeout=180)
            resp.raise_for_status()
            if len(resp.content) < 1_000_000:
                raise ValueError("arquivo baixado parece pequeno demais")
            return resp.content
        except Exception as exc:  # noqa: BLE001
            ultimo_erro = exc
            logging.warning("Falha no download de %s por %s: %s", ano, url, exc)

    raise RuntimeError(f"Não foi possível baixar o Censo Escolar {ano}") from ultimo_erro


def localizar_csv_principal(zf: zipfile.ZipFile) -> str:
    """Localiza o CSV principal de escolas/educação básica dentro do ZIP."""
    nomes = zf.namelist()
    csvs = [n for n in nomes if n.lower().endswith(".csv")]

    # Preferir arquivos típicos dos microdados recentes.
    padroes_preferidos = [
        r"microdados_ed_basica.*\.csv$",
        r"microdados_educacao_basica.*\.csv$",
        r"escolas.*\.csv$",
    ]

    for padrao in padroes_preferidos:
        candidatos = [n for n in csvs if re.search(padrao, n.lower())]
        if candidatos:
            return sorted(candidatos, key=len)[0]

    if len(csvs) == 1:
        return csvs[0]

    raise ValueError(f"CSV principal não encontrado. CSVs disponíveis: {csvs[:10]}")


def ler_csv_do_zip(zip_bytes: bytes) -> pd.DataFrame:
    """Lê o CSV principal do ZIP como DataFrame."""
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        csv_name = localizar_csv_principal(zf)
        logging.info("CSV principal localizado: %s", csv_name)
        with zf.open(csv_name) as f:
            return pd.read_csv(f, sep=";", encoding="latin1", low_memory=False)


def normalizar_colunas(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.upper() for c in df.columns]
    return df


def coluna_existente(df: pd.DataFrame, candidatos: list[str]) -> str:
    for col in candidatos:
        if col in df.columns:
            return col
    raise KeyError(f"Nenhuma das colunas esperadas existe: {candidatos}")


def processar_ano(ano: int) -> dict[str, int | float]:
    zip_bytes = baixar_zip(ano)
    df = normalizar_colunas(ler_csv_do_zip(zip_bytes))

    col_uf = coluna_existente(df, ["SG_UF", "CO_UF"])
    col_dep = coluna_existente(df, ["TP_DEPENDENCIA"])
    col_af = coluna_existente(df, ["QT_MAT_FUND_AF"])
    col_af_int = coluna_existente(df, ["QT_MAT_FUND_AF_INT"])

    if col_uf == "SG_UF":
        df_es = df[df[col_uf].astype(str).str.upper() == "ES"].copy()
    else:
        df_es = df[pd.to_numeric(df[col_uf], errors="coerce") == 32].copy()

    for col in [col_dep, col_af, col_af_int]:
        df_es[col] = pd.to_numeric(df_es[col], errors="coerce").fillna(0)

    tem_af = df_es[col_af] > 0
    tem_af_integral = df_es[col_af_int] > 0
    publicas = df_es[col_dep].isin([1, 2, 3])
    estaduais = df_es[col_dep] == 2
    municipais = df_es[col_dep] == 3

    out = {
        "ano": ano,
        "escolas_publicas_com_af": int((publicas & tem_af).sum()),
        "escolas_publicas_com_af_integral": int((publicas & tem_af & tem_af_integral).sum()),
        "escolas_estaduais_com_af": int((estaduais & tem_af).sum()),
        "escolas_estaduais_com_af_integral": int((estaduais & tem_af & tem_af_integral).sum()),
        "escolas_municipais_com_af": int((municipais & tem_af).sum()),
        "escolas_municipais_com_af_integral": int((municipais & tem_af & tem_af_integral).sum()),
        "matriculas_publicas_af": int(df_es.loc[publicas & tem_af, col_af].sum()),
        "matriculas_publicas_af_integral": int(df_es.loc[publicas & tem_af, col_af_int].sum()),
        "matriculas_estaduais_af": int(df_es.loc[estaduais & tem_af, col_af].sum()),
        "matriculas_estaduais_af_integral": int(df_es.loc[estaduais & tem_af, col_af_int].sum()),
        "matriculas_municipais_af": int(df_es.loc[municipais & tem_af, col_af].sum()),
        "matriculas_municipais_af_integral": int(df_es.loc[municipais & tem_af, col_af_int].sum()),
    }

    return out


def adicionar_percentuais(tabela: pd.DataFrame) -> pd.DataFrame:
    tabela = tabela.copy()

    def pct(num: str, den: str) -> pd.Series:
        return (tabela[num] / tabela[den].replace({0: pd.NA}) * 100).round(1)

    tabela["pct_escolas_publicas_af_integral"] = pct(
        "escolas_publicas_com_af_integral", "escolas_publicas_com_af"
    )
    tabela["pct_escolas_estaduais_af_integral"] = pct(
        "escolas_estaduais_com_af_integral", "escolas_estaduais_com_af"
    )
    tabela["pct_escolas_municipais_af_integral"] = pct(
        "escolas_municipais_com_af_integral", "escolas_municipais_com_af"
    )
    tabela["pct_matriculas_estaduais_af_integral"] = pct(
        "matriculas_estaduais_af_integral", "matriculas_estaduais_af"
    )
    tabela["pct_matriculas_municipais_af_integral"] = pct(
        "matriculas_municipais_af_integral", "matriculas_municipais_af"
    )
    return tabela


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    resultados = []
    erros = []

    for ano in ANOS:
        try:
            resultados.append(processar_ano(ano))
        except Exception as exc:  # noqa: BLE001
            logging.exception("Erro ao processar %s", ano)
            erros.append({"ano": ano, "erro": str(exc)})

    if not resultados:
        raise RuntimeError("Nenhum ano foi processado com sucesso.")

    tabela = adicionar_percentuais(pd.DataFrame(resultados).sort_values("ano"))

    csv_path = OUTPUT_DIR / "es_af_tempo_integral_2015_2025.csv"
    xlsx_path = OUTPUT_DIR / "es_af_tempo_integral_2015_2025.xlsx"
    tabela.to_csv(csv_path, index=False, encoding="utf-8-sig")
    tabela.to_excel(xlsx_path, index=False)

    if erros:
        pd.DataFrame(erros).to_csv(OUTPUT_DIR / "erros_processamento.csv", index=False, encoding="utf-8-sig")

    logging.info("Tabela salva em %s", csv_path)
    logging.info("Tabela salva em %s", xlsx_path)
    print(tabela.to_string(index=False))


if __name__ == "__main__":
    main()
