# SPEC.md — Controle de Disponibilidade Financeira Líquida do Poder Executivo
## SEFAZ-ES / Subsecretaria do Tesouro Estadual
### Para cumprimento do Art. 42 da LRF

> **Documento canônico para implementação via Claude Code.**
> Contém todas as decisões técnicas e de UX validadas no protótipo interativo.
> Implementar na ordem descrita na Seção 20.

---

## 1. VISÃO GERAL

Sistema web interno da SEFAZ-ES para monitoramento mensal da suficiência de caixa do Poder Executivo do ES, com foco no cumprimento do Art. 42 da Lei de Responsabilidade Fiscal.

**Modelo de dados central:** o sistema não trabalha com "rodadas" fechadas por mês. Ele mantém sempre a informação corrente — o estado atual é sempre composto pela versão mais recente de cada uma das três fontes de dados. Cada novo upload de qualquer fonte atualiza apenas o bloco daquela fonte; os demais permanecem como estavam.

**Três fontes de dados:**
1. **Base SIGEFES**: upload manual de planilha .xlsx exportada do SIGEFES-ES. Fornece colunas I a XII; VI e IX chegam sempre zeradas/nulas.
2. **Arrecadação prevista (VI)**: preenchida manualmente pela SUBSET após o upload, por fonte de recurso.
3. **Pressões orçamentárias (IX)**: preenchidas manualmente pela SEP após o upload, por fonte de recurso.

**Saída principal:** painel executivo de 7 colunas derivadas + farol de suficiência por linha, exportável em PDF e Excel.

---

## 2. MODELO DE DADOS — PLANILHA SIGEFES

### 2.1 Estrutura do arquivo

Arquivo: `controle_art42_reestruturado_v2.xlsx` (referência inspecionada)
- Aba lida pelo parser: `Planilha 1` (sempre a primeira aba)
- Linha 1: "Governo do Estado do Espírito Santo"
- Linha 2: título do relatório
- Linha 3: "Posição: DD/MM/YYYY" — extrai data de referência
- Linha 4: cabeçalhos das colunas (ver 2.2)
- Linhas 5+: dados hierárquicos (ver 2.3)
- Última linha: rodapé SIGEFES (ignorar)

### 2.2 Cabeçalhos oficiais das colunas (índices 0-based no Excel)

| Índice | Chave | Nome oficial completo |
|--------|-------|----------------------|
| 0 | label | Poder Executivo (rótulo da linha) |
| 1 | I | Disponibilidade Financeira Bruta (I) |
| 2 | II | Obrigações Financeiras (II) |
| 3 | III | Obrigações Assumidas sem Autorização Orçamentária para fins da LRF (III) |
| 4 | IV | Crédito Empenhado a Liquidar (IV) |
| 5 | V | Disponibilidade Líquida (após o abatimento de todas as obrigações e compromissos financeiros) (V = I - II - III - IV) |
| 6 | VI | Previsão de Arrecadação a Realizar por Fonte de Recursos (VI) — **SEMPRE NULO NO IMPORT** |
| 7 | VII | Disponibilidade de Caixa para Assunção de Novas Obrigações (VII = V + VI) — **0 no import** |
| 8 | VIII | Cota Orçamentária Liberada a Empenhar (VIII) |
| 9 | IX | Pressões Orçamentárias Identificadas Não Computadas Anteriormente (IX) — **SEMPRE NULO NO IMPORT** |
| 10 | X | Disponibilidade de Caixa após a Dedução da Cota Orçamentária Liberada a Empenhar e das Pressões Orçamentárias (X = VII - VIII - IX) — **0 no import** |
| 11 | XI | Cota Orçamentária a Fixar - Disponível para Movimentação (XI) |
| 12 | XII | Cota Orçamentária Bloqueada (XII) |
| 13 | — | Ignorar (coluna extra sem conteúdo) |

**CRÍTICO:** VI e IX chegam como `None`/nulo do SIGEFES (tratar como 0). VII e X chegam como 0 (recalcular após preenchimento de VI e IX).

### 2.3 Hierarquia de linhas (29 linhas — estrutura fixa do SIGEFES-ES)

