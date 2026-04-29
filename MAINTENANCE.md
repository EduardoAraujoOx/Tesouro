# Manutenção do Sistema — Tesouro App

Documento de referência técnica para continuidade da manutenção. Criado para economizar contexto em sessões futuras do Claude.

---

## 1. Por que a geração das páginas foi feita no frontend?

### O que foi feito

As páginas `dashboard`, `historico` e `memoria` usam `'use client'` com `useState` + `useEffect` + `fetch` para buscar dados em tempo de execução:

```tsx
// app/(protected)/dashboard/page.tsx
'use client'
const [rows, setRows] = useState<FinancialLineData[]>([])
useEffect(() => { fetchData(period) }, [period])
async function fetchData(month?: string) { ... }
```

### Por que foi necessário (justificativa técnica)

O Next.js 14 App Router permite Server Components que buscam dados diretamente no servidor sem `useState`/`fetch` no cliente. A escolha pelo padrão client-side foi motivada por:

1. **Estado interativo obrigatório**: O `dashboard` tem dois estados que exigem reatividade no cliente:
   - `mode` — alterna entre Modo Executivo e Modo Técnico sem nova requisição ao servidor.
   - `period` — ao trocar o mês, refaz o fetch para `/api/dashboard?month=X`. Com Server Component puro, isso exigiria URL params + full re-render de servidor.

2. **`memoria/page.tsx`** também seleciona linhas dinamicamente (`useState<LineData | null>`), impossível em Server Component.

3. **`historico/page.tsx`** tem ação de `DELETE` com estado de loading por item, que exige client-side.

### O que poderia ser melhorado (padrão híbrido)

O **carregamento inicial** poderia ser feito no servidor para eliminar o flash de "Carregando dados..." na primeira visita:

```tsx
// Versão melhorada (híbrida)
// app/(protected)/dashboard/page.tsx — Server Component
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage({ searchParams }) {
  const month = searchParams?.month
  const data = await fetchDashboardData(month) // fetch direto no servidor
  return <DashboardClient initialData={data} />
}
```

O Client Component receberia `initialData` como prop e evitaria o loading state inicial, mantendo a interatividade de troca de período e modo. Custo de implementação: médio — requer refatorar cada página para separar Server/Client layers.

---

## 2. Resultado do `npm audit` — Vulnerabilidades

Executado em 29/04/2026. Total: **14 vulnerabilidades (9 moderate, 3 high, 2 critical)**.

### Críticas (2)

| Pacote | Versão afetada | CVEs | Fix |
|--------|---------------|------|-----|
| `mysql2` | `<= 3.9.7` | RCE via `readCodeFor`, Prototype Pollution x3, Cache Poisoning | `npm audit fix` |

**Origem**: `mysql2` → `typeorm` → `@types/next-auth`. O pacote `@types/next-auth` puxa `typeorm` como dependência indireta.

**Ação recomendada**: Remover `@types/next-auth` do `package.json` (é um pacote de tipos de versão antiga, obsoleto desde next-auth v4+). O projeto já usa `next-auth@^4.24.14` que inclui seus próprios tipos.

```bash
npm uninstall @types/next-auth
```

### High (3)

| Pacote | Versão afetada | CVEs | Fix |
|--------|---------------|------|-----|
| `next` | `>= 9.3.4-canary.0` | DoS via Image Optimizer, HTTP smuggling em rewrites, unbounded disk cache | `npm audit fix --force` → instala `next@16.2.4` |
| `xlsx` | `*` (todas) | Prototype Pollution, ReDoS | **Sem fix disponível** |

**Ação recomendada para `xlsx`**: O pacote `xlsx` (SheetJS Community) está abandonado e sem patch de segurança. O projeto já tem `exceljs` instalado como dependência. Migrar as operações de leitura/escrita de `.xlsx` para `exceljs`.

Arquivo afetado: `lib/importers/sigefesParser.ts` — verificar uso de `xlsx` e planejar migração para `exceljs`.

