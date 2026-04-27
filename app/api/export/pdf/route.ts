import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { FinancialLine } from '@prisma/client'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { computeExecutiveColumns, computeTrafficLight, formatBRL } from '@/lib/calculations/financialCalc'

const LOGO_URL = 'https://cdn.es.gov.br/images/logo/governo/brasao/center-white/Brasao_Governo_100.png'

const LIGHT_COLOR: Record<string, string> = {
  VERDE: '#16a34a', AMARELO: '#ca8a04', VERMELHO: '#dc2626', CINZA: '#9ca3af',
}
const LIGHT_LABEL: Record<string, string> = {
  VERDE: 'Verde', AMARELO: 'Amarelo', VERMELHO: 'Vermelho', CINZA: 'Pendente',
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
    return new NextResponse('<p>Nenhum dado disponível.</p>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  await prisma.pdfExport.create({
    data: { monthRef: upload.monthRef, generatedById: session.user!.id! },
  })

  const refDate = upload.referenceDate ?? upload.monthRef
  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  function rowHtml(line: FinancialLine) {
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
    const isHeader = line.isGroup || line.isSubtotal || line.isTotal

    let rowStyle = ''
    if (line.isTotal)    rowStyle = 'background:#1e3a5f;color:white;font-weight:700'
    else if (line.isSubtotal) rowStyle = 'background:#dbeafe;font-weight:600'
    else if (line.isGroup)    rowStyle = 'background:#eff6ff;font-weight:600'

    const indent = line.isGroup ? 0 : (line.level * 10)
    const dot = `<span class="dot" style="background:${LIGHT_COLOR[light]}" title="${LIGHT_LABEL[light]}"></span>`

    const numCells = cols.map((v, i) => {
      const isLast = i === 6
      const neg = v < 0
      let color = neg ? '#dc2626' : 'inherit'
      if (line.isTotal && neg) color = '#fca5a5'
      if (line.isTotal && !neg) color = 'white'
      return `<td class="num${isLast ? ' last' : ''}" style="color:${color}">${formatBRL(v)}</td>`
    }).join('')

    return `<tr style="${rowStyle}">
      <td class="lbl" style="padding-left:${8 + indent}px;font-size:${isHeader ? 9 : 8.5}px">
        ${dot}${esc(line.rowLabel)}
      </td>
      ${numCells}
    </tr>`
  }

  const rowsHtml = upload.lines.map(l => rowHtml(l)).join('\n')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Disponibilidade Financeira — Art. 42 LRF — ${esc(refDate)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 14mm 14mm 14mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #1a1a2e; background: white; }

  /* ── Cabeçalho institucional ── */
  .header {
    background: #1e3a5f;
    color: white;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    border-radius: 4px 4px 0 0;
    margin-bottom: 0;
  }
  .header img { height: 52px; width: auto; flex-shrink: 0; }
  .header-text { flex: 1; }
  .header-gov  { font-size: 8px; letter-spacing: 0.08em; color: rgba(255,255,255,0.55); text-transform: uppercase; margin-bottom: 2px; }
  .header-title { font-size: 13px; font-weight: 700; letter-spacing: 0.01em; line-height: 1.25; }
  .header-sub  { font-size: 8.5px; color: rgba(255,255,255,0.7); margin-top: 3px; }
  .header-meta { text-align: right; font-size: 8px; color: rgba(255,255,255,0.6); line-height: 1.6; flex-shrink: 0; }
  .header-meta strong { color: white; font-size: 9px; }

  /* ── Barra de subtítulo ── */
  .subbar {
    background: #dbeafe;
    border: 0.5px solid #bfdbfe;
    padding: 5px 14px;
    font-size: 8px;
    color: #1e3a5f;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  /* ── Tabela ── */
  table { width: 100%; border-collapse: collapse; font-size: 8.5px; }

  thead tr { background: #1e3a5f; color: white; }
  thead th {
    padding: 5px 6px;
    font-size: 8px;
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
    border-right: 0.5px solid rgba(255,255,255,0.12);
    vertical-align: bottom;
    line-height: 1.3;
  }
  thead th:first-child { text-align: left; width: 210px; }
  thead th small { display: block; font-weight: 400; font-size: 7px; color: rgba(255,255,255,0.6); margin-top: 2px; }

  tbody tr { border-bottom: 0.3px solid #e2e8f0; }
  tbody tr:nth-child(even):not([style]) { background: #fafbfc; }

  td.lbl {
    padding: 3.5px 6px;
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-right: 1px solid #e2e8f0;
  }
  td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    padding: 3.5px 6px;
    border-right: 0.3px solid #e2e8f0;
  }
  td.num.last {
    border-right: none;
    font-weight: 600;
  }

  /* ── Dot farol ── */
  .dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* ── Rodapé ── */
  .footer {
    margin-top: 7px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5px;
    color: #64748b;
    border-top: 0.5px solid #e2e8f0;
    padding-top: 5px;
  }
  .legend { display: flex; gap: 12px; align-items: center; }
  .legend-item { display: flex; align-items: center; gap: 4px; }

  /* ── Botão imprimir (não aparece no PDF) ── */
  .print-btn {
    display: inline-flex; align-items: center; gap: 6px;
    margin-bottom: 8px; padding: 7px 18px;
    background: #1e3a5f; color: white; border: none; border-radius: 5px;
    cursor: pointer; font-size: 11px; font-family: inherit;
  }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">
  🖨 Imprimir / Salvar como PDF
</button>

<!-- Cabeçalho institucional -->
<div class="header">
  <img src="${LOGO_URL}" alt="Brasão do Governo do Estado do Espírito Santo" />
  <div class="header-text">
    <div class="header-gov">Governo do Estado do Espírito Santo &nbsp;·&nbsp; Secretaria de Estado da Fazenda — SEFAZ-ES</div>
    <div class="header-title">Disponibilidade Financeira por Fonte — Poder Executivo</div>
    <div class="header-sub">Controle de Suficiência Financeira para Cumprimento do Art. 42 da Lei de Responsabilidade Fiscal</div>
  </div>
  <div class="header-meta">
    <div>Posição: <strong>${esc(refDate)}</strong></div>
    <div>Emitido em: ${now}</div>
    <div>Por: ${esc(session.user?.name ?? '')}</div>
    <div>Base: ${esc(upload.uploadedBy.name)}</div>
  </div>
</div>

<!-- Barra de subtítulo -->
<div class="subbar">
  <span>Valores em R$ (reais) &nbsp;·&nbsp; Colunas 1–7 derivadas das colunas técnicas I–XII do SIGEFES-ES</span>
  <span>Col 4 (Arrec. Prevista) e Col 6 (Pressões) incluem ajustes manuais SUBSET/SEP quando disponíveis</span>
</div>

<!-- Tabela principal -->
<table>
  <thead>
    <tr>
      <th>Fonte de Recurso</th>
      <th>Col 1<small>Caixa Bruto (I)</small></th>
      <th>Col 2<small>Obrigações (II+III+IV)</small></th>
      <th>Col 3<small>Caixa Líquido (V)</small></th>
      <th>Col 4<small>Arrec. Prevista (VI)</small></th>
      <th>Col 5<small>Total Disponível</small></th>
      <th>Col 6<small>Pressões (VIII+IX)</small></th>
      <th>Col 7 — Saldo Art. 42<small>Col5 − Col6</small></th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<!-- Rodapé -->
<div class="footer">
  <div class="legend">
    <span style="font-weight:600;margin-right:4px">Farol:</span>
    ${Object.entries(LIGHT_COLOR).map(([k, c]) =>
      `<span class="legend-item"><span class="dot" style="background:${c}"></span>${LIGHT_LABEL[k]}</span>`
    ).join('')}
    <span style="color:#94a3b8">· CINZA = Col 4 ou Col 6 pendentes de input manual</span>
  </div>
  <div>SEFAZ-ES &nbsp;·&nbsp; Subsecretaria do Tesouro Estadual &nbsp;·&nbsp; Sistema de Monitoramento Fiscal</div>
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