```
RECURSOS ADMINISTRADOS PELO TESOURO (I)                    [grupo, level=0]
   Recursos Não Vinculados de Impostos                      [detalhe, level=1]
   Outros Recursos Não Vinculados - Administração Direta    [detalhe]
   Outros Recursos Não Vinculados - Precatórios - Ação Civil Originária 2178  [detalhe]
   Recursos Não Vinculados da Compesação de Impostos        [detalhe]
   Royalties do Petróleo - Destinação Não Vinculada         [detalhe]
   Recursos de Operações de Crédito - Reembolso de Despesas Executadas com Recurso do Tesouro  [detalhe]
DEMAIS RECURSOS - PODER EXECUTIVO (II)                      [grupo, level=0]
   FEFIN                                                    [detalhe, level=1]
   FUNSES                                                   [detalhe]
   ROYALTIES DO PETRÓLEO - DESTINAÇÃO VINCULADA             [detalhe]
   OUTROS RECURSOS NÃO VINCULADOS - ADMINISTRAÇÃO INDIRETA  [detalhe]
   RECURSOS VINCULADOS A FUNDOS                             [detalhe]
   RECURSOS VINCULADOS À EDUCAÇÃO                           [detalhe]
   RECURSOS VINCULADOS À SAUDE                              [detalhe]
   RECURSOS DE OPERAÇÕES DE CRÉDITO                         [detalhe]
   RECURSOS VINCULADOS À ASSISTÊNCIA SOCIAL                 [detalhe]
   DEMAIS VINCULAÇÕES DECORRENTES DE TRANSFERÊNCIAS         [detalhe]
   RECURSOS DA CONTRIBUIÇÃO DE INTERVENÇÃO NO DOMÍNIO ECONÔMICO - CIDE  [detalhe]
   RECURSOS VINCULADOS AO TRÂNSITO - MULTAS                 [detalhe]
   RECURSOS PROVENIENTES DE TAXAS DE CONTROLE E FISCALIZAÇÃO AMBIENTAL DO ES  [detalhe]
   RECURSOS DE ALIENAÇÃO DE BENS                            [detalhe]
   RECURSOS VINCULADOS AO FUNDO DE COMBATE E ERRADICAÇÃO DA POBREZA  [detalhe]
   DEMAIS RECURSOS VINCULADOS - ROMPIMENTO DA BARRAGEM DE FUNDÃO/MARIANA  [detalhe]
   DEMAIS RECURSOS VINCULADOS                               [detalhe]
   RECURSOS EXTRAORÇAMENTÁRIOS                              [detalhe]
SUBTOTAL (III=I+II)                                         [subtotal — nota: "III" é o 3º item, não a coluna III]
RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL (IV)               [grupo sem sublinhas]
TOTAL (V=III+IV)                                            [total — nota: "V" é o 5º item, não a coluna V]
```

**Atenção ao parser:** os numerais romanos nos rótulos de SUBTOTAL e TOTAL referem-se à hierarquia dos blocos (1º, 2º, 3º item...), não às colunas técnicas I-XII.

### 2.4 Identificação de grupos no parser

```typescript
// lib/importers/sigefesParser.ts
const GROUP_PATTERNS: Record<string, string> = {
  'RECURSOS ADMINISTRADOS PELO TESOURO': 'TESOURO',
  'DEMAIS RECURSOS - PODER EXECUTIVO': 'DEMAIS',
  'DEMAIS RECURSOS – PODER EXECUTIVO': 'DEMAIS',  // variação de travessão
  'SUBTOTAL': 'SUBTOTAL',
  'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL': 'PREVIDENCIA',
  'TOTAL': 'TOTAL',
};
// Linhas com indent (espaços à esquerda no rótulo) = level=1 (detalhe)
// Linhas sem indent = level=0 (grupo, subtotal ou total)
```

---

## 3. REGRAS DE NEGÓCIO

### 3.1 Modelo de atualização de dados

O sistema não usa conceito de "rodadas" fechadas. Para cada mês de referência:
- Cada upload de qualquer fonte sobrescreve apenas aquela fonte
- Múltiplos uploads no mesmo mês: o sistema usa sempre o mais recente de cada fonte
- O histórico registra todos os uploads com timestamp e usuário (auditoria)
- O painel sempre exibe: (última base SIGEFES) + (último VI da SUBSET) + (último IX da SEP)

### 3.2 Derivação das 7 colunas executivas

| Coluna | Fórmula | Origem técnica |
|--------|---------|----------------|
| 1. Caixa bruto de referência | = I | I |
| 2. Obrigações já comprometidas | = II + III + IV | II + III + IV |
| 3. Caixa líquido atual | = V (importado) | V |
| 4. Arrecadação prevista até 31/12 | = VI_efetivo | VI |
| 5. Total disponível projetado | = col3 + col4 | VII = V + VI |
| 6. Pressões futuras a considerar | = VIII + IX_efetivo | VIII + IX |
| 7. Saldo projetado do art. 42 | = col5 − col6 | X = VII − VIII − IX |

**VI_efetivo:** usa `colVIAdjusted` se preenchido pela SUBSET; caso contrário, usa `colVI` (0 do import).
**IX_efetivo:** usa `colIXAdjusted` se preenchido pela SEP; caso contrário, usa `colIX` (0 do import).

**IMPORTANTE:** usar o V importado diretamente (não recalcular I-II-III-IV) para evitar divergências de arredondamento com o SIGEFES.

### 3.3 Farol de suficiência

```typescript
// lib/calculations/financialCalculations.ts
const AMARELO_THRESHOLD = 0.05; // 5% do caixa bruto como zona de atenção

export type TrafficLight = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA';

export function computeTrafficLight(col7: number, col1: number, viPreenchido: boolean, ixPreenchido: boolean): TrafficLight {
  if (!viPreenchido || !ixPreenchido) return 'CINZA';
  if (col7 < 0) return 'VERMELHO';
  if (col7 <= Math.abs(col1) * AMARELO_THRESHOLD) return 'AMARELO';
  return 'VERDE';
}
// AJUSTE O THRESHOLD AQUI para calibrar a zona amarela
```

### 3.4 Histórico e snapshots

Não há geração automática de snapshots periódicos. O histórico é composto pelos registros de upload com:
- Timestamp exato do upload
- Usuário responsável
- Contagem de uploads por fonte por mês
- O PDF pode ser gerado a qualquer momento (modo rascunho, sem homologação formal)

---

## 4. PERFIS DE USUÁRIO E PERMISSÕES

