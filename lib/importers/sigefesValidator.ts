import type { ParsedLine } from './sigefesParser'

export interface ValidationCheck {
  name: string
  passed: boolean
  expected: string
  found: string
  critical: boolean
}

export interface ValidationResult {
  passed: boolean
  checks: ValidationCheck[]
}

export function validateParsedData(lines: ParsedLine[]): ValidationResult {
  const checks: ValidationCheck[] = []

  checks.push({
    name: 'Total de linhas',
    passed: lines.length === 29,
    expected: '29',
    found: String(lines.length),
    critical: true,
  })

  const detail = lines.filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal)
  checks.push({
    name: 'Linhas de detalhe',
    passed: detail.length === 24,
    expected: '24',
    found: String(detail.length),
    critical: true,
  })

  const groups = ['TESOURO', 'DEMAIS', 'SUBTOTAL', 'PREVIDENCIA', 'TOTAL']
  const foundGroups = Array.from(new Set(lines.map(l => l.groupKey).filter(Boolean))) as string[]
  const allGroupsFound = groups.every(g => foundGroups.includes(g))
  checks.push({
    name: 'Grupos identificados',
    passed: allGroupsFound,
    expected: groups.join(', '),
    found: foundGroups.join(', '),
    critical: true,
  })

  const anyVINonZero = lines.some(l => l.colVI !== 0)
  checks.push({
    name: 'Coluna VI zerada no import',
    passed: !anyVINonZero,
    expected: 'Todos zeros (preenchimento manual posterior)',
    found: anyVINonZero ? 'Alguns valores não-zero detectados' : 'Todos zeros ✓',
    critical: false,
  })

  const subtotal = lines.find(l => l.isSubtotal)
  const tesouro = lines.find(l => l.groupKey === 'TESOURO' && l.isGroup)
  const demais = lines.find(l => l.groupKey === 'DEMAIS' && l.isGroup)
  if (subtotal && tesouro && demais) {
    const calculatedI = tesouro.colI + demais.colI
    const tolerance = 1
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
