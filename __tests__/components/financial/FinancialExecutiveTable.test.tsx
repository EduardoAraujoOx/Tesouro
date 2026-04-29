/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import FinancialExecutiveTable, { type FinancialLineData } from '@/components/financial/FinancialExecutiveTable'

function makeRow(overrides: Partial<FinancialLineData> & { id: string; rowLabel: string }): FinancialLineData {
  return {
    rowOrder: 0,
    groupKey: null,
    isGroup: false,
    isSubtotal: false,
    isTotal: false,
    level: 0,
    colI: 0, colII: 0, colIII: 0, colIV: 0, colV: 0,
    colVI: 0, colVII: 0, colVIII: 0, colIX: 0, colX: 0,
    colXI: 0, colXII: 0,
    colVIAdjusted: 0,
    colIXAdjusted: 0,
    ...overrides,
  }
}

const CHILD_1 = makeRow({ id: 'child-1', rowLabel: 'Recursos Ordinários', level: 1 })
const CHILD_2 = makeRow({ id: 'child-2', rowLabel: 'Transferências Livres', level: 1 })

const GROUP_ROW = makeRow({
  id: 'group-1',
  rowLabel: 'RECURSOS ADMINISTRADOS PELO TESOURO',
  isGroup: true,
  colI: 1_000_000,
  colVIAdjusted: 50_000,
  colIXAdjusted: 20_000,
  children: [CHILD_1, CHILD_2],
})

const DETAIL_ROW = makeRow({
  id: 'detail-1',
  rowLabel: 'Linha de detalhe',
  colI: 500_000,
  colVIAdjusted: 0,
  colIXAdjusted: 0,
})

const SUBTOTAL_ROW = makeRow({ id: 'sub-1', rowLabel: 'SUBTOTAL', isSubtotal: true, colVIAdjusted: 0, colIXAdjusted: 0 })
const TOTAL_ROW = makeRow({ id: 'total-1', rowLabel: 'TOTAL', isTotal: true, colVIAdjusted: 0, colIXAdjusted: 0 })

// ── Column headers ─────────────────────────────────────────────────────────────

describe('FinancialExecutiveTable — column headers', () => {
  it('renders "Fonte de Recurso" sticky header', () => {
    render(<FinancialExecutiveTable rows={[]} />)
    expect(screen.getByText('Fonte de Recurso')).toBeInTheDocument()
  })

  it('renders all 7 executive column headers', () => {
    render(<FinancialExecutiveTable rows={[]} />)
    expect(screen.getByText('1. Caixa bruto de referência')).toBeInTheDocument()
    expect(screen.getByText('2. Obrigações comprometidas')).toBeInTheDocument()
    expect(screen.getByText('3. Caixa líquido atual')).toBeInTheDocument()
    expect(screen.getByText('4. Arrecadação prevista')).toBeInTheDocument()
    expect(screen.getByText('5. Total disponível')).toBeInTheDocument()
    expect(screen.getByText('6. Pressões futuras')).toBeInTheDocument()
    expect(screen.getByText('7. Saldo projetado art. 42')).toBeInTheDocument()
  })

  it('renders "Farol" header', () => {
    render(<FinancialExecutiveTable rows={[]} />)
    expect(screen.getByText('Farol')).toBeInTheDocument()
  })
})

// ── Row rendering ──────────────────────────────────────────────────────────────

describe('FinancialExecutiveTable — row rendering', () => {
  it('renders group row label', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('RECURSOS ADMINISTRADOS PELO TESOURO')).toBeInTheDocument()
  })

  it('renders detail row label', () => {
    render(<FinancialExecutiveTable rows={[DETAIL_ROW]} />)
    expect(screen.getByText('Linha de detalhe')).toBeInTheDocument()
  })

  it('renders subtotal and total rows', () => {
    render(<FinancialExecutiveTable rows={[SUBTOTAL_ROW, TOTAL_ROW]} />)
    expect(screen.getByText('SUBTOTAL')).toBeInTheDocument()
    expect(screen.getByText('TOTAL')).toBeInTheDocument()
  })

  it('renders children initially visible (group starts expanded)', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('Recursos Ordinários')).toBeInTheDocument()
    expect(screen.getByText('Transferências Livres')).toBeInTheDocument()
  })

  it('renders TrafficLightBadge for each row', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    const badges = document.querySelectorAll('[title]')
    const lightBadges = Array.from(badges).filter(b =>
      ['Verde', 'Amarelo', 'Vermelho', 'Pendente'].includes(b.getAttribute('title') ?? '')
    )
    expect(lightBadges.length).toBeGreaterThan(0)
  })
})