| Ação | ADMIN | SUBSET | SEFAZ | SEP | CONSULTA |
|------|-------|--------|-------|-----|----------|
| Upload SIGEFES | ✅ | ✅ | ✅ | ❌ | ❌ |
| Preencher Arrecadação (VI) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Preencher Pressões (IX) | ✅ | ❌ | ❌ | ✅ | ❌ |
| Gerar PDF/Excel | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver dados em andamento | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver histórico | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reverter upload | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 5. STACK TÉCNICA

- **Framework:** Next.js 14 com App Router, TypeScript (strict)
- **Estilos:** Tailwind CSS
- **ORM:** Prisma
- **Banco local:** SQLite (`DATABASE_URL="file:./dev.db"`)
- **Banco produção:** PostgreSQL via Neon (trocar apenas `provider` no schema.prisma e `DATABASE_URL`)
- **Autenticação:** NextAuth.js v4, Credentials Provider, bcryptjs, sessão JWT
- **Parser Excel:** SheetJS (`xlsx`)
- **Exportação PDF:** `@react-pdf/renderer` (server-side em API Route)
- **Exportação Excel:** `exceljs` (server-side em API Route)
- **Deploy:** Vercel (filesystem efêmero — nunca salvar arquivos em disco)

---

## 6. SCHEMA PRISMA

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"   // Trocar para "postgresql" na produção
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  SUBSET
  SEFAZ
  SEP
  CONSULTA
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(CONSULTA)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sigefesUploads  SigefesUpload[]
  subsetInputs    SubsetInput[]
  sepInputs       SepInput[]
  auditLogs       AuditLog[]
  pdfExports      PdfExport[]
}

