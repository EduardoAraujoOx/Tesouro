import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'

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

// OLE2 compound file signature — present in all Excel 97-2003 (.xls) files
const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0])

function isXls(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.slice(0, 4).equals(OLE2_MAGIC)
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

// Build 0-indexed row matrix from a .xls buffer via SheetJS (only format supported)
function xlsToRows(buffer: Buffer): (string | number | null)[][] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as (string | number | null)[][]
}

// Build 0-indexed row matrix from a .xlsx buffer via ExcelJS
async function xlsxToRows(buffer: Buffer): Promise<ExcelJS.CellValue[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheet = workbook.worksheets[0]
  const rows: ExcelJS.CellValue[][] = []
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const vals = row.values as ExcelJS.CellValue[]
    rows.push(vals.slice(1)) // exceljs is 1-indexed; shift to 0-indexed
  })
  return rows
}

function parseRows(rawRows: (string | number | null | ExcelJS.CellValue)[][]): ParseResult {
  const result: ParseResult = { lines: [], referenceDate: null, monthRef: null, errors: [] }

  const str = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    return cellStr(v as ExcelJS.CellValue)
  }

  const num = (v: unknown): number => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n }
    return cellNum(v as ExcelJS.CellValue)
  }

  // Search first 15 rows for "Posição:"
  outer: for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    for (let j = 0; j < Math.min((rawRows[i] ?? []).length, 6); j++) {
      const cell = str(rawRows[i]?.[j])
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
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    for (let j = 0; j < Math.min((rawRows[i] ?? []).length, 6); j++) {
      const cell = str(rawRows[i]?.[j])
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

  for (let i = dataStart; i < rawRows.length; i++) {
    const row = rawRows[i]
    const rawLabelRaw = row?.[0]
    if (rawLabelRaw === null || rawLabelRaw === undefined) continue
    const rawLabel = str(rawLabelRaw) ?? ''
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
      colI:    num(row[1]),
      colII:   num(row[2]),
      colIII:  num(row[3]),
      colIV:   num(row[4]),
      colV:    num(row[5]),
      colVI:   0,
      colVII:  0,
      colVIII: num(row[8]),
      colIX:   0,
      colX:    0,
      colXI:   num(row[11]),
      colXII:  num(row[12]),
    })
  }

  if (result.lines.length === 0) {
    result.errors.push('Nenhuma linha encontrada. Verifique o formato.')
  }
  return result
}

export async function parseSigefesSpreadsheet(buffer: Buffer): Promise<ParseResult> {
  if (isXls(buffer)) {
    // Excel 97-2003 (.xls) — handled by SheetJS since exceljs only supports .xlsx
    const rows = xlsToRows(buffer)
    return parseRows(rows)
  }
  // Excel 2007+ (.xlsx)
  const rows = await xlsxToRows(buffer)
  return parseRows(rows)
}
