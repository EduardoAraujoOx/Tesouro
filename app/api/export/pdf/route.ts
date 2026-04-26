import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { computeExecutiveColumns, computeTrafficLight, formatBRL } from '@/lib/calculations/financialCalc'

// Inline minimal HTML→PDF: generates a styled HTML document the browser can print as PDF.
// We return text/html with print-media CSS so the user can Ctrl+P → Save as PDF.
// This avoids heavy server-side PDF libs and works perfectly for A4 landscape.

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
    return new NextResponse('<p>Nenhum dado disponível.</p>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Log export
  await prisma.pdfExport.create({
    data: { monthRef: upload.monthRef, generatedById: session.user!.id! },
  })

  const refDate = upload.referenceDate ?? upload.monthRef
  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const LIGHT_PT: Record<string, string> = {
    VERDE: 'VERDE', AMARELO: 'AMARELO', VERMELHO: 'VERMELHO', CINZA: 'CINZA',
  }
  const LIGHT_COLOR: Record<string, string> = {
    VERDE: '#16a34a', AMARELO: '#d97706', VERMELHO: '#dc2626', CINZA: '#6b7280',
  }

  function rowHtml(line: typeof upload.lines[0], indent: number) {
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
    const bold = line.isGroup || line.isSubtotal || line.isTotal
    const bg   = line.isTotal ? '#f1f5f9' : line.isSubtotal ? '#f8fafc' : line.isGroup ? '#eff6ff' : 'transparent'
    const dot  = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${LIGHT_COLOR[light]};margin-right:4px;vertical-align:middle"></span>`

    const cells = cols.map(v => {
      const neg = v < 0
      return `<td class="num" style="color:${neg ? '#dc2626' : 'inherit'}">${formatBRL(v)}</td>`
    }).join('')

    return `<tr style="background:${bg}">
      <td style="padding-left:${8 + indent * 12}px;font-weight:${bold ? 600 : 400};font-size:${bold ? 10 : 9}px">
        ${dot}${escHtml(line.rowLabel)}
      </td>
      ${cells}
    </tr>`
  }

  const rowsHtml = upload.lines.map(l => rowHtml(l, l.level)).join('\n')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Radar Fiscal ES — ${refDate}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 9px; color: #111; margin: 0; }
  h1 { font-size: 13px; margin: 0 0 2px; }
  .sub { font-size: 9px; color: #555; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: white; padding: 5px 6px; font-size: 8px; text-align: right; white-space: nowrap; }
  th:first-child { text-align: left; }
  td { padding: 3px 6px; border-bottom: 0.3px solid #e2e8f0; font-size: 9px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr:hover { background: #f0f7ff; }
  .footer { margin-top: 8px; font-size: 8px; color: #777; display: flex; justify-content: space-between; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<h1>Radar de Suficiência Financeira — Art. 42 LRF</h1>
<div class="sub">
  Posição: <strong>${escHtml(refDate)}</strong> &nbsp;|&nbsp;
  Emitido em: ${now} &nbsp;|&nbsp;
  Por: ${escHtml(session.user?.name ?? '')}
</div>
<button class="no-print" onclick="window.print()" style="margin-bottom:10px;padding:6px 14px;background:#1D4ED8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px">
  Imprimir / Salvar PDF
</button>
<table>
  <thead>
    <tr>
      <th style="width:220px">Fonte / Grupo</th>
      <th>Col 1<br/>Caixa Bruto</th>
      <th>Col 2<br/>Obrigações</th>
      <th>Col 3<br/>Caixa Líquido</th>
      <th>Col 4<br/>Arrec. Prevista</th>
      <th>Col 5<br/>Total Disponível</th>
      <th>Col 6<br/>Pressões</th>
      <th>Col 7<br/>Saldo Art. 42</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>
<div class="footer">
  <span>SEFAZ-ES — Subsecretaria do Tesouro Estadual</span>
  <span>Sistema de Monitoramento Fiscal</span>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
