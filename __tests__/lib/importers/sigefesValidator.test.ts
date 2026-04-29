import { validateParsedData } from '@/lib/importers/sigefesValidator'
import type { ParsedLine } from '@/lib/importers/sigefesParser'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeLine(overrides: Partial<ParsedLine> = {}): ParsedLine {
  return {
    rowOrder: 0, rowLabel: 'Recursos Ordinários', groupKey: 'TESOURO',
    isGroup: false, isSubtotal: false, isTotal: false, level: 1,
    colI: 1000, colII: 200, colIII: 50, colIV: 30, colV: 720,
    colVI: 0, colVII: 0, colVIII: 300, colIX: 0, colX: 0,
    colXI: 100, colXII: 50,
    ...overrides,
  }
}

function makeGroup(groupKey: string, colI = 1000): ParsedLine {
  return makeLine({ rowLabel: groupKey, groupKey, isGroup: true, level: 0, colI })
}

function makeSubtotal(colI = 2000): ParsedLine {
  return makeLine({ rowLabel: 'SUBTOTAL', groupKey: 'SUBTOTAL', isSubtotal: true, isGroup: false, level: 0, colI })
}

function makeTotal(): ParsedLine {
  return makeLine({ rowLabel: 'TOTAL', groupKey: 'TOTAL', isTotal: true, isGroup: false, level: 0 })
}

// Conjunto mínimo válido: grupos + 25+ linhas
function makeValidLines(): ParsedLine[] {
  const lines: ParsedLine[] = [
    makeGroup('TESOURO', 1000),
    ...Array.from({ length: 10 }, (_, i) => makeLine({ rowOrder: i + 1, groupKey: 'TESOURO' })),
    makeGroup('DEMAIS', 1000),
    ...Array.from({ length: 10 }, (_, i) => makeLine({ rowOrder: i + 12, groupKey: 'DEMAIS' })),
    makeSubtotal(2000), // TESOURO (1000) + DEMAIS (1000) = 2000
    makeGroup('PREVIDENCIA'),
    ...Array.from({ length: 3 }, (_, i) => makeLine({ rowOrder: i + 24, groupKey: 'PREVIDENCIA' })),
    makeTotal(),
  ]
  return lines
}

// ── Total de linhas ───────────────────────────────────────────────────────────

describe('validateParsedData — total de linhas', () => {
  it('passa com 26 linhas (dentro do intervalo 25-40)', () => {
    const result = validateParsedData(makeValidLines())
    const check = result.checks.find(c => c.name === 'Total de linhas')!
    expect(check.passed).toBe(true)
  })

  it('falha com menos de 25 linhas', () => {
    const lines = makeValidLines().slice(0, 10)
    const check = validateParsedData(lines).checks.find(c => c.name === 'Total de linhas')!
    expect(check.passed).toBe(false)
  })

  it('falha com mais de 40 linhas', () => {
    const lines = [
      ...makeValidLines(),
      ...Array.from({ length: 20 }, (_, i) => makeLine({ rowOrder: 100 + i })),
    ]
    const check = validateParsedData(lines).checks.find(c => c.name === 'Total de linhas')!
    expect(check.passed).toBe(false)
  })

  it('check não é crítico', () => {
    const check = validateParsedData(makeValidLines()).checks.find(c => c.name === 'Total de linhas')!
    expect(check.critical).toBe(false)
  })
})

// ── Grupos identificados ──────────────────────────────────────────────────────

describe('validateParsedData — grupos identificados', () => {
  it('passa quando todos os 5 grupos estão presentes', () => {
    const result = validateParsedData(makeValidLines())
    const check = result.checks.find(c => c.name === 'Grupos identificados')!
    expect(check.passed).toBe(true)
  })

  it('falha quando falta grupo PREVIDENCIA', () => {
    const lines = makeValidLines().filter(l => l.groupKey !== 'PREVIDENCIA')
    const check = validateParsedData(lines).checks.find(c => c.name === 'Grupos identificados')!
    expect(check.passed).toBe(false)
  })

  it('falha quando falta grupo TESOURO', () => {
    const lines = makeValidLines().filter(l => l.groupKey !== 'TESOURO')
    const check = validateParsedData(lines).checks.find(c => c.name === 'Grupos identificados')!
    expect(check.passed).toBe(false)
  })

  it('check é crítico (determina result.passed)', () => {
    const check = validateParsedData(makeValidLines()).checks.find(c => c.name === 'Grupos identificados')!
    expect(check.critical).toBe(true)
  })
})

// ── Coluna VI zerada ──────────────────────────────────────────────────────────

describe('validateParsedData — coluna VI zerada no import', () => {
  it('passa quando todas as linhas têm colVI = 0', () => {
    const check = validateParsedData(makeValidLines()).checks.find(c => c.name === 'Coluna VI zerada no import')!
    expect(check.passed).toBe(true)
  })

  it('falha quando alguma linha tem colVI diferente de 0', () => {
    const lines = makeValidLines()
    lines[1] = { ...lines[1], colVI: 500 }
    const check = validateParsedData(lines).checks.find(c => c.name === 'Coluna VI zerada no import')!
    expect(check.passed).toBe(false)
  })
})

// ── Somatório do Subtotal ─────────────────────────────────────────────────────

describe('validateParsedData — somatório do Subtotal (col I)', () => {
  it('passa quando subtotal = TESOURO + DEMAIS (exato)', () => {
    const check = validateParsedData(makeValidLines()).checks.find(c => c.name === 'Somatório do Subtotal (col I)')!
    expect(check.passed).toBe(true)
  })

  it('passa com diferença de até 1 (tolerância de arredondamento)', () => {
    const lines = makeValidLines()
    const idx = lines.findIndex(l => l.isSubtotal)
    lines[idx] = { ...lines[idx], colI: 2001 } // 1 a mais mas dentro da tolerância
    const check = validateParsedData(lines).checks.find(c => c.name === 'Somatório do Subtotal (col I)')!
    expect(check.passed).toBe(true)
  })

  it('falha quando diferença é maior que 1', () => {
    const lines = makeValidLines()
    const idx = lines.findIndex(l => l.isSubtotal)
    lines[idx] = { ...lines[idx], colI: 2002 }
    const check = validateParsedData(lines).checks.find(c => c.name === 'Somatório do Subtotal (col I)')!
    expect(check.passed).toBe(false)
  })
})

// ── result.passed (crítico) ───────────────────────────────────────────────────

describe('validateParsedData — result.passed', () => {
  it('true quando todos os checks críticos passam', () => {
    expect(validateParsedData(makeValidLines()).passed).toBe(true)
  })

  it('false quando grupos estão faltando (único check crítico)', () => {
    const lines = makeValidLines().filter(l => l.groupKey !== 'TESOURO')
    expect(validateParsedData(lines).passed).toBe(false)
  })

  it('true mesmo com checks não-críticos falhando (ex: total de linhas)', () => {
    // Menos de 25 linhas, mas grupos presentes → passed = true (não é crítico)
    const lines = makeValidLines().slice(0, 10)
    // Mantemos um de cada grupo
    const grupos = [
      makeGroup('TESOURO'), makeGroup('DEMAIS'), makeSubtotal(),
      makeGroup('PREVIDENCIA'), makeTotal(),
    ]
    const result = validateParsedData(grupos)
    expect(result.passed).toBe(true)
  })
})
