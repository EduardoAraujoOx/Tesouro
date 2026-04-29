import { monthLabel } from '@/lib/utils/formatMonth'

describe('monthLabel', () => {
  it('formata janeiro', () => {
    expect(monthLabel('2026-01')).toBe('Jan/2026')
  })

  it('formata fevereiro', () => {
    expect(monthLabel('2026-02')).toBe('Fev/2026')
  })

  it('formata todos os meses do ano', () => {
    const esperado = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ]
    esperado.forEach((abrev, i) => {
      const mes = String(i + 1).padStart(2, '0')
      expect(monthLabel(`2026-${mes}`)).toBe(`${abrev}/2026`)
    })
  })

  it('funciona com diferentes anos', () => {
    expect(monthLabel('2024-06')).toBe('Jun/2024')
    expect(monthLabel('2027-12')).toBe('Dez/2027')
  })

  it('funciona com mês sem zero à esquerda (robustez)', () => {
    // parseInt('3') funciona corretamente
    expect(monthLabel('2026-3')).toBe('Mar/2026')
  })
})
