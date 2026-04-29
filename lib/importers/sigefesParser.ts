import ExcelJS from 'exceljs'

export interface ParsedLine {
  rowOrder: number
  rowLabel: string
  groupKey: string | null
  isGroup: boolean
  isSubtotal: boolean
  isTotal: boolean
  level: number
  colI: number; colII: number; colIII: number; colIV: number; colV: number
  colVI: number
  colVII: number
  colVIII: number
  colIX: number
  colX: number
  colXI: number; colXII: number
}

export interface ParseResult {
  lines: ParsedLine[]
  referenceDate: string | null
  monthRef: string | null
  errors: string[]
}

function cellStr(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toLocaleDateString('pt-BR')
  if (typeof v === 'object') {
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
    if ('text' in v) return (v as ExcelJS.CellHyperlinkValue).text
    if ('result' in v) {
      const r = (v as ExcelJS.CellFormulaValue).result
      if (r !== null && r !== undefined && typeof r !== 'object') return String(r)
    }
  }
  return null
}

function cellNum(v: ExcelJS.CellValue): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n }
  if (typeof v === 'object' && 'result' in v) {
    const r = (v as ExcelJS.CellFormulaValue).result
    if (typeof r === 'number') return r
    if (typeof r === 'string') { const n = parseFloat(r); return isNaN(n) ? 0 : n }
  }
  return 0
}

export async function parseSigefesSpreadsheet(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  // exceljs type definitions expect non-generic Buffer; Node 20+ uses Buffer<ArrayBufferLike>
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheet = workbook.worksheets[0]

  // Build 0-indexed rows from exceljs's 1-indexed row.values
  const rows: ExcelJS.CellValue[][] = []
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const vals = row.values as ExcelJS.CellValue[]
    // vals[0] is undefined in exceljs — shift to 0-indexed
    rows.push(vals.slice(1))
  })

  const result: ParseResult = { lines: [], referenceDate: null, monthRef: null, errors: [] }

  // Search first 15 rows for "Posição:"
  outer: for (let i = 0; i < Math.min(rows.length, 15); i++) {
    for (let j = 0; j < Math.min((rows[i] ?? []).length, 6); j++) {
      const cell = cellStr(rows[i]?.[j] ?? null)
      if (cell && cell.includes('Posição:')) {
        const dateStr = cell.replace(/.*Posição:\s*/i, '').trim()
        result.referenceDate = dateStr
        const parts = dateStr.split('/')
        if (parts.length === 3) result.monthRef = `${parts[2]}-${parts[1]}`
        break outer
      }
    }
  }

  let dataStart = -1
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    for (let j = 0; j < Math.min((rows[i] ?? []).length, 6); j++) {
      const cell = cellStr(rows[i]?.[j] ?? null)
      if (cell && cell.toLowerCase().includes('poder executivo')) {
        dataStart = i + 1; break
      }
    }
    if (dataStart !== -1) break
  }
  if (dataStart === -1) {
    result.errors.push('Cabeçalho de dados não encontrado.')
    return result
  }

  const GROUP_KEYS: Record<string, string> = {
    'RECURSOS ADMINISTRADOS PELO TESOURO': 'TESOURO',
    'DEMAIS RECURSOS - PODER EXECUTIVO': 'DEMAIS',
    'DEMAIS RECURSOS – PODER EXECUTIVO': 'DEMAIS',
    'SUBTOTAL': 'SUBTOTAL',
    'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL': 'PREVIDENCIA',
    'TOTAL': 'TOTAL',
  }

  let rowOrder = 0
  let currentGroup: string | null = null

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    const rawLabelVal = row?.[0] ?? null
    if (rawLabelVal === null || rawLabelVal === undefined) continue
    const rawLabel = cellStr(rawLabelVal) ?? ''
    if (!rawLabel.trim() || rawLabel.toLowerCase().includes('sistema integrado')) continue

    const label = rawLabel.trim()
    const hasIndent = rawLabel.startsWith('   ')
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
      colI:    cellNum(row[1] ?? null),
      colII:   cellNum(row[2] ?? null),
      colIII:  cellNum(row[3] ?? null),
      colIV:   cellNum(row[4] ?? null),
      colV:    cellNum(row[5] ?? null),
      colVI:   0,
      colVII:  0,
      colVIII: cellNum(row[8] ?? null),
      colIX:   0,
      colX:    0,
      colXI:   cellNum(row[11] ?? null),
      colXII:  cellNum(row[12] ?? null),
    })
  }

  if (result.lines.length === 0) {
    result.errors.push('Nenhuma linha encontrada. Verifique o formato.')
  }
  return result
}