// ── Expand / collapse ──────────────────────────────────────────────────────────

describe('FinancialExecutiveTable — expand/collapse', () => {
  it('collapses children when group is clicked', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('Recursos Ordinários')).toBeInTheDocument()

    fireEvent.click(screen.getByText('RECURSOS ADMINISTRADOS PELO TESOURO').closest('tr')!)
    expect(screen.queryByText('Recursos Ordinários')).not.toBeInTheDocument()
    expect(screen.queryByText('Transferências Livres')).not.toBeInTheDocument()
  })

  it('re-expands children after second click', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    const groupTr = screen.getByText('RECURSOS ADMINISTRADOS PELO TESOURO').closest('tr')!

    fireEvent.click(groupTr)
    expect(screen.queryByText('Recursos Ordinários')).not.toBeInTheDocument()

    fireEvent.click(groupTr)
    expect(screen.getByText('Recursos Ordinários')).toBeInTheDocument()
  })

  it('shows ▼ indicator when group is expanded', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('shows ▶ indicator after collapsing', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    fireEvent.click(screen.getByText('RECURSOS ADMINISTRADOS PELO TESOURO').closest('tr')!)
    expect(screen.getByText('▶')).toBeInTheDocument()
  })

  it('clicking detail row does not throw', () => {
    render(<FinancialExecutiveTable rows={[DETAIL_ROW]} />)
    expect(() =>
      fireEvent.click(screen.getByText('Linha de detalhe').closest('tr')!)
    ).not.toThrow()
  })
})

// ── Values ─────────────────────────────────────────────────────────────────────

describe('FinancialExecutiveTable — formatted values', () => {
  it('formats col1 (colI) as BRL', () => {
    const row = makeRow({ id: 'r1', rowLabel: 'Teste', colI: 1_500_000, colVIAdjusted: 0, colIXAdjusted: 0 })
    render(<FinancialExecutiveTable rows={[row]} />)
    expect(screen.getByText('1.500.000,00')).toBeInTheDocument()
  })

  it('shows negative col7 value in red', () => {
    const row = makeRow({
      id: 'r-neg',
      rowLabel: 'Deficit',
      colV: 100,
      colVIAdjusted: 0,
      colIXAdjusted: 200,
    })
    render(<FinancialExecutiveTable rows={[row]} />)
    // col7 = colV - colIX = 100 - 200 = -100
    const negCell = screen.getByText('-100,00')
    expect(negCell).toHaveStyle({ color: '#dc2626' })
  })
})

// ── Footer ─────────────────────────────────────────────────────────────────────

describe('FinancialExecutiveTable — footer', () => {
  it('shows referenceDate in footer when provided', () => {
    render(<FinancialExecutiveTable rows={[DETAIL_ROW]} referenceDate="30/04/2026" />)
    expect(screen.getByText(/Posição: 30\/04\/2026/)).toBeInTheDocument()
  })

  it('shows uploadedAt in footer when provided', () => {
    render(<FinancialExecutiveTable rows={[DETAIL_ROW]} uploadedAt="01/05/2026" />)
    expect(screen.getByText(/01\/05\/2026/)).toBeInTheDocument()
  })

  it('always shows "Valores em R$" in footer', () => {
    render(<FinancialExecutiveTable rows={[]} />)
    expect(screen.getByText(/Valores em R\$/)).toBeInTheDocument()
  })

  it('shows row count including children', () => {
    render(<FinancialExecutiveTable rows={[GROUP_ROW]} />)
    // GROUP_ROW has 2 children, so total displayed = 1 + 2 = 3 linhas
    expect(screen.getByText(/3 linhas/)).toBeInTheDocument()
  })

  it('does not show date info when not provided', () => {
    render(<FinancialExecutiveTable rows={[]} />)
    expect(screen.queryByText(/Posição:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Base SIGEFES/)).not.toBeInTheDocument()
  })
})
