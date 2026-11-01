# Portal do Tesouro Estadual do Espírito Santo

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
| `data/indicadores.json` | API do Siconfi (RGF do Poder Executivo, 2019 em diante) e dados abertos da CAPAG (Tesouro Transparente) | painel fiscal: limites da LRF por quadrimestre e notas da CAPAG; gera também `public/dados/*.csv` |
| `data/curadoria-noticias.json` | edição manual | notícias fixadas no início do carrossel (`destaques`, lista de endereços; vazia = as três mais recentes) e correções do tipo de imagem (`foto` ou `arte`) |

Os **PDFs não são copiados**: o portal aponta para o arquivo oficial na SEFAZ, que continua sendo a fonte única
da verdade (evita versões desatualizadas de documentos fiscais e um repositório com gigabytes de arquivos).

| Rota | Conteúdo |
|---|---|
| `/` | Página inicial (hero, carrossel de notícias, acesso rápido, painel fiscal, publicações em destaque, orientações) |
| `/tesouro/[área]` | Uma página para cada área do Tesouro (35), com o texto original e os documentos |
| `/publicacoes` | Busca em todo o acervo, com filtro por tipo e por ano (`?tipo=` e `?q=` na URL) |
| `/indicadores` | Painel fiscal: explorador de séries históricas (escolha de até 3 indicadores e do período, gráfico grande, tabela, CSV e link da escolha), situação atual dos limites da LRF, CAPAG e metodologia |
| `/noticias`, `/noticias/[slug]` | Lista e página de cada notícia do Tesouro, com o texto completo (a fonte original é citada no fim) |
| `/contato` | Fale conosco: formulário para a Subsecretaria, as gerências e as subgerências do Tesouro |
| `/servicos` | "Finanças": serviços e orientações para órgãos, gestores e servidores |
| `/sobre`, `/creditos` | Mapa do portal; créditos das imagens |

## Atualizar o conteúdo

```bash
npm run acervo   # conteúdo (SEFAZ) + notícias + indicadores (Siconfi e CAPAG); só biblioteca padrão (notícias pedem pillow)
git add data && git commit -m "Atualiza conteúdo"
```

Detalhes importantes:

- A data que a SEFAZ mostra em cada linha é a de **atualização do arquivo**, não a do período de referência. O portal
  ordena e destaca pelo período (`ano` + `periodo`, extraídos do título) e rotula a data como "Atualizado em".
- **Painel fiscal**: o script `atualizar_indicadores.py` não recalcula nada além de razões entre valores publicados. A CAPAG de uma edição nova entra sozinha quando o Tesouro Nacional a publica nos dados abertos (a de 2026 ainda não estava lá). O degrau da dívida líquida em 2025 (item "demais haveres financeiros") é um fato do próprio RGF e aparece como nota; confirmar o texto com a Subsecretaria. Limites de dívida e garantias anteriores a 2024 usam o valor fixo das Resoluções do Senado (200% e 22%).
- Para incluir uma página nova do Tesouro, acrescente o endereço em `PAGINAS` (`scripts/atualizar_conteudo.py`).
- A página inicial é conduzida pelas notícias: um único carrossel mostra as três notícias mais recentes (as fixadas em `destaques` vêm primeiro). Rotação a cada 7 s com transição suave, pausa por botão, ao passar o mouse ou com foco de teclado, e sem rotação para quem prefere menos movimento. As três manchetes ficam sempre visíveis como abas. Cada notícia abre dentro do portal, em `/noticias/[slug]`: o coletor baixa o texto completo da matéria na SEFAZ, limpa a formatação herdada do Word e guarda só parágrafos, listas, links e destaques. No fim de cada matéria há o link para a publicação original. Fotos são cortadas; cartões gráficos (`arte`) aparecem inteiros.
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

## Navegação e página inicial

O menu tem seis itens, cada um para uma pergunta diferente: Notícias (o que há de novo), Painel fiscal (como está o Estado), Publicações (onde estão os documentos, agrupados por assunto), Serviços (o que preciso para trabalhar), Institucional (quem somos) e Fale conosco. A definição está em `lib/links.ts` (`menu`). Assuntos como Dívida, Contabilidade e Municípios ficam dentro de Publicações, e não ao lado dela. A página inicial tem um único bloco de notícias (o carrossel de três); a lista completa fica em `/noticias`.

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
- **Notícias**: a seleção usa palavras-chave; a Ascom pode querer um critério editorial próprio. O carrossel da página inicial mostra as três mais recentes.
- **Orientações**: "Orçamentária" leva às Notas Técnicas (SUBSET, ex.: renúncia na estimativa de receita da LOA); "Contábil" ao MCONT; "Financeira" a Execução Financeira. Confirmar se é o destino desejado.
- **Menu**: segue o mockup. "Política Fiscal" leva aos relatórios fiscais (RREO/RGF); a área de serviços para gestores ("Finanças") fica em `/servicos`, acessível por "Orientação Financeira" e pelo mapa em `/sobre`.
- **E-mail do Tesouro**: o mockup trazia um endereço fictício; o rodapé usa o telefone e o endereço reais da SEFAZ.
- **Domínio de produção** sob `es.gov.br`: depende de SEFAZ/Prodest. Em `*.vercel.app` o site serve para homologação.
- **Estatísticas de acesso**: `@vercel/analytics` está incluído; ative *Web Analytics* no projeto do Vercel.

## Estilo de redação

Os textos do portal evitam travessões (o traço longo e o médio): os coletores em `scripts/` trocam o travessão por vírgula, dois-pontos ou parênteses (sigla), e os textos escritos à mão seguem a mesma regra.

## Fale conosco (formulário por área)

O formulário em `/contato` deixa o leitor escolher a Subsecretaria, uma gerência e, se quiser, uma subgerência, e escrever a mensagem. A mensagem segue por e-mail para a área escolhida; **o portal não guarda nada** (apenas encaminha). A rota que recebe o envio é `app/api/contato/route.ts`, com validação, armadilha para robôs (campo escondido e tempo mínimo), limite de envios por endereço e aceitação de origem só do próprio site.

Para ativar o envio, defina na Vercel (Settings, Environment Variables):

| Variável | Para que serve |
|---|---|
| `RESEND_API_KEY` | chave da conta no serviço de e-mail [Resend](https://resend.com) |
| `CONTATO_REMETENTE` | remetente verificado no serviço, por exemplo `Tesouro Estadual <contato@seudominio.gov.br>` |
| `CONTATO_EMAIL_PADRAO` | caixa que recebe as mensagens das áreas sem e-mail próprio (por exemplo, a da Subsecretaria) |

Sem essas variáveis o formulário mostra o aviso "Envio em implantação" e não entrega mensagens. Em desenvolvimento, `CONTATO_MODO_TESTE=1` valida e devolve o protocolo sem enviar nada.

As áreas ficam em `lib/areas.ts`, montadas a partir do Lei nº 12.379/2025 e Decreto nº 6.005-R/2025 (Anexo III e competências). **A estrutura muda por decreto: a Subsecretaria deve validar a lista, revisar os assuntos de cada área e informar o e-mail de cada uma** (campo `email`; sem ele, vale `CONTATO_EMAIL_PADRAO`). Para uma proteção mais forte contra robôs, considere o Vercel BotID ou o Cloudflare Turnstile.
