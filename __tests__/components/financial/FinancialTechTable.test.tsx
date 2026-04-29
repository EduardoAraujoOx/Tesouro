/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import FinancialTechTable from '@/components/financial/FinancialTechTable'
import type { FinancialLineData } from '@/components/financial/FinancialExecutiveTable'

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
    colVIAdjusted: null,
    colIXAdjusted: null,
    ...overrides,
  }
}

const CHILD_A = makeRow({ id: 'child-a', rowLabel: 'Filho A', level: 1 })
const CHILD_B = makeRow({ id: 'child-b', rowLabel: 'Filho B', level: 1 })

const GROUP_ROW = makeRow({
  id: 'grp-1',
  rowLabel: 'RECURSOS DO TESOURO',
  isGroup: true,
  children: [CHILD_A, CHILD_B],
})

// ── Column headers ─────────────────────────────────────────────────────────────

describe('FinancialTechTable — column headers', () => {
  it('renders "Fonte de Recurso" header', () => {
    render(<FinancialTechTable rows={[]} />)
    expect(screen.getByText('Fonte de Recurso')).toBeInTheDocument()
  })

  it('renders all 12 roman-numeral column headers', () => {
    render(<FinancialTechTable rows={[]} />)
    for (const label of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']) {
      const matches = screen.getAllByText(label)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders manual column descriptions in header', () => {
    render(<FinancialTechTable rows={[]} />)
    expect(screen.getByText(/Arrecadação a Realizar/)).toBeInTheDocument()
    expect(screen.getByText(/Pressões Orçamentárias/)).toBeInTheDocument()
  })
})

// ── Row rendering ──────────────────────────────────────────────────────────────

describe('FinancialTechTable — row rendering', () => {
  it('renders group row label', () => {
    render(<FinancialTechTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('RECURSOS DO TESOURO')).toBeInTheDocument()
  })

  it('renders children initially visible', () => {
    render(<FinancialTechTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('Filho A')).toBeInTheDocument()
    expect(screen.getByText('Filho B')).toBeInTheDocument()
  })

  it('renders footer text', () => {
    render(<FinancialTechTable rows={[]} />)
    expect(screen.getByText(/VI e IX: preenchimento manual/)).toBeInTheDocument()
    expect(screen.getByText(/Valores em R\$/)).toBeInTheDocument()
  })
})

// ── Expand / collapse ──────────────────────────────────────────────────────────

describe('FinancialTechTable — expand/collapse', () => {
  it('hides children when group is clicked', () => {
    render(<FinancialTechTable rows={[GROUP_ROW]} />)
    fireEvent.click(screen.getByText('RECURSOS DO TESOURO').closest('tr')!)
    expect(screen.queryByText('Filho A')).not.toBeInTheDocument()
    expect(screen.queryByText('Filho B')).not.toBeInTheDocument()
  })

  it('shows children again after second click', () => {
    render(<FinancialTechTable rows={[GROUP_ROW]} />)
    const tr = screen.getByText('RECURSOS DO TESOURO').closest('tr')!
    fireEvent.click(tr)
    fireEvent.click(tr)
    expect(screen.getByText('Filho A')).toBeInTheDocument()
  })

  it('shows ▼ when expanded', () => {
    render(<FinancialTechTable rows={[GROUP_ROW]} />)
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('shows ▶ when collapsed', () => {
    render(<FinancialTechTable rows={[GROUP_ROW]} />)
    fireEvent.click(screen.getByText('RECURSOS DO TESOURO').closest('tr')!)
    expect(screen.getByText('▶')).toBeInTheDocument()
  })
})

// ── getVal derived columns ─────────────────────────────────────────────────────

describe('FinancialTechTable — getVal derived columns', () => {
  it('colVI: uses colVIAdjusted when set', () => {
    // colVI=100 is ignored; adjusted=999 should appear (also shows in colVII = 0+999)
    const row = makeRow({ id: 'vi-adj', rowLabel: 'VI-Test', colVI: 100, colVIAdjusted: 999 })
    render(<FinancialTechTable rows={[row]} />)
    expect(screen.getAllByText('999,00').length).toBeGreaterThanOrEqual(1)
    // raw colVI=100 should not appear since adjusted overrides it
    expect(screen.queryByText('100,00')).not.toBeInTheDocument()
  })

  it('colVI: falls back to colVI when adjusted is null', () => {
    // colVI=777, no adjusted; also shows in colVII = 0+777
    const row = makeRow({ id: 'vi-raw', rowLabel: 'VI-Raw', colVI: 777, colVIAdjusted: null })
    render(<FinancialTechTable rows={[row]} />)
    expect(screen.getAllByText('777,00').length).toBeGreaterThanOrEqual(1)
  })

  it('colVII = colV + effective colVI', () => {
    // colV=400, adjusted_VI=200 → VII=600; colX=(400+200)-0-0=600 also 600
    const row = makeRow({ id: 'vii', rowLabel: 'VII-Test', colV: 400, colVI: 100, colVIAdjusted: 200 })
    render(<FinancialTechTable rows={[row]} />)
    // 600 appears in both VII and X (since colVIII=0, colIX=0)
    expect(screen.getAllByText('600,00').length).toBe(2)
  })

  it('colIX: uses colIXAdjusted when set', () => {
    const row = makeRow({ id: 'ix-adj', rowLabel: 'IX-Test', colIX: 50, colIXAdjusted: 888 })
    render(<FinancialTechTable rows={[row]} />)
    expect(screen.getAllByText('888,00').length).toBeGreaterThanOrEqual(1)
    // raw colIX=50 should not appear since adjusted overrides it
    expect(screen.queryByText('50,00')).not.toBeInTheDocument()
  })

  it('colIX: falls back to colIX when adjusted is null', () => {
    const row = makeRow({ id: 'ix-raw', rowLabel: 'IX-Raw', colIX: 333, colIXAdjusted: null })
    render(<FinancialTechTable rows={[row]} />)
    expect(screen.getAllByText('333,00').length).toBeGreaterThanOrEqual(1)
  })

  it('colX = (colV + effective VI) - colVIII - effective IX', () => {
    const row = makeRow({
      id: 'x-test',
      rowLabel: 'X-Test',
      colV: 1000,
      colVI: 0,
      colVIAdjusted: 200,
      colVIII: 300,
      colIX: 0,
      colIXAdjusted: 100,
    })
    render(<FinancialTechTable rows={[row]} />)
    // colX = (1000 + 200) - 300 - 100 = 800
    expect(screen.getByText('800,00')).toBeInTheDocument()
  })

  it('negative colX shown in red', () => {
    const row = makeRow({
      id: 'x-neg',
      rowLabel: 'X-Neg',
      colV: 100,
      colVIAdjusted: 0,
      colVIII: 500,
      colIXAdjusted: 0,
    })
    render(<FinancialTechTable rows={[row]} />)
    // colX = (100 + 0) - 500 - 0 = -400
    const negCell = screen.getByText('-400,00')
    expect(negCell).toHaveStyle({ color: '#dc2626' })
  })
})

// ── Footer ─────────────────────────────────────────────────────────────────────

describe('FinancialTechTable — footer', () => {
  it('shows referenceDate when provided', () => {
    render(<FinancialTechTable rows={[]} referenceDate="30/04/2026" />)
    expect(screen.getByText(/Posição: 30\/04\/2026/)).toBeInTheDocument()
  })

  it('does not show referenceDate when not provided', () => {
    render(<FinancialTechTable rows={[]} />)
    expect(screen.queryByText(/Posição:/)).not.toBeInTheDocument()
  })
})
