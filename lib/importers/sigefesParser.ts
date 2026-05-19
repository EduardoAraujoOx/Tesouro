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

  const MONTH_MAP: Record<string, string> = {
    JANEIRO: '01', FEVEREIRO: '02', 'MARÇO': '03', ABRIL: '04',
    MAIO: '05', JUNHO: '06', JULHO: '07', AGOSTO: '08',
    SETEMBRO: '09', OUTUBRO: '10', NOVEMBRO: '11', DEZEMBRO: '12',
  }

  // Search first 15 rows for "POSIÇÃO:" (case-insensitive, handles accents)
  outer: for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    for (let j = 0; j < Math.min((rawRows[i] ?? []).length, 6); j++) {
      const cell = str(rawRows[i]?.[j])
      if (cell && cell.toLowerCase().includes('posição:')) {
        const colonIdx = cell.indexOf(':')
        const dateStr = cell.slice(colonIdx + 1).trim()
        result.referenceDate = dateStr
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          // Format: DD/MM/YYYY
          result.monthRef = `${parts[2]}-${parts[1]}`
        } else {
          // Format: "ABRIL DE 2026" or "ABRIL 2026"
          const upper = dateStr.toUpperCase()
          const yearMatch = upper.match(/\d{4}/)
          if (yearMatch) {
            for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
              if (upper.includes(monthName)) {
                result.monthRef = `${yearMatch[0]}-${monthNum}`
                break
              }
            }
          }
        }
        break outer
      }
    }
  }

  let dataStart = -1
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    // Only check col 0: the header label row has "Poder Executivo" in col 0.
    // The SUGOV report title (col 1) also contains "PODER EXECUTIVO" and must not
    // be mistaken for the header row.
    const cell = str(rawRows[i]?.[0])
    if (cell && cell.toLowerCase().includes('poder executivo')) {
      dataStart = i + 1; break
    }
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

  // Detect format by inspecting column 9 of the header row.
  // Old format has a "Pressões" column at position 9, shifting IX/X/XI to cols 10/11/12.
  // New format removed that column, so IX/X/XI are at cols 9/10/11.
  const headerRow = rawRows[dataStart - 1] ?? []
  const col9Header = (str(headerRow[9]) ?? '').toLowerCase()
  const hasPressoesCol = col9Header.includes('press')

  let rowOrder = 0
  let currentGroup: string | null = null

  for (let i = dataStart; i < rawRows.length; i++) {
    const row = rawRows[i]
    const rawLabelRaw = row?.[0]
    if (rawLabelRaw === null || rawLabelRaw === undefined) continue
    const rawLabel = str(rawLabelRaw) ?? ''
    if (!rawLabel.trim() || rawLabel.toLowerCase().includes('sistema integrado')) continue

    const label = rawLabel.trim()
    const firstNonSpace = rawLabel.search(/\S/)
    const leadingSpaces = firstNonSpace === -1 ? rawLabel.length : firstNonSpace
    const actualLevel = Math.floor(leadingSpaces / 3)

    // Discard level-2+ rows (individual funds/agencies): their parent at level 1
    // already carries the pre-totaled values in the source file.
    if (actualLevel > 1) continue

    let isGroup = false, isSubtotal = false, isTotal = false
    let groupKey: string | null = null
    let level = actualLevel > 0 ? 1 : 0

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
      // Old format: col9="Pressões"(ignored), col10=IX-not-mapped, col11=XI, col12=XII
      // New format: col9=IX, col10=X, col11=XI (no col12)
      colIX:   hasPressoesCol ? 0 : num(row[9]),
      colX:    hasPressoesCol ? 0 : num(row[10]),
      colXI:   num(row[11]),
      colXII:  hasPressoesCol ? num(row[12]) : 0,
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
