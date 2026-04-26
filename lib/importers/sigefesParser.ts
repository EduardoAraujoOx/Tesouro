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

export function parseSigefesSpreadsheet(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  const result: ParseResult = { lines: [], referenceDate: null, monthRef: null, errors: [] }

  if (rows[2]?.[0] && String(rows[2][0]).includes('Posição:')) {
    const dateStr = String(rows[2][0]).replace('Posição:', '').trim()
    result.referenceDate = dateStr
    const parts = dateStr.split('/')
    if (parts.length === 3) result.monthRef = `${parts[2]}-${parts[1]}`
  }

  let dataStart = -1
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i]?.[0] && String(rows[i][0]).toLowerCase().includes('poder executivo')) {
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
      colI: numVal(row, 1), colII: numVal(row, 2), colIII: numVal(row, 3), colIV: numVal(row, 4),
      colV: numVal(row, 5),
      colVI: 0,
      colVII: 0,
      colVIII: numVal(row, 8),
      colIX: 0,
      colX: 0,
      colXI: numVal(row, 11), colXII: numVal(row, 12),
    })
  }

  if (result.lines.length === 0) {
    result.errors.push('Nenhuma linha encontrada. Verifique o formato.')
  }
  return result
}
