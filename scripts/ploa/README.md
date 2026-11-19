# Extração da PLOA 2027 (Programa de Trabalho)

O Programa de Trabalho do projeto de lei orçamentária (Mensagem nº 189/2026, páginas 200 a 275 do arquivo da Secretaria de Planejamento) é publicado como **PDF digitalizado**: cada página é uma imagem, sem texto. Estes scripts leem a tabela por reconhecimento óptico de caracteres (OCR) e só aceitam um número quando ele fecha as somas impressas no próprio documento. O resultado é `data/ploa2027.json`; o relatório de tudo o que foi corrigido automaticamente fica em `data/ploa2027-auditoria.json`.

## Como reproduzir

Requisitos: `poppler-utils` (pdftoppm), `tesseract-ocr` com o idioma `por`, Python 3 com `numpy` e `Pillow`.

```bash
PDF=ploa-2027-mensagem-texto-complemento-e-anexo.pdf     # SHA-256 c90e69353555bd645b6f5ee19fb0ff0bbc6995edaedffcb81297dbb47d02b830
python3 scripts/ploa/ocr_celulas.py "$PDF" /tmp/ploa/pages 200 275        # 1) OCR por célula da grade (≈ 20 min em 4 núcleos)
python3 scripts/ploa/refaz_cabecalhos.py "$PDF" /tmp/ploa/pages 200 275   # 2) relê o título das células de cabeçalho de duas linhas
ORC_REF=data/orcamento.json python3 scripts/ploa/montar_ploa.py /tmp/ploa/pages 200 275 /tmp/ploa/montagem.json   # 3) monta e confere
python3 scripts/ploa/exporta_ploa.py /tmp/ploa/montagem.json              # 4) grava data/ploa2027.json (falha se o total não fechar)
```

`data/orcamento.json` (coletado por `scripts/atualizar_orcamento.py`) serve de dicionário de códigos e nomes de unidades, programas, ações e fontes, que têm a mesma numeração nos dois anos.

## O que é conferido

1. A soma das linhas de cada ação é igual ao total da ação impresso (631 de 631 ações).
2. A soma das ações de cada programa, dos programas de cada unidade e das unidades de cada órgão é igual ao total impresso (nenhuma divergência).
3. A soma de todos os órgãos é igual ao **total geral impresso na página 186**: R$ 35.426.564.064.
4. Para cada unidade, a soma por GND e fonte é igual ao Resumo geral do órgão (108 de 108 unidades).
5. Controle independente: reservas, Fundo Estadual de Saúde, Transcol e Fundap coincidem, ao real, com o quadro extraído do Detalhamento das Dotações (ver `painel-es/fontes/ploa/README.md`).

Quando uma leitura de OCR erra um dígito (por exemplo 3 por 5 ou 8 por 3), a combinação de leituras que faz fechar o total impresso é a escolhida; trocas de um dígito por confusão visual conhecida só são tentadas quando as leituras do OCR não fecham.

## Limites

- A PLOA é a proposta original; a LOA aprovada pode diferir por emendas.
- O documento traz o grupo de natureza da despesa (GND), não o elemento.
- Em 251 das 1.366 linhas o GND ou a fonte foi atribuído pelo Resumo geral da unidade, e não lido diretamente. A soma por unidade, GND e fonte é exata, mas a distribuição entre linhas de mesmo valor dentro da unidade pode estar trocada.
- Função e subfunção não são lidas do PDF (a leitura por OCR dessas duas colunas coincide com 2026 em apenas 82% dos casos): vêm da base de 2026 e ficam em branco nas 18 chaves novas.
- Ao trocar a PLOA pela LOA, repetir o procedimento com o novo documento; os conferes pelas somas impressas continuam valendo.