// Uma linha financeira importada do SIGEFES
model FinancialLine {
  id        String   @id @default(cuid())
  rowOrder  Int
  rowLabel  String
  groupKey  String?  // TESOURO | DEMAIS | SUBTOTAL | PREVIDENCIA | TOTAL
  isGroup   Boolean  @default(false)
  isSubtotal Boolean @default(false)
  isTotal   Boolean  @default(false)
  level     Int      @default(0)

  // Colunas importadas do SIGEFES
  colI    Float @default(0)
  colII   Float @default(0)
  colIII  Float @default(0)
  colIV   Float @default(0)
  colV    Float @default(0)    // Usar este valor diretamente (não recalcular)
  colVI   Float @default(0)    // Sempre 0 no import
  colVII  Float @default(0)    // Sempre 0 no import (recalcular)
  colVIII Float @default(0)
  colIX   Float @default(0)    // Sempre 0 no import
  colX    Float @default(0)    // Sempre 0 no import (recalcular)
  colXI   Float @default(0)
  colXII  Float @default(0)

  // Ajustes manuais
  colVIAdjusted  Float?   // Preenchido pela SUBSET
  colVINote      String?
  colIXAdjusted  Float?   // Preenchido pela SEP
  colIXNote      String?

  upload   SigefesUpload @relation(fields: [uploadId], references: [id], onDelete: Cascade)
  uploadId String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Cada upload completo do SIGEFES
model SigefesUpload {
  id             String   @id @default(cuid())
  monthRef       String   // "2026-04" (YYYY-MM)
  referenceDate  String?  // "22/04/2026" (data da posição extraída da planilha)
  fileName       String
  isLatest       Boolean  @default(true)  // Marcado false quando há upload mais novo no mesmo mês
  uploadedById   String
  uploadedBy     User     @relation(fields: [uploadedById], references: [id])
  createdAt      DateTime @default(now())

  lines         FinancialLine[]
  subsetInputs  SubsetInput[]
  sepInputs     SepInput[]
}

// Preenchimento de VI pela SUBSET (um registro por upload de dados)
model SubsetInput {
  id       String        @id @default(cuid())
  upload   SigefesUpload @relation(fields: [uploadId], references: [id])
  uploadId String
  monthRef String        // "2026-04"
  isLatest Boolean       @default(true)
  createdById String
  createdBy   User       @relation(fields: [createdById], references: [id])
  createdAt   DateTime   @default(now())
  // Valores VI por linha estão em FinancialLine.colVIAdjusted
}

// Preenchimento de IX pela SEP
model SepInput {
  id       String        @id @default(cuid())
  upload   SigefesUpload @relation(fields: [uploadId], references: [id])
  uploadId String
  monthRef String
  isLatest Boolean       @default(true)
  createdById String
  createdBy   User       @relation(fields: [createdById], references: [id])
  createdAt   DateTime   @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  entityType String   // "SigefesUpload" | "SubsetInput" | "SepInput" | "User"
  entityId   String
  action     String   // "UPLOAD_SIGEFES" | "UPDATE_VI" | "UPDATE_IX" | "REVERT" | "CREATE_USER"
  fieldName  String?
  oldValue   String?
  newValue   String?
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  createdAt  DateTime @default(now())
}

model PdfExport {
  id          String   @id @default(cuid())
  monthRef    String
  generatedById String
  generatedBy   User   @relation(fields: [generatedById], references: [id])
  createdAt   DateTime @default(now())
}
```

---

## 7. ESTRUTURA DE PASTAS

```
/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx                    # Sidebar + HeaderBar
│   │   ├── dashboard/page.tsx            # Tabela principal
│   │   ├── insercao/
│   │   │   ├── upload/page.tsx
│   │   │   ├── arrecadacao/page.tsx
│   │   │   └── pressoes/page.tsx
│   │   ├── historico/page.tsx
│   │   ├── memoria/page.tsx
│   │   └── admin/usuarios/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── sigefes/upload/route.ts       # POST multipart
│       ├── arrecadacao/route.ts          # GET, POST
│       ├── pressoes/route.ts             # GET, POST
│       ├── historico/route.ts            # GET
│       ├── export/pdf/route.ts           # GET
│       ├── export/excel/route.ts         # GET
│       └── admin/usuarios/route.ts       # CRUD
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/HeaderBar.tsx
│   ├── financial/
│   │   ├── FinancialExecutiveTable.tsx   # 7 colunas, grupos colapsáveis
│   │   ├── FinancialTechTable.tsx        # 12 colunas, cabeçalhos com nomes oficiais
│   │   ├── TrafficLightBadge.tsx
│   │   └── ExportButtons.tsx
│   ├── input/
│   │   ├── SigefesUploadZone.tsx         # Dropzone + confirmação
│   │   ├── ManualInputTable.tsx          # Tabela agrupada com inputs
│   │   └── ExcelUploadToggle.tsx         # Toggle digitar/upload
│   ├── memoria/
│   │   ├── MemoriaLinePanel.tsx          # Derivação da linha
│   │   ├── GlossarioFontes.tsx           # Definições das fontes
│   │   └── GlossarioColunas.tsx          # Definições das colunas I-XII
│   └── ui/
│       ├── StatusPill.tsx
│       ├── DataSourceBadge.tsx
│       └── ConfirmModal.tsx
├── lib/
│   ├── auth/authOptions.ts
│   ├── db/prisma.ts                      # Singleton Prisma client
│   ├── importers/sigefesParser.ts        # Parser específico planilha SIGEFES-ES
│   ├── calculations/financialCalc.ts     # Funções puras de cálculo
│   ├── pdf/generatePDF.ts
│   └── excel/generateExcel.ts
├── prisma/schema.prisma
├── prisma/seed.ts
├── middleware.ts                          # Proteção de rotas
├── .env.example
└── README.md
```

---

## 8. PARSER DA PLANILHA SIGEFES

**Arquivo:** `lib/importers/sigefesParser.ts`

```typescript
import * as XLSX from 'xlsx'

export interface ParsedLine {
  rowOrder: number
  rowLabel: string
  groupKey: string | null
  isGroup: boolean
  isSubtotal: boolean
  isTotal: boolean
  level: number       // 0 = cabeçalho de grupo | 1 = linha de detalhe
  colI: number; colII: number; colIII: number; colIV: number; colV: number
  colVI: number       // sempre 0 (None no arquivo)
  colVII: number      // sempre 0 (recalculado pelo sistema)
  colVIII: number
  colIX: number       // sempre 0 (None no arquivo)
  colX: number        // sempre 0 (recalculado pelo sistema)
  colXI: number; colXII: number
}

export interface ParseResult {
  lines: ParsedLine[]
  referenceDate: string | null  // ex: "22/04/2026"
  monthRef: string | null       // ex: "2026-04"
  errors: string[]
}

export function parseSigefesSpreadsheet(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  const result: ParseResult = { lines: [], referenceDate: null, monthRef: null, errors: [] }

  // Extrai data de referência (linha 3, coluna A)
  if (rows[2]?.[0] && String(rows[2][0]).includes('Posição:')) {
    const dateStr = String(rows[2][0]).replace('Posição:', '').trim() // "22/04/2026"
    result.referenceDate = dateStr
    const parts = dateStr.split('/')
    if (parts.length === 3) result.monthRef = `${parts[2]}-${parts[1]}`
  }

  // Encontra linha de cabeçalho (contém "Poder Executivo")
  let dataStart = -1
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i]?.[0] && String(rows[i][0]).toLowerCase().includes('poder executivo')) {
      dataStart = i + 1; break
    }
  }
  if (dataStart === -1) { result.errors.push('Cabeçalho de dados não encontrado.'); return result }

  const GROUP_KEYS: Record<string, string> = {
    'RECURSOS ADMINISTRADOS PELO TESOURO': 'TESOURO',
    'DEMAIS RECURSOS - PODER EXECUTIVO': 'DEMAIS',
    'DEMAIS RECURSOS – PODER EXECUTIVO': 'DEMAIS',
    'SUBTOTAL': 'SUBTOTAL',
    'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL': 'PREVIDENCIA',
    'TOTAL': 'TOTAL',
  }

  const numVal = (row: any[], idx: number): number => {
    const v = row[idx]
    if (v === null || v === undefined || v === '') return 0
    const n = parseFloat(String(v))
    return isNaN(n) ? 0 : n
  }

  let rowOrder = 0
  let currentGroup: string | null = null

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (!row?.[0]) continue
    const rawLabel = String(row[0])
    if (!rawLabel.trim() || rawLabel.toLowerCase().includes('sistema integrado')) continue

    const label = rawLabel.trim()
    const hasIndent = rawLabel.startsWith('   ') // 3+ espaços = detalhe
    let isGroup = false, isSubtotal = false, isTotal = false
    let groupKey: string | null = null
    let level = hasIndent ? 1 : 0

    for (const [pattern, key] of Object.entries(GROUP_KEYS)) {
      if (label.toUpperCase().includes(pattern)) {
        isGroup = !['SUBTOTAL', 'TOTAL'].includes(key)
        isSubtotal = key === 'SUBTOTAL'
        isTotal = key === 'TOTAL'
        groupKey = key
        currentGroup = key
        level = 0; break
      }
    }
    if (!isGroup && !isSubtotal && !isTotal) groupKey = currentGroup

    result.lines.push({
      rowOrder: rowOrder++, rowLabel: label, groupKey, isGroup, isSubtotal, isTotal, level,
      colI: numVal(row, 1), colII: numVal(row, 2), colIII: numVal(row, 3), colIV: numVal(row, 4),
      colV: numVal(row, 5),
      colVI: 0,              // VI é sempre nulo/None no export do SIGEFES
      colVII: 0,             // Recalculado pelo sistema após preenchimento de VI
      colVIII: numVal(row, 8),
      colIX: 0,              // IX é sempre nulo/None no export do SIGEFES
      colX: 0,               // Recalculado pelo sistema após preenchimento de IX
      colXI: numVal(row, 11), colXII: numVal(row, 12),
    })
  }

  if (result.lines.length === 0) result.errors.push('Nenhuma linha encontrada. Verifique o formato.')
  return result
}
```

---

## 9. MÓDULO DE CÁLCULOS

**Arquivo:** `lib/calculations/financialCalc.ts`

```typescript
// Todos os valores são calculados com base nos dados efetivos (ajustados se existirem)

