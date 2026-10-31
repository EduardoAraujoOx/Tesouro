# Portal do Tesouro Estadual – Espírito Santo

Portal público do Tesouro Estadual (SEFAZ-ES): transparência fiscal, publicações, dívida pública,
transferências aos municípios e orientações para gestores. Substitui o sistema interno do Art. 42 da LRF
que ocupava este repositório; aquele sistema está preservado no branch
[`legacy/radar-fiscal-art42`](../../tree/legacy/radar-fiscal-art42).

## Como funciona

O site é **estático** (Next.js 15 + Tailwind), sem banco de dados e sem login. Os documentos continuam
hospedados no site oficial da SEFAZ (`sefaz.es.gov.br`), que é a fonte de referência; o portal mantém apenas
um **índice** em `data/acervo.json` (≈ 500 documentos) e aponta para os arquivos originais.

| Rota | Conteúdo |
|---|---|
| `/` | Página inicial (hero, acesso rápido, destaques, notícias, orientações) |
| `/publicacoes` | Acervo completo com busca, filtro por tipo e por ano (`?tipo=` e `?q=` na URL) |
| `/servicos` | "Finanças": serviços e orientações para órgãos, gestores e servidores |
| `/sobre` | O que o Tesouro publica e onde encontrar cada coisa |

## Atualizar o acervo

```bash
npm run acervo        # python3 scripts/atualizar_acervo.py (só biblioteca padrão)
git add data/acervo.json && git commit -m "Atualiza acervo"
```

Atenção: a data exibida pela SEFAZ em cada linha é a de **atualização do arquivo**, não a do período de
referência. Por isso o portal ordena e destaca pelo período (`ano` + `periodo`) e rotula a data como
"Atualizado em". Páginas da SEFAZ que o script ainda não lê: *Execução Financeira* e *MCONT* (links diretos).

## Desenvolvimento

```bash
npm install
npm run dev           # http://localhost:3000
npm run build && npm start
```

## Identidade visual e acessibilidade

Tokens em `tailwind.config.ts` / `app/globals.css` (azul-marinho `#082B57`; azul-claro `#39B5E8` e rosa `#F28AB2`
apenas como acento gráfico, nunca como cor de texto). Fontes autohospedadas (`@fontsource`), sem requisições a
terceiros. Recursos: link "ir para o conteúdo", alto contraste, A−/A/A+ (persistidos), foco visível, navegação
por teclado, `lang="pt-BR"`. Auditoria `axe-core` (WCAG 2.1 A/AA) sem violações nas 4 rotas, em desktop e celular,
nos modos normal e alto contraste.

## Pendências de conteúdo (validar com a Subsecretaria / ASCOM)

- **Fotos**: a imagem do hero é uma ilustração gerada por IA, fornecida pela equipe do projeto; as demais vêm do Wikimedia Commons (domínio público). Créditos em `/creditos`. Para trocar qualquer foto, substitua o arquivo em `public/img/`.
- **Brasão e logomarca**: uso institucional a aprovar; arquivo em `public/img/logo-tesouro-estadual.png`.
- **"Orientação Orçamentária"** aponta hoje para *Execução Financeira* na SEFAZ; confirmar o destino correto.
- **Texto institucional** ("Conheça o Tesouro") é só um mapa do portal; faltam texto e competências oficiais.
- **Menu**: segue o mockup. "Política Fiscal" leva aos relatórios fiscais (RREO/RGF); a área de serviços para gestores ("Finanças") fica em `/servicos`, acessível por "Orientação Financeira" e pelo mapa em `/sobre`.
- **E-mail do Tesouro**: o mockup trazia um endereço fictício; o rodapé usa o telefone e o endereço reais da SEFAZ.
- **Domínio de produção** sob `es.gov.br`: depende de SEFAZ/Prodest. Em `*.vercel.app` o site serve para homologação.
- **Estatísticas de acesso**: `@vercel/analytics` está incluído; ative *Web Analytics* no projeto do Vercel.
