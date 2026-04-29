import {
  getEffectiveVI,
  getEffectiveIX,
  computeExecutiveColumns,
  computeTrafficLight,
  formatBRL,
} from '@/lib/calculations/financialCalc'

// ── getEffectiveVI ────────────────────────────────────────────────────────────

describe('getEffectiveVI', () => {
  it('retorna colVIAdjusted quando preenchido', () => {
    expect(getEffectiveVI(100, 200)).toBe(200)
  })

  it('retorna colVI quando adjusted é null', () => {
    expect(getEffectiveVI(100, null)).toBe(100)
  })

  it('retorna adjusted mesmo quando é zero (zero é valor válido)', () => {
    expect(getEffectiveVI(100, 0)).toBe(0)
  })
})

// ── getEffectiveIX ────────────────────────────────────────────────────────────

describe('getEffectiveIX', () => {
  it('retorna colIXAdjusted quando preenchido', () => {
    expect(getEffectiveIX(50, 80)).toBe(80)
  })

  it('retorna colIX quando adjusted é null', () => {
    expect(getEffectiveIX(50, null)).toBe(50)
  })

  it('retorna adjusted mesmo quando é zero', () => {
    expect(getEffectiveIX(50, 0)).toBe(0)
  })
})

// ── computeExecutiveColumns ───────────────────────────────────────────────────

describe('computeExecutiveColumns', () => {
  const base = {
    colI: 1000, colII: 200, colIII: 50, colIV: 30, colV: 720,
    colVI: 0, colVIAdjusted: 100,
    colVIII: 300, colIX: 0, colIXAdjusted: 80,
  }

  it('col1 = colI (caixa bruto)', () => {
    expect(computeExecutiveColumns(base).col1).toBe(1000)
  })

  it('col2 = colII + colIII + colIV (obrigações totais)', () => {
    expect(computeExecutiveColumns(base).col2).toBe(200 + 50 + 30)
  })

  it('col3 = colV (caixa líquido)', () => {
    expect(computeExecutiveColumns(base).col3).toBe(720)
  })

  it('col4 = VI efetivo (arrecadação prevista)', () => {
    expect(computeExecutiveColumns(base).col4).toBe(100)
  })

  it('col5 = col3 + col4 (total disponível)', () => {
    expect(computeExecutiveColumns(base).col5).toBe(720 + 100)
  })

  it('col6 = colVIII + IX efetivo (pressões)', () => {
    expect(computeExecutiveColumns(base).col6).toBe(300 + 80)
  })

  it('col7 = col5 - col6 (saldo Art. 42)', () => {
    expect(computeExecutiveColumns(base).col7).toBe(820 - 380)
  })

  it('usa colVI quando adjusted é null', () => {
    const c = computeExecutiveColumns({ ...base, colVI: 150, colVIAdjusted: null })
    expect(c.col4).toBe(150)
  })

  it('usa colIX quando adjusted é null', () => {
    const c = computeExecutiveColumns({ ...base, colIX: 60, colIXAdjusted: null })
    expect(c.col6).toBe(300 + 60)
  })

  it('saldo negativo quando pressões superam disponível', () => {
    const c = computeExecutiveColumns({ ...base, colVIAdjusted: 0, colIXAdjusted: 900 })
    expect(c.col7).toBeLessThan(0)
  })

  it('todos zeros produz todas as colunas zero', () => {
    const zero = {
      colI: 0, colII: 0, colIII: 0, colIV: 0, colV: 0,
      colVI: 0, colVIAdjusted: null,
      colVIII: 0, colIX: 0, colIXAdjusted: null,
    }
    const c = computeExecutiveColumns(zero)
    expect(c).toEqual({ col1: 0, col2: 0, col3: 0, col4: 0, col5: 0, col6: 0, col7: 0 })
  })
})

// ── computeTrafficLight ───────────────────────────────────────────────────────

describe('computeTrafficLight', () => {
  it('CINZA quando VI não preenchido', () => {
    expect(computeTrafficLight(100, 1000, false, true)).toBe('CINZA')
  })

  it('CINZA quando IX não preenchido', () => {
    expect(computeTrafficLight(100, 1000, true, false)).toBe('CINZA')
  })

  it('CINZA quando nenhum preenchido', () => {
    expect(computeTrafficLight(100, 1000, false, false)).toBe('CINZA')
  })

  it('VERMELHO quando col7 negativo', () => {
    expect(computeTrafficLight(-1, 1000, true, true)).toBe('VERMELHO')
  })

  it('VERMELHO quando col7 é zero negativo (-0)', () => {
    expect(computeTrafficLight(-0.01, 1000, true, true)).toBe('VERMELHO')
  })

  it('AMARELO quando col7 <= 5% do col1 (limiar)', () => {
    // 5% de 1000 = 50; col7 = 50 deve ser AMARELO
    expect(computeTrafficLight(50, 1000, true, true)).toBe('AMARELO')
  })

  it('AMARELO quando col7 está entre 0 e 5% do col1', () => {
    expect(computeTrafficLight(30, 1000, true, true)).toBe('AMARELO')
  })

  it('VERDE quando col7 > 5% do col1', () => {
    expect(computeTrafficLight(51, 1000, true, true)).toBe('VERDE')
  })

  it('VERDE quando col7 é grande positivo', () => {
    expect(computeTrafficLight(500, 1000, true, true)).toBe('VERDE')
  })

  it('VERDE quando col1 é zero e col7 positivo (evita divisão por zero)', () => {
    // Math.abs(0) * 0.05 = 0; col7 > 0 => VERDE
    expect(computeTrafficLight(1, 0, true, true)).toBe('VERDE')
  })

  it('AMARELO quando col1 é zero e col7 é zero', () => {
    expect(computeTrafficLight(0, 0, true, true)).toBe('AMARELO')
  })
})

// ── formatBRL ─────────────────────────────────────────────────────────────────

describe('formatBRL', () => {
  it('formata zero', () => {
    expect(formatBRL(0)).toBe('0,00')
  })

  it('formata inteiro positivo', () => {
    expect(formatBRL(1000)).toBe('1.000,00')
  })

  it('formata valor com decimais', () => {
    expect(formatBRL(1234.56)).toBe('1.234,56')
  })

  it('formata valor negativo', () => {
    expect(formatBRL(-500)).toBe('-500,00')
  })

  it('formata valor grande', () => {
    expect(formatBRL(1_000_000)).toBe('1.000.000,00')
  })
})
