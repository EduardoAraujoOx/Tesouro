# Disponibilidade Financeira Líquida — Poder Executivo ES

> Sistema web interno da **SEFAZ-ES / Subsecretaria do Tesouro Estadual** para monitoramento mensal da suficiência de caixa do Poder Executivo do Espírito Santo, em conformidade com o **Art. 42 da Lei de Responsabilidade Fiscal**.

---

## Visão geral

O sistema consolida, em tempo real, três fontes de dados fiscais — base SIGEFES, arrecadação prevista (SUBSET) e pressões orçamentárias (SEP) — e gera um painel executivo de 7 colunas derivadas com farol de suficiência por fonte de recurso. O resultado é exportável em PDF institucional e Excel analítico, com rastreabilidade completa de cada importação.

### Painel executivo

| Coluna | Descrição | Origem SIGEFES |
|---|---|---|
| 1 — Caixa bruto | Disponibilidade bruta de referência | Col I |
| 2 — Obrigações | Compromissos já assumidos | Col II + III + IV |
| 3 — Caixa líquido | Posição líquida atual | Col V |
| 4 — Arrecadação prevista | Entrada esperada até o encerramento | Col VI (ajuste SUBSET) |
| 5 — Total disponível | Caixa líquido + arrecadação | Col VII |
| 6 — Pressões futuras | Demandas de despesa mapeadas | Col VIII + IX (ajuste SEP) |
| **7 — Saldo Art. 42** | **Col 5 − Col 6** | Resultado final |

**Farol de suficiência** calculado automaticamente por linha:

- Verde — Saldo ≥ 0 e ≥ 10 % do caixa bruto
- Amarelo — Saldo ≥ 0, mas abaixo de 10 %
- Vermelho — Saldo negativo
- Cinza — Arrecadação ou pressão pendentes de input manual

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5 (strict) |
| ORM | Prisma 7 com `@prisma/adapter-pg` |
| Banco de dados | PostgreSQL via Supabase (Transaction Pooler) |
| Autenticação | NextAuth v4 — Credentials + bcryptjs |
| Exportação PDF | HTML server-side formatado para `window.print()` |
| Exportação Excel | ExcelJS — 2 abas: Radar Fiscal + Colunas Técnicas |
| Deploy | Vercel (Edge Network) |
| Segurança | HTTP Security Headers (CSP, HSTS, X-Frame-Options…) |

---

## Arquitetura de módulos

```
app/
├── (auth)/login/          # Página de autenticação
├── (protected)/
│   ├── dashboard/         # Painel executivo principal
│   ├── insercao/
│   │   ├── upload/        # Upload da planilha SIGEFES (.xlsx)
│   │   ├── arrecadacao/   # Input manual — Col VI (SUBSET)
│   │   └── pressoes/      # Input manual — Col IX (SEP)
│   ├── historico/         # Histórico de importações e exportações
│   ├── memoria/           # Memória de cálculo + glossário das colunas
│   └── admin/usuarios/    # Gestão de usuários (ADMIN only)
api/
├── auth/                  # NextAuth handlers
├── sigefes/               # Upload + parsing da planilha SIGEFES
├── arrecadacao/           # CRUD Col VI por fonte de recurso
├── pressoes/              # CRUD Col IX por fonte de recurso
├── dashboard/             # Dados consolidados do painel
├── historico/             # Listagem de uploads e exportações
├── export/
│   ├── pdf/               # HTML formatado para impressão/PDF
│   └── excel/             # Arquivo .xlsx com ExcelJS
└── admin/usuarios/        # CRUD de usuários (somente ADMIN)

components/
├── financial/             # Tabela executiva + badge de farol
├── input/                 # Formulários de arrecadação e pressões
├── layout/                # Sidebar + HeaderBar responsivos
├── memoria/               # Componentes de memória de cálculo
└── ui/                    # Primitivos reutilizáveis

lib/
├── auth/                  # Configuração NextAuth + authOptions
├── calculations/          # computeExecutiveColumns + computeTrafficLight
├── db/                    # Cliente Prisma singleton com adapter-pg
├── excel/                 # Parser da planilha SIGEFES
└── importers/             # Lógica de importação e deduplicação
```

---

## Modelo de dados

```
SigefesUpload      — registro de cada importação (monthRef, isLatest)
  └── FinancialLine  — linhas hierárquicas com colunas I–XII + ajustes manuais
ManualArrecadacao  — overrides de Col VI por fonte (SUBSET)
ManualPressao      — overrides de Col IX por fonte (SEP)
PdfExport          — log de cada exportação PDF gerada
User               — usuários do sistema (roles: VIEWER / EDITOR / ADMIN)
```

A flag `isLatest = true` garante que o dashboard sempre exibe apenas a importação mais recente por mês de referência, preservando o histórico completo.

---

## Segurança

- **Autenticação obrigatória** em todas as rotas protegidas via NextAuth middleware
- **RBAC**: `VIEWER` (leitura), `EDITOR` (uploads e inputs manuais), `ADMIN` (gestão de usuários)
- **HTTP Security Headers** aplicados globalmente via `next.config.mjs`:
  - `Content-Security-Policy` — permite apenas origens explicitamente autorizadas
  - `Strict-Transport-Security` — HTTPS forçado por 2 anos, elegível para preload list
  - `X-Frame-Options: SAMEORIGIN` — impede clickjacking
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy` — desativa câmera, microfone e geolocalização
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## Setup local

### Pré-requisitos

- Node.js ≥ 20
- Banco PostgreSQL (Supabase ou local)

### Instalação

```bash
git clone https://github.com/eduardoaraujoox/tesouro
cd tesouro
npm install
```

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
DATABASE_URL="postgresql://..."    # Supabase Transaction Pooler (porta 6543)
NEXTAUTH_SECRET="..."              # String aleatória para assinar sessões JWT
NEXTAUTH_URL="http://localhost:3000"
```

### Banco de dados

```bash
# Aplica o schema ao banco
npx prisma db push

# Seed com dados de exemplo (opcional)
npx prisma db seed
```

Para Supabase, rode `supabase_setup.sql` diretamente no SQL Editor para criar schema e dados iniciais em uma única execução.

### Desenvolvimento

```bash
npm run dev     # Inicia em http://localhost:3000
npm run build   # Build de produção (prisma generate + next build)
```

---

## Deploy (Vercel)

1. Conecte o repositório no [vercel.com](https://vercel.com)
2. Configure as variáveis de ambiente (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
3. O build command `prisma generate && next build` já está configurado em `package.json`

---

## Contexto institucional

Este sistema foi desenvolvido para a **Subsecretaria do Tesouro Estadual** da Secretaria de Estado da Fazenda do Espírito Santo (SEFAZ-ES), substituindo o controle manual em planilha Excel por monitoramento web em tempo real.

O Art. 42 da LRF veda que o titular de Poder ou órgão, nos últimos dois quadrimestres do mandato, contraia obrigações de despesa que não possam ser cumpridas integralmente dentro do exercício — ou que tenham parcelas a serem pagas no exercício seguinte sem disponibilidade financeira suficiente. Este sistema automatiza a verificação dessa condição, por fonte de recurso, com rastreabilidade de cada importação e input manual realizado.