export function getEffectiveVI(colVI: number, colVIAdjusted: number | null): number {
  return colVIAdjusted !== null && colVIAdjusted !== undefined ? colVIAdjusted : colVI
}

export function getEffectiveIX(colIX: number, colIXAdjusted: number | null): number {
  return colIXAdjusted !== null && colIXAdjusted !== undefined ? colIXAdjusted : colIX
}

export interface ExecutiveColumns {
  col1: number  // Caixa bruto = I
  col2: number  // Obrigações = II+III+IV
  col3: number  // Caixa líquido = V (importado)
  col4: number  // Arrecadação = VI efetivo
  col5: number  // Total disponível = V+VI
  col6: number  // Pressões = VIII+IX efetivo
  col7: number  // Saldo art.42 = (V+VI)−(VIII+IX)
}

export function computeExecutiveColumns(line: {
  colI: number; colII: number; colIII: number; colIV: number; colV: number
  colVI: number; colVIAdjusted: number | null
  colVIII: number; colIX: number; colIXAdjusted: number | null
}): ExecutiveColumns {
  const VI = getEffectiveVI(line.colVI, line.colVIAdjusted)
  const IX = getEffectiveIX(line.colIX, line.colIXAdjusted)
  const col1 = line.colI
  const col2 = line.colII + line.colIII + line.colIV
  const col3 = line.colV   // usar V importado, não recalcular
  const col4 = VI
  const col5 = col3 + col4
  const col6 = line.colVIII + IX
  const col7 = col5 - col6
  return { col1, col2, col3, col4, col5, col6, col7 }
}

// AJUSTE AQUI para calibrar os limiares do farol
const AMARELO_THRESHOLD = 0.05

export type TrafficLight = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA'

export function computeTrafficLight(
  col7: number, col1: number,
  viPreenchido: boolean, ixPreenchido: boolean
): TrafficLight {
  if (!viPreenchido || !ixPreenchido) return 'CINZA'
  if (col7 < 0) return 'VERMELHO'
  if (col7 <= Math.abs(col1) * AMARELO_THRESHOLD) return 'AMARELO'
  return 'VERDE'
}

