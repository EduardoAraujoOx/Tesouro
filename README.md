# Portal do Tesouro Estadual – Espírito Santo

Portal público do Tesouro Estadual (SEFAZ-ES): transparência fiscal, publicações, dívida pública,
transferências aos municípios e orientações para gestores. Substitui o sistema interno do Art. 42 da LRF
que ocupava este repositório; aquele sistema está preservado no branch
[`legacy/radar-fiscal-art42`](../../tree/legacy/radar-fiscal-art42).

## Como funciona

O site é **estático** (Next.js 15 + Tailwind), sem banco de dados e sem login. Todo o conteúdo vem de duas
fontes públicas, lidas por scripts e guardadas em `data/`:

| Arquivo | Origem | Conteúdo |
|---|---|---|
| `data/paginas.json` | 35 páginas do Tesouro em `sefaz.es.gov.br` | texto (HTML saneado) e grupos de arquivos de cada área |
| `data/acervo.json` | as mesmas páginas | lista plana dos ≈ 730 arquivos, usada na busca de `/publicacoes` |
| `data/noticias.json` | `sefaz.es.gov.br/noticias` | notícias da SEFAZ filtradas por temas do Tesouro, com imagem reduzida em `public/img/noticias/` (requer `pip install pillow`) |
| `data/curadoria-noticias.json` | edição manual | notícia de capa (`destaque`) e correções do tipo de imagem (`foto` ou `arte`) |

Os **PDFs não são copiados**: o portal aponta para o arquivo oficial na SEFAZ, que continua sendo a fonte única
da verdade (evita versões desatualizadas de documentos fiscais e um repositório com gigabytes de arquivos).

| Rota | Conteúdo |
|---|---|
| `/` | Página inicial (hero, acesso rápido, última notícia, destaques, notícias, orientações) |
| `/tesouro/[área]` | Uma página para cada área do Tesouro (35), com o texto original e os documentos |
| `/publicacoes` | Busca em todo o acervo, com filtro por tipo e por ano (`?tipo=` e `?q=` na URL) |
| `/noticias` | Notícias do Tesouro publicadas pela SEFAZ |
| `/servicos` | "Finanças": serviços e orientações para órgãos, gestores e servidores |
| `/sobre`, `/creditos` | Mapa do portal; créditos das imagens |

## Atualizar o conteúdo

```bash
npm run acervo   # atualizar_conteudo.py (páginas e arquivos) + atualizar_noticias.py (notícias); só biblioteca padrão
git add data && git commit -m "Atualiza conteúdo"
```

Detalhes importantes:

- A data que a SEFAZ mostra em cada linha é a de **atualização do arquivo**, não a do período de referência. O portal
  ordena e destaca pelo período (`ano` + `periodo`, extraídos do título) e rotula a data como "Atualizado em".
- Para incluir uma página nova do Tesouro, acrescente o endereço em `PAGINAS` (`scripts/atualizar_conteudo.py`).
- A página inicial é conduzida pelas notícias: a de capa vem de `destaque` (ou a mais recente), seguida de 3 laterais e 6 em grade. Fotos são cortadas em 16:10; cartões gráficos (`arte`) aparecem inteiros.
- Os reconhecimentos (A+, 1º lugar, nota A) são os citados nas notícias da SEFAZ; se mudarem, edite `Reconhecimentos` em `app/page.tsx`.
- O filtro de notícias está em `PALAVRAS` / `EXCLUIR` (`scripts/atualizar_noticias.py`); ajuste conforme a Ascom preferir.
- O texto das páginas passa por um sanitizador (somente `p`, `ul`, `ol`, `li`, `a`, ênfases); formulários, imagens e
  scripts da SEFAZ não são reproduzidos. Cada página traz o link para a original.

## Desenvolvimento

```bash
npm install
npm run dev           # http://localhost:3000
npm run build && npm start
```

## Tipografia

Duas famílias, com papéis fixos: **Source Serif 4** (voz editorial: hero, títulos de seção, manchetes de notícias,
números dos reconhecimentos; sempre peso 600) e **Inter** (informação e interface: navegação, documentos, textos,
rótulos; pesos 400, 500 e 600). Os tamanhos são 8 degraus nomeados em `tailwind.config.ts` (`text-label` 12,
`text-small` 14, `text-body` 16, `text-lead` 18, `text-title` 20, `text-section` 28, `text-headline` 32 e
`text-display` 44, os dois últimos fluidos, mais `text-numeral`). Não use tamanhos soltos (`text-[…]`) nem `font-bold` em títulos.

## Identidade visual e acessibilidade

Tokens em `tailwind.config.ts` / `app/globals.css` (azul-marinho `#082B57`; azul-claro `#39B5E8` e rosa `#F28AB2`
apenas como acento gráfico, nunca como cor de texto). Fontes autohospedadas (`@fontsource`), sem requisições a
terceiros. Recursos: link "ir para o conteúdo", alto contraste, A−/A/A+ (persistidos), foco visível, navegação
por teclado, `lang="pt-BR"`. Auditoria `axe-core` (WCAG 2.1 A/AA) sem violações nas 4 rotas, em desktop e celular,
nos modos normal e alto contraste.

## Pendências de conteúdo (validar com a Subsecretaria / ASCOM)

- **Fotos**: a imagem do hero é uma ilustração gerada por IA, fornecida pela equipe do projeto; as demais vêm do Wikimedia Commons (domínio público). Créditos em `/creditos`. Para trocar qualquer foto, substitua o arquivo em `public/img/`.
- **Brasão e logomarca**: uso institucional a aprovar; arquivo em `public/img/logo-tesouro-horizontal.png` (versão horizontal, recortada sem margens e com fundo transparente).
- **Texto institucional** ("Conheça o Tesouro") é só um mapa do portal; faltam texto e competências oficiais.
- **Notícias**: a seleção usa palavras-chave; a Ascom pode querer um critério editorial próprio. A faixa "Notícia" abaixo do acesso rápido mostra a mais recente.
- **Orientações**: "Orçamentária" leva às Notas Técnicas (SUBSET, ex.: renúncia na estimativa de receita da LOA); "Contábil" ao MCONT; "Financeira" a Execução Financeira. Confirmar se é o destino desejado.
- **Menu**: segue o mockup. "Política Fiscal" leva aos relatórios fiscais (RREO/RGF); a área de serviços para gestores ("Finanças") fica em `/servicos`, acessível por "Orientação Financeira" e pelo mapa em `/sobre`.
- **E-mail do Tesouro**: o mockup trazia um endereço fictício; o rodapé usa o telefone e o endereço reais da SEFAZ.
- **Domínio de produção** sob `es.gov.br`: depende de SEFAZ/Prodest. Em `*.vercel.app` o site serve para homologação.
- **Estatísticas de acesso**: `@vercel/analytics` está incluído; ative *Web Analytics* no projeto do Vercel.
