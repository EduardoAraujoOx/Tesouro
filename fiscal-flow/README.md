# Radar de Execução e Fluxo de Caixa

Este módulo acompanha sinais públicos de pressão de caixa e reprogramação de pagamentos do Estado do Espírito Santo a partir do Portal de Dados Abertos.

## Objetivo

O foco é separar quatro fenômenos distintos:

1. aumento normal do estoque entre liquidação e pagamento;
2. aceleração da execução orçamentária;
3. reprogramação seletiva de desembolsos;
4. restrição mais ampla de caixa.

O Portal da Transparência continua sendo a fonte de verdade. O repositório guarda apenas código, metadados e agregados pequenos. As bases brutas não devem ser versionadas aqui.

## Fontes públicas

### Execução orçamentária por unidade gestora

Recurso corrente de 2026:

- `OrcamentosExecucoes-2026.csv`
- resource id: `240f70ca-c810-442b-bade-bb0ea3280880`
- origem: Portal de Dados Abertos do Espírito Santo

Indicadores principais:

- liquidado;
- pago;
- gap = liquidado - pago;
- gap relativo = gap / liquidado;
- concentração do gap por unidade gestora.

### Ordem cronológica de pagamentos

Recurso corrente de 2026:

- resource id: `8bff110c-0f80-4eff-bc79-503a752bf923`

Campos utilizados:

- `CodigoUg`;
- `UnidadeGestora`;
- `CodigoNL`;
- `DataEmissaoNL`;
- `CodigoOB`;
- `DataEmissaoOB`;
- `ValorOB`.

A base contém detalhamentos repetidos do mesmo pagamento. Para evitar dupla contagem, a unidade de pagamento é deduplicada pela chave:

`CodigoUg + CodigoNL + CodigoOB + ValorOB`.

O prazo de pagamento é definido como:

`DataEmissaoOB - DataEmissaoNL`, em dias corridos.

São calculados mediana, P75, P90, P95 e proporções acima de 15 e 30 dias.

## Limitação central

Na extração de 18/09/2026, todos os registros da base de ordem cronológica possuíam `DataEmissaoOB`. Portanto, essa fonte descreve pagamentos que efetivamente chegaram à ordem bancária, mas não permite observar diretamente obrigações liquidadas que continuam sem pagamento.

Isso gera censura à direita para a pergunta de interesse: um aumento do estoque liquidado e não pago pode ocorrer sem aumento do prazo entre NL e OB entre os pagamentos que conseguiram ser concluídos.

Por isso, a leitura correta combina:

1. estoque agregado `liquidado - pago`;
2. distribuição do prazo dos pagamentos concluídos;
3. concentração do estoque por UG;
4. em etapa posterior, idade das liquidações ainda não pagas na base detalhada de despesas.

## Estrutura

```text
fiscal-flow/
  scripts/
    collect_fiscal_flow.py
  data/
    snapshots/
      YYYY-MM-DD/
        execution_summary.csv
        execution_top_gaps.csv
        payment_lag_monthly.csv
        metadata.json
```

## Execução

O coletor usa apenas a biblioteca padrão do Python:

```bash
python fiscal-flow/scripts/collect_fiscal_flow.py
```

Por padrão, o snapshot é gravado na data da execução. Para fixar a data da pasta:

```bash
SNAPSHOT_DATE=2026-09-18 python fiscal-flow/scripts/collect_fiscal_flow.py
```

## Interpretação

Um aumento do gap liquidado-pago, isoladamente, não prova insuficiência de caixa. O diagnóstico exige observar simultaneamente receita, disponibilidade por fonte, programação financeira e composição das despesas.

Este módulo é uma camada de evidência pública e reprodutível para orientar essa investigação.