export const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
```

---

## 10. TELAS DO SISTEMA

### 10.1 Dashboard (`/dashboard`)
Tela principal. Exibe sempre a tabela executiva com os dados mais recentes de cada fonte.

**Controles:**
- Toggle Modo Executivo / Modo Técnico
- Seletor "Histórico" — navega entre meses para visualização do estado daquele período
- Botões ↓ PDF e ↓ Excel no cabeçalho

**Tabela Modo Executivo:**
- 8 colunas: 7 valores + Farol
- Cabeçalho com nome curto + origem técnica (ex: "Origem: II+III+IV")
- Grupos colapsáveis com clique no chevron ▼/▶
- Valores negativos em vermelho

**Tabela Modo Técnico:**
- 12 colunas (I a XII)
- Cabeçalho duplo: numeral romano em destaque + nome abreviado abaixo
- Colunas VI e IX destacadas em amarelo (fundo e cabeçalho) — indicam preenchimento manual
- Nota de rodapé: "VI e IX: preenchimento manual · VII e X: recalculados após input"
- Valores negativos em vermelho

**Linha de rodapé da tabela:**
```
Posição: DD/MM/YYYY · Base SIGEFES importada em DD/MM/YYYY HH:MM · 29 linhas · Valores em R$
```

### 10.2 Upload SIGEFES (`/insercao/upload`)
- Dropzone para .xlsx
- Ao detectar arquivo: exibe pré-visualização (nome, posição, contagem de linhas, 12 colunas identificadas listadas)
- Alerta: "VI e IX chegam zeradas e serão preenchidas manualmente"
- Botão "Confirmar importação" — persiste e registra em AuditLog
- Após confirmação: opção "Ir para Arrecadação SUBSET →"

### 10.3 Arrecadação SUBSET (`/insercao/arrecadacao`)
- Toggle no topo: **✏ Digitar** | **↑ Upload Excel**
- Modo Digitar: tabela agrupada (mesma hierarquia visual da planilha — grupos em azul escuro, sublinhas em branco) com apenas label + campo de input amarelo (coluna VI)
- Modo Upload Excel: dropzone + link "Baixar modelo Excel" + instrução "Col A: Fonte · Col B: Valor"
- Ao salvar: registra timestamp, usuário e grava em AuditLog

### 10.4 Pressões SEP (`/insercao/pressoes`)
- Idêntico à tela de Arrecadação, mas para coluna IX
- Somente usuários SEP e ADMIN

### 10.5 Histórico (`/historico`)
- Lista de meses com as três fontes de dados
- Para cada mês: data/hora e usuário do último upload de cada fonte
- SIGEFES exibe contagem total de uploads no mês ("X uploads neste mês")
- Botão "↓ PDF" por linha

### 10.6 Memória de Cálculo (`/memoria`)
- Painel esquerdo: seletor de linha (mesma hierarquia visual)
- Painel direito com 3 abas:

  **Memória da Linha** (requer seleção): mostra as 12 colunas técnicas importadas + derivação das 7 colunas executivas com valores calculados e farol

  **Glossário — Fontes**: lista todas as 29 fontes de recurso com definições baseadas no MCASP (STN), em linguagem acessível. Grupos com borda azul, sublinhas recuadas.

  **Glossário — Colunas**: lista as 12 colunas técnicas (I–XII) com definição completa. VI e IX destacados com borda amarela e badge "preenchimento manual".

### 10.7 Administração (`/admin/usuarios`)
- CRUD de usuários (criar, editar, ativar/desativar — nunca deletar)
- Reversão de upload: permite ao ADMIN desfazer o último upload de qualquer fonte (restaura o anterior)
- Somente ADMIN

---

## 11. AUTENTICAÇÃO

```typescript
// lib/auth/authOptions.ts
// NextAuth v4 com Credentials Provider
// Sessão JWT — compatível com Vercel serverless
// Middleware protege todas as rotas exceto /login
// Extensão de tipos: types/next-auth.d.ts com role e id no token/session
```

**Middleware:** `middleware.ts` com `withAuth` cobrindo `/((?!login|api/auth|_next|favicon).*)`.

---

## 12. API ROUTES

```
POST /api/sigefes/upload          # multipart/form-data → parse → persist → AuditLog
GET  /api/arrecadacao?month=...   # retorna linhas com colVIAdjusted
POST /api/arrecadacao             # body: [{lineId, value, note}] → AuditLog
GET  /api/pressoes?month=...
POST /api/pressoes
GET  /api/historico
GET  /api/export/pdf?month=...    # retorna buffer PDF
GET  /api/export/excel?month=...  # retorna buffer Excel
GET  /api/admin/usuarios
POST /api/admin/usuarios
PATCH /api/admin/usuarios/[id]
```

**Nota Vercel:** arquivos Excel do upload são parseados em memória e descartados. PDFs são gerados sob demanda — nunca salvar no filesystem.

---

## 13. DESIGN E UI

### Paleta
```
Sidebar bg:        #0F1624
Sidebar hover:     #1E2D45
Sidebar ativo:     #1D4ED8
Grupos tabela:     #1e3a5f
Subtotais:         #1e293b
Fundo principal:   var(--color-background-primary)
Negativo:          #dc2626
VI/IX highlight:   #fefce8 (fundo) / #fde047 (borda)
Farol verde:       #16a34a
Farol amarelo:     #d97706
Farol vermelho:    #dc2626
Farol cinza:       #6b7280
```

### Tipografia
- Fonte base: system-ui (produção pode usar Inter via Google Fonts)
- Valores numéricos: `font-variant-numeric: tabular-nums`
- Valores negativos: cor `#dc2626`, sem formatação extra

### Referência visual
Ver protótipo interativo desenvolvido em 4 iterações. O componente React do protótipo pode ser usado como base direta para os componentes Next.js.

### Mobile
- Sidebar: drawer lateral ativado por botão ☰ no header
- Tabela: scroll horizontal (`overflow-x: auto`)
- Header compacto com título abreviado
- Hint "Gire o dispositivo para melhor visualização" exibido em telas < 700px

---

## 14. SEED

**Arquivo:** `prisma/seed.ts`

Usuários (senha padrão dev: `Sistema@2026`):
```
admin@sefaz.es.gov.br    — ADMIN
subset@sefaz.es.gov.br   — SUBSET
sefaz@sefaz.es.gov.br    — SEFAZ
sep@sefaz.es.gov.br      — SEP
consulta@sefaz.es.gov.br — CONSULTA
```

Dados seed: 3 meses (Fev/2026 com dados completos, Mar/2026 com dados completos, Abr/2026 com SIGEFES importado mas VI e IX pendentes). Usar valores reais da planilha `controle_art42_reestruturado_v2.xlsx` (29 linhas, posição 22/04/2026) para o mês de Abril.

---

## 15. VARIÁVEIS DE AMBIENTE

```env
# .env.example
DATABASE_URL="file:./dev.db"
# Produção: DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

NEXTAUTH_SECRET="gerar-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
# Produção: NEXTAUTH_URL="https://seu-dominio.vercel.app"
```

---

## 16. COMO RODAR LOCALMENTE

```bash
git clone https://github.com/EduardoAraujoOx/Tesouro
cd Tesouro
npm install
cp .env.example .env
# Editar .env: gerar NEXTAUTH_SECRET com: openssl rand -base64 32
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# Acesse http://localhost:3000
```

