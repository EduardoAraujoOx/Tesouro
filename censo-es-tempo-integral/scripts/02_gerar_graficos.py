"""Gera gráficos a partir da tabela processada do Censo Escolar."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
TABELA_PATH = BASE_DIR / "outputs" / "tabelas" / "es_af_tempo_integral_2015_2025.csv"
GRAFICOS_DIR = BASE_DIR / "outputs" / "graficos"
GRAFICOS_DIR.mkdir(parents=True, exist_ok=True)


def salvar_linha(df: pd.DataFrame, x: str, y: str, titulo: str, ylabel: str, filename: str) -> None:
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.plot(df[x], df[y], marker="o")
    ax.set_title(titulo)
    ax.set_xlabel("Ano")
    ax.set_ylabel(ylabel)
    ax.grid(True, axis="y", alpha=0.3)
    ax.set_xticks(df[x].tolist())
    fig.tight_layout()
    fig.savefig(GRAFICOS_DIR / filename, dpi=200)
    plt.close(fig)


def main() -> None:
    if not TABELA_PATH.exists():
        raise FileNotFoundError(
            f"Tabela não encontrada: {TABELA_PATH}. Rode 01_processar_censo_es.py antes."
        )

    df = pd.read_csv(TABELA_PATH)

    salvar_linha(
        df,
        "ano",
        "escolas_estaduais_com_af_integral",
        "Escolas estaduais com Anos Finais em tempo integral no ES",
        "Número de escolas",
        "escolas_estaduais_af_integral.png",
    )

    salvar_linha(
        df,
        "ano",
        "matriculas_estaduais_af_integral",
        "Matrículas estaduais nos Anos Finais em tempo integral no ES",
        "Número de matrículas",
        "matriculas_estaduais_af_integral.png",
    )

    salvar_linha(
        df,
        "ano",
        "pct_matriculas_estaduais_af_integral",
        "% de matrículas estaduais dos Anos Finais em tempo integral no ES",
        "% das matrículas",
        "pct_matriculas_estaduais_af_integral.png",
    )

    print(f"Gráficos salvos em {GRAFICOS_DIR}")


if __name__ == "__main__":
    main()
