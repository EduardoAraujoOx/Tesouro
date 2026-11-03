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
| `data/rreo.json` | API do Siconfi (RREO do Poder Executivo, Anexos 01, 03 e 06, 2019 em diante) | painel fiscal: receita, despesa e investimentos contra previsão e dotação, receita corrente líquida, despesas por função, previdência, caixa dos recursos livres, arrecadação mensal de ICMS, FPE e royalties e IPCA; gera também os CSV `rreo-es`, `caixa-es` e `arrecadacao-es` em `public/dados` |
| `data/minimos.json` | RREO do 6º bimestre publicado pela SEFAZ-ES (PDF, lido com `pdftotext`) | painel fiscal: percentual aplicado em educação (mínimo de 25%) e em saúde (mínimo de 12%); gera `public/dados/minimos-es.csv` |
| `data/indicadores.json` | API do Siconfi (RGF do Poder Executivo, 2019 em diante) e dados abertos da CAPAG (Tesouro Transparente) | painel fiscal: limites da LRF por quadrimestre e notas da CAPAG; gera também `public/dados/*.csv` |
| `data/curadoria-noticias.json` | edição manual | notícias fixadas no início do carrossel (`destaques`, lista de endereços; vazia = as três mais recentes) e correções do tipo de imagem (`foto` ou `arte`) |

Os **PDFs não são copiados**: o portal aponta para o arquivo oficial na SEFAZ, que continua sendo a fonte única
da verdade (evita versões desatualizadas de documentos fiscais e um repositório com gigabytes de arquivos).

| Rota | Conteúdo |
|---|---|
| `/` | Página inicial: abertura com foto de Vitória, indicadores em destaque (CAPAG e limites da LRF, com gráfico e explicação), sete acessos rápidos, publicações recentes, notícias e Tesouro Cidadão |
| `/tesouro/[área]` | Uma página para cada área do Tesouro (35), com o texto original e os documentos |
| `/publicacoes` | Busca em todo o acervo, com filtro por tipo e por ano (`?tipo=` e `?q=` na URL) |
| `/indicadores` | Indicadores fiscais: sete categorias (orçamento, arrecadação, limites da LRF, caixa, CAPAG, previdência e despesas por função), gráfico grande, definições ao lado, correção pelo IPCA, comparação de até 3 indicadores, CSV e link da escolha; metodologia recolhida abaixo |
| `/noticias`, `/noticias/[slug]` | Lista e página de cada notícia do Tesouro, com o texto completo (a fonte original é citada no fim) |
| `/cidadao` | Tesouro Cidadão: números do Balanço Cidadão, perguntas e respostas ligadas aos dados do painel, documentos cidadãos, glossário e ferramentas do Tesouro Nacional |
| `/cidadao/em-busca-do-tesouro` | Leitor das revistinhas e do manual do programa Em Busca do Tesouro (Tesouro Nacional), exibido dentro do portal |
| `/sobre` | Conheça o Tesouro: missão, visão e valores (Mapa Estratégico da SEFAZ), estrutura da Subsecretaria com atalho para escrever a cada área, história e mapa do portal |
| `/contato` | Fale conosco: formulário para a Subsecretaria, as gerências e as subgerências do Tesouro |
| `/servicos` | "Finanças": serviços e orientações para órgãos, gestores e servidores |
| `/creditos` | Créditos das imagens |

## Atualizar o conteúdo

```bash
npm run acervo   # conteúdo (SEFAZ) + notícias + indicadores (Siconfi e CAPAG); só biblioteca padrão (notícias pedem pillow)
git add data && git commit -m "Atualiza conteúdo"
```

Detalhes importantes:

- A data que a SEFAZ mostra em cada linha é a de **atualização do arquivo**, não a do período de referência. O portal
  ordena e destaca pelo período (`ano` + `periodo`, extraídos do título) e rotula a data como "Atualizado em".
- **Painel fiscal**: o script `atualizar_indicadores.py` não recalcula nada além de razões entre valores publicados. A CAPAG de uma edição nova entra sozinha quando o Tesouro Nacional a publica nos dados abertos (a de 2026 ainda não estava lá). O degrau da dívida líquida em 2025 (item "demais haveres financeiros") é um fato do próprio RGF e aparece como nota; confirmar o texto com a Subsecretaria. Limites de dívida e garantias anteriores a 2024 usam o valor fixo das Resoluções do Senado (200% e 22%). Os valores do RREO acumulam no ano: cada barra é o último bimestre disponível do exercício, e o ano em curso aparece com asterisco por ser parcial. O resultado primário e o nominal usam o resultado único até 2022 e o resultado sem RPPS a partir de 2023 (mudança do próprio demonstrativo); as metas são as do Anexo de Metas Fiscais da LDO, reproduzidas no RREO.
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

O menu tem seis itens, cada um para uma pergunta diferente: Início, Indicadores (como está o Estado), Publicações (onde estão os documentos, agrupados por assunto), Serviços e Orientações (o que preciso para trabalhar), O Tesouro (quem somos, Tesouro Cidadão e notícias) e Fale Conosco. A definição está em `lib/links.ts` (`menu`). Os acessos rápidos da página inicial ficam em `acessoRapido`; o destino de Reforma Tributária é provisório (a notícia do ciclo de palestras) até a Subsecretaria definir o conteúdo.

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

## Conteúdo do Tesouro Nacional

O conteúdo do portal gov.br/tesouronacional está sob licença Creative Commons Atribuição-SemDerivações: o portal **linka e descreve com palavras próprias**, sem copiar nem adaptar os textos deles. Os dados abertos (Siconfi, CAPAG) são reutilizados com citação da fonte. O texto de `/cidadao` e de `/sobre` é institucional e deve ser revisado pela Ascom. As revistinhas do Em Busca do Tesouro são exibidas no leitor do próprio Tesouro Nacional (`cdn.tesouro.gov.br`), sem cópia: os personagens são © IMS-Brasil. Por isso a política de segurança (CSP) libera esse endereço **só** na rota `/cidadao/em-busca-do-tesouro` (`next.config.mjs`). Convém pedir à STN a confirmação de que a exibição em portais de terceiros é bem-vinda.

## Atualização automática dos dados

A rotina `.github/workflows/atualizar-dados.yml` roda toda segunda-feira, às 06h17 em Brasília (e pode ser disparada à mão em Actions). Ela executa os cinco coletores (`scripts/atualizar_indicadores.py`, `atualizar_rreo.py`, `atualizar_minimos.py`, `atualizar_noticias.py` e `atualizar_conteudo.py`), ignora mudanças que sejam só a data da coleta, confere que `npm run build` continua passando e, havendo dado novo, abre um PR "Atualização automática de dados" para conferência. Uma falha numa fonte não impede as outras de atualizar, e o PR informa o resultado de cada coleta.

Para que a rotina possa abrir o PR, ative no GitHub, em Settings > Actions > General > Workflow permissions, a opção **Allow GitHub Actions to create and approve pull requests**. Quem quiser publicar sem passar por revisão pode ativar a mesclagem automática (auto-merge) nesses PRs; a recomendação é manter a conferência humana, já que os números são fiscais.

As definições e os textos de cada variável do painel ficam em `data/definicoes-indicadores.json`; os valores vêm dos coletores.
