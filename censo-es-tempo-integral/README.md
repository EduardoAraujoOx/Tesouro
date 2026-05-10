# Censo ES Tempo Integral

Projeto reprodutível para calcular, a partir dos microdados do Censo Escolar do INEP, a evolução das escolas com matrículas em tempo integral nos Anos Finais do Ensino Fundamental no Espírito Santo, de 2015 a 2025.

O objetivo imediato é gerar evidências para a proposta de pesquisa sobre Educação Integral em Tempo Integral nos Anos Finais do Ensino Fundamental no Espírito Santo.

## Indicador principal

A escola é classificada como ofertante de tempo integral nos Anos Finais quando apresenta:

```text
SG_UF = "ES"
QT_MAT_FUND_AF_INT > 0
```

A separação por dependência administrativa segue o padrão do Censo Escolar:

```text
1 = Federal
2 = Estadual
3 = Municipal
4 = Privada
```

A tabela principal apresenta, para cada ano:

- escolas públicas com Anos Finais em tempo integral;
- escolas estaduais com Anos Finais em tempo integral;
- escolas municipais com Anos Finais em tempo integral;
- matrículas estaduais nos Anos Finais em tempo integral;
- percentual de escolas estaduais com Anos Finais em tempo integral;
- percentual de matrículas estaduais dos Anos Finais em tempo integral.

## Estrutura

```text
censo-es-tempo-integral/
  README.md
  requirements.txt
  scripts/
    01_processar_censo_es.py
    02_gerar_graficos.py
  outputs/
    tabelas/
    graficos/
```

Os arquivos em `outputs/` são gerados automaticamente pela rotina.

## Como rodar localmente

Instale as dependências:

```bash
pip install -r censo-es-tempo-integral/requirements.txt
```

Execute o processamento:

```bash
python censo-es-tempo-integral/scripts/01_processar_censo_es.py
python censo-es-tempo-integral/scripts/02_gerar_graficos.py
```

## Como rodar pelo GitHub Actions

O workflow `Rodar Censo ES Tempo Integral` pode ser executado manualmente na aba **Actions** do GitHub. Ele baixa os microdados do INEP, processa os arquivos, gera as tabelas e publica os resultados como artefato.

## Arquivos de saída

A rotina gera:

```text
outputs/tabelas/es_af_tempo_integral_2015_2025.csv
outputs/tabelas/es_af_tempo_integral_2015_2025.xlsx
outputs/graficos/escolas_estaduais_af_integral.png
outputs/graficos/matriculas_estaduais_af_integral.png
```

## Observação metodológica

O Censo Escolar permite reconstruir a evolução observada da oferta declarada de matrículas em tempo integral nos Anos Finais. Para fins de avaliação causal, o ano efetivo de entrada das escolas no programa estadual deve ser validado com registros administrativos da SEDU, pois a informação censitária identifica oferta declarada, mas não necessariamente todos os detalhes administrativos da adesão ao modelo estadual.
