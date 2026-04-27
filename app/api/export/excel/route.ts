import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import ExcelJS from 'exceljs'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { computeExecutiveColumns, computeTrafficLight } from '@/lib/calculations/financialCalc'

const HEADERS = [
  'Fonte / Grupo',
  'Col 1 — Caixa Bruto (I)',
  'Col 2 — Obrigações (II+III+IV)',
  'Col 3 — Caixa Líquido (V)',
  'Col 4 — Arrec. Prevista (VI)',
  'Col 5 — Total Disponível',
  'Col 6 — Pressões (VIII+IX)',
  'Col 7 — Saldo Art. 42',
  'Farol',
]

const LIGHT_PT: Record<string, string> = {
  VERDE: 'VERDE', AMARELO: 'AMARELO', VERMELHO: 'VERMELHO', CINZA: 'CINZA (pendente)',
}

const LIGHT_ARGB: Record<string, string> = {
  VERDE: 'FF16a34a', AMARELO: 'FFd97706', VERMELHO: 'FFdc2626', CINZA: 'FF6b7280',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  const upload = await prisma.sigefesUpload.findFirst({
    where: month ? { monthRef: month, isLatest: true } : { isLatest: true },
    orderBy: { createdAt: 'desc' },
    include: {
      lines: { orderBy: { rowOrder: 'asc' } },
      uploadedBy: { select: { name: true } },
    },
  })

  if (!upload) {
    return NextResponse.json({ error: 'Sem dados disponíveis.' }, { status: 404 })
  }

  const refDate = upload.referenceDate ?? upload.monthRef

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SEFAZ-ES — Sistema de Monitoramento Fiscal'
  wb.created = new Date()

  const ws = wb.addWorksheet('Radar Fiscal', { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] })

  // ── Title rows ───────────────────────────────────────────────────────────
  ws.mergeCells('A1:I1')
  ws.getCell('A1').value = `Radar de Suficiência Financeira — Art. 42 LRF  |  Posição: ${refDate}`
  ws.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1e3a5f' } }
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdbeafe' } }

  ws.mergeCells('A2:I2')
  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  ws.getCell('A2').value = `Emitido em: ${now}  |  Por: ${session.user?.name ?? ''}  |  Importado por: ${upload.uploadedBy.name}`
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF555555' } }
  ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf8fafc' } }

  // ── Column headers ───────────────────────────────────────────────────────
  const headerRow = ws.getRow(3)
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } }
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF93c5fd' } } }
  })
  headerRow.height = 28

  // ── Column widths ────────────────────────────────────────────────────────
  ws.getColumn(1).width = 38
  for (let c = 2; c <= 8; c++) ws.getColumn(c).width = 20
  ws.getColumn(9).width = 16

  // ── Data rows ────────────────────────────────────────────────────────────
  const numFmt = '#,##0.00'

  upload.lines.forEach(line => {
    const ec = computeExecutiveColumns({
      colI: line.colI, colII: line.colII, colIII: line.colIII, colIV: line.colIV,
      colV: line.colV, colVI: line.colVI, colVIAdjusted: line.colVIAdjusted,
      colVIII: line.colVIII, colIX: line.colIX, colIXAdjusted: line.colIXAdjusted,
    })
    const light = computeTrafficLight(
      ec.col7, ec.col1,
      line.colVIAdjusted !== null,
      line.colIXAdjusted !== null,
    )
    const cols = [ec.col1, ec.col2, ec.col3, ec.col4, ec.col5, ec.col6, ec.col7]

    const row = ws.addRow([
      line.rowLabel,
      ...cols,
      LIGHT_PT[light],
    ])
    row.height = line.isGroup ? 16 : 14

    // Label cell indentation + style
    const labelCell = row.getCell(1)
    labelCell.alignment = { indent: line.level, horizontal: 'left', vertical: 'middle' }
    labelCell.font = {
      bold: line.isGroup || line.isSubtotal || line.isTotal,
      size: line.isGroup ? 10 : 9,
    }

    // Row background
    const bgMap: Record<string, string> = {
      group: 'FFeff6ff', subtotal: 'FFf8fafc', total: 'FFf1f5f9',
    }
    const bg = line.isTotal ? bgMap.total : line.isSubtotal ? bgMap.subtotal : line.isGroup ? bgMap.group : 'FFFFFFFF'
    for (let c = 1; c <= 9; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      row.getCell(c).border = { bottom: { style: 'hair', color: { argb: 'FFe2e8f0' } } }
    }

    // Number cells
    for (let c = 2; c <= 8; c++) {
      const cell = row.getCell(c)
      cell.numFmt = numFmt
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
      const v = cols[c - 2]
      if (v < 0) cell.font = { ...cell.font, color: { argb: 'FFdc2626' } }
    }

    // Farol cell
    const lightCell = row.getCell(9)
    lightCell.font = { bold: true, size: 9, color: { argb: LIGHT_ARGB[light] } }
    lightCell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // ── Autofilter ───────────────────────────────────────────────────────────
  ws.autoFilter = { from: 'A3', to: 'I3' }

  // ── Second sheet: technical columns ─────────────────────────────────────
  const ws2 = wb.addWorksheet('Colunas Técnicas')
  const techHeaders = [
    'Fonte / Grupo',
    'I — Disp. Fin. Bruta', 'II — Obrig. Financeiras', 'III — Obrig. s/ AO (LRF)',
    'IV — Créd. Emp. a Liquidar', 'V — Disp. Líquida',
    'VI — Arrec. Prevista (SUBSET)', 'VIII — Cota Lib. a Empenhar',
    'IX — Pressões SEP', 'XI — Cota a Fixar', 'XII — Cota Bloqueada',
  ]
  ws2.getColumn(1).width = 38
  for (let c = 2; c <= 11; c++) ws2.getColumn(c).width = 18

  const th2 = ws2.getRow(1)
  techHeaders.forEach((h, i) => {
    const cell = th2.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } }
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle', wrapText: true }
  })
  th2.height = 28

  upload.lines.forEach(line => {
    const viEff  = line.colVIAdjusted !== null ? line.colVIAdjusted : line.colVI
    const ixEff  = line.colIXAdjusted !== null ? line.colIXAdjusted : line.colIX
    const r = ws2.addRow([
      line.rowLabel,
      line.colI, line.colII, line.colIII, line.colIV, line.colV,
      viEff, line.colVIII, ixEff, line.colXI, line.colXII,
    ])
    r.height = 13
    r.getCell(1).font = { bold: line.isGroup || line.isTotal, size: 9 }
    r.getCell(1).alignment = { indent: line.level }
    for (let c = 2; c <= 11; c++) {
      r.getCell(c).numFmt = numFmt
      r.getCell(c).alignment = { horizontal: 'right' }
    }
  })

  // ── Serialize and return ─────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer()
  const filename = `radar_fiscal_${upload.monthRef}.xlsx`

  return new NextResponse(buf as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