### Moderate (9)

| Pacote | CVE resumida | Fix |
|--------|-------------|-----|
| `@hono/node-server < 1.19.13` | Middleware bypass via repeated slashes | Requer `prisma@6.19.3` (breaking change) |
| `jose < 2.0.7` | Resource exhaustion em JWE comprimido | `npm audit fix` |
| `postcss < 8.5.10` | XSS via `</style>` no CSS stringify | Junto com upgrade do Next.js |
| `uuid < 14.0.0` | Buffer bounds check ausente em v3/v5/v6 | Breaking change em next-auth ou exceljs |
| `xml2js < 0.5.0` | Prototype pollution | `npm audit fix` |

### Plano de ação priorizado

```bash
# Passo 1 — remover causa raiz das críticas
npm uninstall @types/next-auth

# Passo 2 — fixes não-breaking
npm audit fix

# Passo 3 — upgrade Next.js (breaking, requer testes)
npm audit fix --force   # instala next@16.2.4

# Passo 4 — migrar xlsx → exceljs (sem fix disponível)
# (planejamento separado — ver seção 4)
```

---

## 3. Por que Next.js 14 e não 16?

### Situação atual

O projeto usa `next@14.2.35` (package.json). A versão mais recente disponível é `next@16.2.4`.

### Por que foi construído em Next.js 14

Provavelmente foi a versão LTS estável no início do projeto. Next.js 14 foi lançado em outubro de 2023 e incluiu:
- App Router estável
- Server Actions (beta → stable)
- Partial Prerendering (experimental)

### Por que upgradar para Next.js 16

O próprio `npm audit` recomenda `next@16.2.4` para corrigir as vulnerabilidades **high** de DoS e HTTP smuggling. Além disso:

| Feature | Next.js 14 | Next.js 15/16 |
|---------|-----------|--------------|
| React | 18 | 19 (suporte completo) |
| `params` em Server Components | síncrono | assíncrono (breaking) |
| Turbopack | experimental | estável (dev muito mais rápido) |
| `next/image` remotePatterns | array simples | suporte a hostname wildcards |
| Cache padrão | agressivo (fetch cached) | sem cache por padrão (mais previsível) |
| `cookies()`/`headers()` | síncrono | assíncrono (breaking) |

### Breaking changes relevantes para este projeto

1. **`params` e `searchParams` em page/layout**: devem ser `await`-ados em Next.js 15+.
   ```tsx
   // Antes (Next.js 14)
   export default function Page({ params }) { ... }
   // Depois (Next.js 15+)
   export default async function Page({ params }) {
     const { slug } = await params
   }
   ```
   *Impacto no projeto*: baixo — páginas atuais são Client Components e não usam `params` de Server Components.

2. **`cookies()` e `headers()`**: tornaram-se assíncronos. O projeto os usa em `authOptions.ts` indiretamente via `getServerSession`. Provável impacto nas rotas de API.

3. **Cache de `fetch`**: Next.js 15 removeu o cache padrão de `fetch`. Bom para este projeto — os dados do dashboard precisam ser sempre frescos.

### Recomendação

Fazer o upgrade com cuidado:
```bash
npm install next@latest react@latest react-dom@latest
# Executar o codemod de migração:
npx @next/codemod@latest upgrade latest
```

---

## 4. Pontos de aprimoramento para eficiência do sistema

### 4.1 Requisições duplicadas ao `/api/dashboard`

`dashboard/page.tsx` e `memoria/page.tsx` fazem fetch independente para o mesmo endpoint. Se o usuário abre as duas páginas na mesma sessão, são 2 chamadas ao banco. 

**Solução simples**: Cache no cliente com `SWR` ou `React Query`. Ambos deduplicalm requisições idênticas feitas em curto intervalo.

```bash
npm install swr
```

