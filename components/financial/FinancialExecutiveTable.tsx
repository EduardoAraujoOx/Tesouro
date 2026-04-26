'use client'
import { useState } from 'react'
import { computeExecutiveColumns, computeTrafficLight, formatBRL } from '@/lib/calculations/financialCalc'
import TrafficLightBadge from './TrafficLightBadge'

export interface FinancialLineData {
  id: string
  rowOrder: number
  rowLabel: string
  groupKey: string | null
  isGroup: boolean
  isSubtotal: boolean
  isTotal: boolean
  level: number
  colI: number; colII: number; colIII: number; colIV: number; colV: number
  colVI: number; colVII: number; colVIII: number; colIX: number; colX: number
  colXI: number; colXII: number
  colVIAdjusted: number | null
  colIXAdjusted: number | null
  children?: FinancialLineData[]
}

interface Props {
  rows: FinancialLineData[]
  referenceDate?: string | null
  uploadedAt?: string | null
}

const EXEC_COLS = [
  { h: '1. Caixa bruto de referência', s: 'Origem: I' },
  { h: '2. Obrigações comprometidas', s: 'Origem: II+III+IV' },
  { h: '3. Caixa líquido atual', s: 'Origem: V' },
  { h: '4. Arrecadação prevista', s: 'Origem: VI' },
  { h: '5. Total disponível', s: 'Origem: VII=V+VI' },
  { h: '6. Pressões futuras', s: 'Origem: VIII+IX' },
  { h: '7. Saldo projetado art. 42', s: 'Origem: X=VII−VIII−IX' },
  { h: 'Farol', s: '' },
]

export default function FinancialExecutiveTable({ rows, referenceDate, uploadedAt }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    rows.forEach(r => { if (r.isGroup && r.children?.length) init[r.id] = true })
    return init
  })

  const toggleGroup = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  function renderRow(row: FinancialLineData, isChild = false) {
    const dark = row.isGroup || row.isSubtotal || row.isTotal
    const bg = row.isTotal ? '#0F1624' : row.isSubtotal ? '#1e293b' : row.isGroup ? '#1e3a5f' : 'var(--color-background-primary)'
    const tc = dark ? 'white' : 'var(--color-text-primary)'
    const hasKids = (row.children?.length ?? 0) > 0
    const viPreenchido = row.colVIAdjusted !== null
    const ixPreenchido = row.colIXAdjusted !== null
    const ec = computeExecutiveColumns({
      colI: row.colI, colII: row.colII, colIII: row.colIII, colIV: row.colIV,
      colV: row.colV, colVI: row.colVI, colVIAdjusted: row.colVIAdjusted,
      colVIII: row.colVIII, colIX: row.colIX, colIXAdjusted: row.colIXAdjusted,
    })
    const light = computeTrafficLight(ec.col7, ec.col1, viPreenchido, ixPreenchido)
    const vals = [ec.col1, ec.col2, ec.col3, ec.col4, ec.col5, ec.col6, ec.col7]
    const bd = '1px solid rgba(128,128,128,0.12)'

    return (
      <tr
        key={row.id}
        onClick={() => row.isGroup && hasKids && toggleGroup(row.id)}
        style={{
          background: bg, color: tc,
          cursor: row.isGroup && hasKids ? 'pointer' : 'default',
          borderBottom: '0.5px solid rgba(100,100,100,0.15)',
        }}
      >
        <td style={{
          padding: isChild ? '7px 10px 7px 20px' : row.isGroup ? '9px 10px' : '8px 10px 8px 18px',
          fontWeight: dark ? 500 : 400, fontSize: dark ? 12 : 11,
          position: 'sticky', left: 0, background: bg, color: tc, zIndex: 1,
          overflow: 'hidden', maxWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {row.isGroup && hasKids && (
              <span style={{ fontSize: 8, opacity: 0.65, flexShrink: 0, width: 9 }}>
                {expanded[row.id] ? '▼' : '▶'}
              </span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.rowLabel}
            </span>
          </div>
        </td>
        {vals.map((v, i) => (
          <td key={i} style={{
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            color: v < 0 ? (dark ? '#fca5a5' : '#dc2626') : tc,
            fontSize: 12, whiteSpace: 'nowrap', padding: '8px 9px', borderLeft: bd,
          }}>
            {formatBRL(v)}
          </td>
        ))}
        <td style={{ padding: '8px 9px', textAlign: 'center', borderLeft: bd }}>
          <TrafficLightBadge light={light} />
        </td>
      </tr>
    )
  }

  const allRows: React.ReactNode[] = []
  rows.forEach(row => {
    allRows.push(renderRow(row))
    if (row.isGroup && row.children?.length && expanded[row.id]) {
      row.children.forEach(child => allRows.push(renderRow(child, true)))
    }
  })

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 18px 14px' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 860, width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 168 }} />
          {Array(7).fill(0).map((_, i) => <col key={i} style={{ width: 118 }} />)}
          <col style={{ width: 52 }} />
        </colgroup>
        <thead>
          <tr style={{ background: '#0F1624', color: 'white' }}>
            <th style={{
              padding: '10px 10px', textAlign: 'left', fontSize: 12, fontWeight: 500,
              position: 'sticky', left: 0, background: '#0F1624', zIndex: 2,
            }}>
              Fonte de Recurso
            </th>
            {EXEC_COLS.map(({ h, s }, i) => (
              <th key={i} style={{
                padding: '7px 9px', textAlign: h === 'Farol' ? 'center' : 'right',
                fontSize: 11, fontWeight: 400, lineHeight: 1.3, verticalAlign: 'top',
              }}>
                <div style={{ fontWeight: 500, fontSize: 11 }}>{h}</div>
                {s && <div style={{ opacity: 0.5, fontSize: 10, marginTop: 1 }}>{s}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{allRows}</tbody>
      </table>
      <div style={{ padding: '8px 2px 0', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
        {referenceDate && `Posição: ${referenceDate} · `}
        {uploadedAt && `Base SIGEFES importada em ${uploadedAt} · `}
        {rows.length > 0 && `${rows.length + rows.reduce((s, r) => s + (r.children?.length ?? 0), 0)} linhas · `}
        Valores em R$
      </div>
    </div>
  )
}
