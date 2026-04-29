/**
 * Testes do sigefesParser com mocks de ExcelJS e SheetJS.
 * Não precisamos de arquivos .xls/.xlsx reais — controlamos os dados
 * que os readers retornam via mock e validamos a lógica de parse.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

// SheetJS (.xls) — mock declarado antes dos imports (jest.mock é hoisted)
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}))

// ExcelJS (.xlsx) — Workbook como jest.fn() para ser configurado por teste
jest.mock('exceljs', () => ({
  __esModule: true,
  default: { Workbook: jest.fn() },
}))

import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { parseSigefesSpreadsheet } from '@/lib/importers/sigefesParser'

// Magic bytes OLE2 = .xls
const XLS_BUF = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0])
// Sem magic bytes OLE2 = .xlsx
const XLSX_BUF = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])

// Planilha SIGEFES mínima válida (linhas como array 0-indexed)
const ROWS_VALIDAS = [
  ['Planilha SIGEFES — Posição: 30/04/2026'],
  [],
  ['PODER EXECUTIVO'],
  ['RECURSOS ADMINISTRADOS PELO TESOURO', 1000, 200, 50, 30, 720, 0, 0, 300, 0, 0, 100, 50],
  ['   Recursos Ordinários',               500,  100, 25, 15, 360, 0, 0, 150, 0, 0,  50, 25],
  ['   Transferências Constitucionais',    500,  100, 25, 15, 360, 0, 0, 150, 0, 0,  50, 25],
  ['DEMAIS RECURSOS - PODER EXECUTIVO',   800,  150, 30, 20, 600, 0, 0, 200, 0, 0,  80, 40],
  ['   Recursos Vinculados à Educação',   400,   75, 15, 10, 300, 0, 0, 100, 0, 0,  40, 20],
  ['   Recursos Vinculados à Saúde',      400,   75, 15, 10, 300, 0, 0, 100, 0, 0,  40, 20],
  ['SUBTOTAL',                           1800,  350, 80, 50,1320, 0, 0, 500, 0, 0, 180, 90],
  ['RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL', 600, 100, 20, 10, 470, 0, 0, 150, 0, 0, 60, 30],
  ['   RPPS',                             600,  100, 20, 10, 470, 0, 0, 150, 0, 0,  60, 30],
  ['TOTAL',                              2400,  450,100, 60,1790, 0, 0, 650, 0, 0, 240,120],
]

function setupXlsxMock(rows: any[][]) {
  const MockWorkbook = jest.mocked(ExcelJS.Workbook) as jest.MockedClass<any>
  MockWorkbook.mockImplementation(() => ({
    xlsx: { load: jest.fn().mockResolvedValue(undefined) },
    worksheets: [{
      eachRow: (_opts: any, cb: (row: any, i: number) => void) => {
        rows.forEach((r, i) => cb({ values: [null, ...r] }, i + 1))
      },
    }],
  }))
}

function setupXlsMock(rows: any[][]) {
  jest.mocked(XLSX.read).mockReturnValue(
    { SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } } as any
  )
  jest.mocked(XLSX.utils.sheet_to_json).mockReturnValue(rows as any)
}

beforeEach(() => jest.clearAllMocks())

// ── Detecção de formato ───────────────────────────────────────────────────────

describe('parseSigefesSpreadsheet — detecção de formato', () => {
  it('usa SheetJS quando buffer começa com magic bytes OLE2 (.xls)', async () => {
    setupXlsMock(ROWS_VALIDAS)
    await parseSigefesSpreadsheet(XLS_BUF)
    expect(XLSX.read).toHaveBeenCalledWith(XLS_BUF, { type: 'buffer' })
  })

  it('usa ExcelJS quando buffer não tem magic bytes OLE2 (.xlsx)', async () => {
    setupXlsxMock(ROWS_VALIDAS)
    await parseSigefesSpreadsheet(XLSX_BUF)
    expect(ExcelJS.Workbook).toHaveBeenCalled()
  })

  it('não usa SheetJS para arquivo .xlsx', async () => {
    setupXlsxMock(ROWS_VALIDAS)
    await parseSigefesSpreadsheet(XLSX_BUF)
    expect(XLSX.read).not.toHaveBeenCalled()
  })
})

// ── Data de referência ────────────────────────────────────────────────────────

describe('parseSigefesSpreadsheet — data de referência', () => {
  it('extrai referenceDate da célula com "Posição:"', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const result = await parseSigefesSpreadsheet(XLS_BUF)
    expect(result.referenceDate).toBe('30/04/2026')
  })

  it('extrai monthRef no formato YYYY-MM', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const result = await parseSigefesSpreadsheet(XLS_BUF)
    expect(result.monthRef).toBe('2026-04')
  })

  it('referenceDate é null quando célula não encontrada', async () => {
    setupXlsMock([['Planilha sem data'], ['PODER EXECUTIVO'], ['TOTAL', 100]])
    const result = await parseSigefesSpreadsheet(XLS_BUF)
    expect(result.referenceDate).toBeNull()
  })
})

// ── Erros de parse ────────────────────────────────────────────────────────────

describe('parseSigefesSpreadsheet — erros', () => {
  it('retorna erro quando cabeçalho "PODER EXECUTIVO" não encontrado', async () => {
    setupXlsMock([['Planilha sem cabeçalho esperado']])
    const result = await parseSigefesSpreadsheet(XLS_BUF)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/cabeçalho/i)
  })

  it('retorna erro quando nenhuma linha de dados após cabeçalho', async () => {
    setupXlsMock([['Posição: 30/04/2026'], ['PODER EXECUTIVO']])
    const result = await parseSigefesSpreadsheet(XLS_BUF)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/nenhuma linha/i)
  })

  it('retorna linhas vazias e sem erros para planilha válida', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const result = await parseSigefesSpreadsheet(XLS_BUF)
    expect(result.errors).toHaveLength(0)
    expect(result.lines.length).toBeGreaterThan(0)
  })
})

// ── Classificação das linhas ──────────────────────────────────────────────────

describe('parseSigefesSpreadsheet — classificação das linhas', () => {
  it('identifica linha de grupo corretamente', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const tesouro = lines.find(l => l.rowLabel.includes('TESOURO') && l.isGroup)
    expect(tesouro).toBeDefined()
    expect(tesouro?.isSubtotal).toBe(false)
    expect(tesouro?.isTotal).toBe(false)
    expect(tesouro?.level).toBe(0)
  })

  it('identifica linha de subtotal corretamente', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const subtotal = lines.find(l => l.isSubtotal)
    expect(subtotal).toBeDefined()
    expect(subtotal?.rowLabel).toBe('SUBTOTAL')
    expect(subtotal?.isGroup).toBe(false)
  })

  it('identifica linha de total corretamente', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const total = lines.find(l => l.isTotal)
    expect(total?.rowLabel).toBe('TOTAL')
    expect(total?.isGroup).toBe(false)
  })

  it('linhas com indentação têm level = 1', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const detalhe = lines.find(l => l.rowLabel === 'Recursos Ordinários')
    expect(detalhe?.level).toBe(1)
    expect(detalhe?.isGroup).toBe(false)
  })

  it('linhas de detalhe herdam groupKey do grupo anterior', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const detalhe = lines.find(l => l.rowLabel === 'Recursos Ordinários')
    expect(detalhe?.groupKey).toBe('TESOURO')
  })

  it('rowOrder é sequencial a partir de 0', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    lines.forEach((l, i) => expect(l.rowOrder).toBe(i))
  })
})

// ── Valores numéricos ─────────────────────────────────────────────────────────

describe('parseSigefesSpreadsheet — valores numéricos', () => {
  it('lê colI corretamente', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const tesouro = lines.find(l => l.rowLabel.includes('TESOURO') && l.isGroup)
    expect(tesouro?.colI).toBe(1000)
  })

  it('colVI é sempre zero no import (preenchimento manual posterior)', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    lines.forEach(l => expect(l.colVI).toBe(0))
  })

  it('lê colVIII da coluna correta (índice 8)', async () => {
    setupXlsMock(ROWS_VALIDAS)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const tesouro = lines.find(l => l.rowLabel.includes('TESOURO') && l.isGroup)
    expect(tesouro?.colVIII).toBe(300)
  })

  it('trata células nulas como zero', async () => {
    const rowsComNull = [
      ...ROWS_VALIDAS.slice(0, 3),
      ['RECURSOS ADMINISTRADOS PELO TESOURO', null, null, null, null, null, null, null, null],
    ]
    setupXlsMock(rowsComNull)
    const { lines } = await parseSigefesSpreadsheet(XLS_BUF)
    const tesouro = lines.find(l => l.isGroup && l.rowLabel.includes('TESOURO'))
    expect(tesouro?.colI).toBe(0)
    expect(tesouro?.colII).toBe(0)
  })
})