```tsx
import useSWR from 'swr'
const { data, isLoading } = useSWR('/api/dashboard', fetcher)
```

### 4.2 `MONTH_LABELS` hardcoded no dashboard

```tsx
// dashboard/page.tsx — linha 7
const MONTH_LABELS: Record<string, string> = {
  '2026-02': 'Fev/2026',
  '2026-03': 'Mar/2026',
  // ...
}
```

Quando o sistema entrar em 2027, novos meses não terão label. A função `monthLabel` em `historico/page.tsx` já resolve isso corretamente com `split('-')`. **Unificar** num utilitário compartilhado em `lib/utils/formatMonth.ts`:

```ts
export function monthLabel(m: string): string {
  const NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [year, month] = m.split('-')
  return `${NAMES[parseInt(month) - 1]}/${year}`
}
```

### 4.3 Ausência de tratamento de erro nas requisições

Os fetches não tratam erros HTTP (status 4xx/5xx):

```tsx
// Padrão atual — silencia erros
const res = await fetch(url)
const data = await res.json()  // explode se res for 401/500
```

**Adicionar verificação mínima**:
```tsx
if (!res.ok) throw new Error(`HTTP ${res.status}`)
```

### 4.4 `computeExecutiveColumns` recalculado a cada render

Em `memoria/page.tsx`, `computeExecutiveColumns` é chamado diretamente no corpo da função de render (`renderMemoria()`), sem memoização. Se a página re-renderizar por qualquer motivo com o mesmo `selected`, o cálculo é repetido.

**Solução**: `useMemo` no valor calculado:
```tsx
const ec = useMemo(
  () => selected ? computeExecutiveColumns({ ... }) : null,
  [selected]
)
```

### 4.5 Migração de `xlsx` para `exceljs` (segurança + manutenção)

O pacote `xlsx` (SheetJS Community) tem vulnerabilidades críticas sem fix disponível e está praticamente abandonado. O projeto já tem `exceljs` instalado.

Arquivo a migrar: `lib/importers/sigefesParser.ts`

```bash
# Após migração:
npm uninstall xlsx
```

### 4.6 Prisma versão desatualizada

O projeto usa `prisma@^7.8.0`, mas o adapter `@hono/node-server` dentro do prisma dev chain tem vulnerabilidade moderate. O fix requer `prisma@6.19.3` — o que é um **downgrade**, o que provavelmente significa que o `^7.x` do package.json é uma versão alfa/dev (`>=6.20.0-dev.1`). Verificar se está usando a versão estável correta:

```bash
npx prisma --version
```

### 4.7 URL de período como search param (melhor UX + SEO)

Hoje a troca de período no dashboard é estado interno React. Se o usuário recarregar a página, volta para o mês mais recente. Usar URL search params manteria o contexto:

```
/dashboard?month=2026-03
```

Com Next.js App Router, isso é `useRouter` + `useSearchParams` no Client Component, ou `searchParams` no Server Component.

---

## Resumo das ações por prioridade

| # | Ação | Impacto | Esforço | Urgência |
|---|------|---------|---------|---------|
| 1 | Remover `@types/next-auth` (elimina 2 críticas) | Alta | Baixo | Alta |
| 2 | `npm audit fix` (jose, xml2js) | Média | Baixo | Alta |
| 3 | Upgrade Next.js 14 → 16 (elimina 3 high) | Alta | Médio | Média |
| 4 | Migrar `xlsx` → `exceljs` (sem fix) | Alta | Médio | Média |
| 5 | Unificar `monthLabel` em `lib/utils` | Baixa | Baixo | Baixa |
| 6 | Adicionar tratamento de erro nos fetches | Média | Baixo | Baixa |
| 7 | `useMemo` em `computeExecutiveColumns` | Baixa | Baixo | Baixa |
| 8 | Padrão híbrido Server/Client para data inicial | Média | Alto | Baixa |
| 9 | Usar URL search params para período | Baixa | Médio | Baixa |