---

## 17. DEPLOY NA VERCEL

```bash
# 1. Criar banco no Neon (neon.tech) — plano gratuito
# 2. Configurar variáveis no painel Vercel:
#    DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# 3. Rodar migration de produção (uma vez):
DATABASE_URL="postgresql://..." npx prisma migrate deploy
# 4. Deploy:
vercel --prod
```

---

## 18. EXPORTAÇÃO PDF

**Conteúdo do PDF:**
1. Cabeçalho: "Governo do Estado do Espírito Santo — SEFAZ-ES / Subsecretaria do Tesouro Estadual"
2. Título: "Controle de Disponibilidade Financeira Líquida do Poder Executivo — Art. 42 da LRF"
3. Mês de referência e data de posição da base SIGEFES
4. Três blocos de fonte: Base SIGEFES, Arrecadação SUBSET, Pressões SEP — com data/hora e usuário de cada um
5. Tabela executiva de 7 colunas (grupos e sublinhas, negativos destacados, farol)
6. Nota de rodapé: "Gerado em DD/MM/YYYY HH:MM por [usuário]"
7. Numeração de páginas

**Geração:** API Route `GET /api/export/pdf?month=YYYY-MM` retorna buffer com `Content-Type: application/pdf`.

---

## 19. EVOLUÇÕES FUTURAS (fora do MVP)

- Integração direta com API do SIGEFES (eliminar upload manual)
- Notificações por e-mail quando alguma fonte é atualizada
- Gráfico de evolução do saldo projetado ao longo dos meses
- Exportação consolidada multi-meses
- Refinamento dos limiares do farol por tipo de fundo
- Suporte a múltiplos exercícios fiscais

---

## 20. ORDEM DE IMPLEMENTAÇÃO (para Claude Code)

1. Inicializar projeto Next.js 14 + TypeScript + Tailwind
2. Configurar Prisma com SQLite, rodar migration inicial
3. Implementar autenticação NextAuth com Credentials + middleware
4. Criar layout base: Sidebar + HeaderBar com navegação funcional
5. Implementar parser SIGEFES (`lib/importers/sigefesParser.ts`)
6. Implementar API Route de upload + persistência no banco
7. Implementar tabela executiva (`FinancialExecutiveTable`) com grupos colapsáveis
8. Implementar tabela técnica (`FinancialTechTable`) com cabeçalhos oficiais e destaque VI/IX
9. Implementar telas de Arrecadação SUBSET e Pressões SEP (com toggle digitar/upload)
10. Implementar tela de Histórico
11. Implementar tela de Memória de Cálculo com 3 abas (Memória | Glossário Fontes | Glossário Colunas)
12. Implementar exportação PDF e Excel
13. Implementar CRUD de usuários + reversão de upload (Administração)
14. Criar seed com dados reais de Abril/2026
15. Testar fluxo completo localmente
16. Preparar deploy Vercel (trocar SQLite → PostgreSQL Neon)

**Prioridade:** funcionalidade correta > estética. O protótipo interativo (4 versões) serve como referência visual direta para os componentes.

---

## 21. ROBUSTEZ DO PARSER — ADIÇÕES AO MVP

### 21.1 Formatos de importação suportados (em ordem de preferência)

**Antes de implementar o parser, perguntar à TI do SIGEFES-ES se existe exportação em CSV.**
Se disponível, implementar suporte a CSV como formato principal e manter XLSX como alternativa.

| Formato | Confiabilidade | Complexidade | Recomendação |
|---------|---------------|--------------|--------------|
| CSV (;) | Alta | Baixa | ✅ Preferencial se disponível |
| XLSX    | Média | Média | ✅ Fallback (implementado) |
| TXT posicional | Alta | Alta | Implementar só se for o único disponível |
| PDF     | Nenhuma | Inviável | ❌ Nunca usar |

**Parser CSV** (`lib/importers/sigefesParserCSV.ts`):
```typescript
// Implementar se SIGEFES oferecer exportação CSV
// Pontos críticos: encoding (provavelmente ISO-8859-1 ou UTF-8 com BOM),
// delimitador (ponto-e-vírgula é padrão em sistemas brasileiros),
// separador decimal (vírgula no padrão pt-BR)
// A lógica de identificação de grupos e mapeamento de colunas é idêntica ao parser XLSX
```

O sistema deve detectar automaticamente o formato pelo mime-type e extensão do arquivo enviado e chamar o parser adequado, sem exigir que o usuário declare o formato.

### 21.2 Validador defensivo — conferências obrigatórias no import

Após o parsing, antes de persistir qualquer dado, executar as seguintes conferências em `lib/importers/sigefesValidator.ts`:

```typescript
export interface ValidationResult {
  passed: boolean
  checks: ValidationCheck[]
}

export interface ValidationCheck {
  name: string
  passed: boolean
  expected: string
  found: string
  critical: boolean  // se true, bloqueia o import; se false, exibe aviso
}

export function validateParsedData(lines: ParsedLine[]): ValidationResult {
  const checks: ValidationCheck[] = []

  // 1. CONTAGEM TOTAL DE LINHAS (crítico)
  checks.push({
    name: 'Total de linhas',
    passed: lines.length === 29,
    expected: '29',
    found: String(lines.length),
    critical: true,
  })

  // 2. LINHAS DE DETALHE (crítico)
  const detail = lines.filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal)
  checks.push({
    name: 'Linhas de detalhe',
    passed: detail.length === 24,
    expected: '24',
    found: String(detail.length),
    critical: true,
  })

  // 3. GRUPOS ENCONTRADOS (crítico)
  const groups = ['TESOURO', 'DEMAIS', 'SUBTOTAL', 'PREVIDENCIA', 'TOTAL']
  const foundGroups = [...new Set(lines.map(l => l.groupKey).filter(Boolean))]
  const allGroupsFound = groups.every(g => foundGroups.includes(g))
  checks.push({
    name: 'Grupos identificados',
    passed: allGroupsFound,
    expected: groups.join(', '),
    found: foundGroups.join(', '),
    critical: true,
  })

  // 4. VI E IX CHEGAM ZERADOS (aviso se não for o caso — pode indicar formato diferente)
  const anyVINonZero = lines.some(l => l.colVI !== 0)
  checks.push({
    name: 'Coluna VI zerada no import',
    passed: !anyVINonZero,
    expected: 'Todos zeros (preenchimento manual posterior)',
    found: anyVINonZero ? 'Alguns valores não-zero detectados' : 'Todos zeros ✓',
    critical: false,  // aviso, não bloqueia — pode ser nova versão do SIGEFES
  })

  // 5. CONFERÊNCIA DE SOMATÓRIOS — Subtotal deve bater com soma de grupos (aviso)
  const subtotal = lines.find(l => l.isSubtotal)
  const tesouro = lines.find(l => l.groupKey === 'TESOURO' && l.isGroup)
  const demais = lines.find(l => l.groupKey === 'DEMAIS' && l.isGroup)
  if (subtotal && tesouro && demais) {
    const calculatedI = tesouro.colI + demais.colI
    const tolerance = 1  // R$ 1,00 de tolerância para arredondamento
    const somaOk = Math.abs(calculatedI - subtotal.colI) <= tolerance
    checks.push({
      name: 'Somatório do Subtotal (col I)',
      passed: somaOk,
      expected: `R$ ${calculatedI.toFixed(2)} (Tesouro + Demais)`,
      found: `R$ ${subtotal.colI.toFixed(2)} (linha Subtotal)`,
      critical: false,
    })
  }

  return {
    passed: checks.filter(c => c.critical).every(c => c.passed),
    checks,
  }
}
```

Se `passed === false` (alguma conferência crítica falhou): **bloquear** o import e exibir a tela de diagnóstico.
Se `passed === true` mas há avisos: **permitir** o import mas exibir os avisos com destaque.

### 21.3 Tela de diagnóstico de import

Exibir sempre após o parsing, antes da confirmação do usuário:

```
┌─────────────────────────────────────────────────────────┐
│  DIAGNÓSTICO DO ARQUIVO                                  │
│  controle_art42_reestruturado_v2.xlsx                    │
├─────────────────────────────────────────────────────────┤
│  ✅ Total de linhas             Esperado: 29 · Encontrado: 29  │
│  ✅ Linhas de detalhe           Esperado: 24 · Encontrado: 24  │
│  ✅ Grupos identificados        TESOURO, DEMAIS, SUBTOTAL...   │
│  ✅ Coluna VI zerada no import  Todos zeros ✓                  │
│  ✅ Somatório do Subtotal (I)   R$ 10.517.919.677,51 ✓         │
├─────────────────────────────────────────────────────────┤
│  Data de posição extraída: 22/04/2026                    │
│  Mês de referência: Abril/2026                           │
│                                                          │
│  [Confirmar importação]  [Cancelar]                      │
└─────────────────────────────────────────────────────────┘
```

Se houver falha crítica:
```
│  ❌ Total de linhas   Esperado: 29 · Encontrado: 31       │
│                                                           │
│  ⚠ O arquivo pode ter formato diferente do esperado.     │
│  Verifique se é a exportação correta do SIGEFES-ES.      │
│  Se o formato mudou, contate o administrador do sistema. │
│                                                          │
│  [Cancelar]  (importação bloqueada)                      │
```

### 21.4 Como ajustar o parser quando o formato mudar

Se o SIGEFES alterar o layout da planilha, o administrador deve:

**Passo 1 — Identificar o que mudou:**
A tela de diagnóstico mostrará qual conferência falhou (ex: "Total de linhas: encontrado 31").

**Passo 2 — Ajuste cirúrgico no parser:**
Abrir `lib/importers/sigefesParser.ts` e ajustar apenas:
- `GROUP_PATTERNS`: se algum rótulo de grupo mudou
- Índices `numVal(row, N)`: se colunas foram reordenadas ou inseridas
- Nomes dos checks em `sigefesValidator.ts`: se a contagem de linhas mudou

**Passo 3 — Prompt para Claude Code (se necessário):**
```
"A planilha SIGEFES mudou de formato. Veja o arquivo anexo.
Atualize APENAS os arquivos:
- lib/importers/sigefesParser.ts
- lib/importers/sigefesValidator.ts
Não altere nenhum outro arquivo. A lógica de cálculo e o banco de dados
permanecem inalterados — apenas o mapeamento de colunas e rótulos mudou."
```

**Passo 4 — Verificar com o arquivo novo:**
Fazer um upload de teste. O diagnóstico mostrará ✅ em todos os checks se o ajuste estiver correto.

