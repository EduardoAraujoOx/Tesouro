'use client'
import { useState } from 'react'
import { formatBRL } from '@/lib/calculations/financialCalc'
import type { FinancialLineData } from './FinancialExecutiveTable'

const TECH_HDRS = [
  { k: 'colI', label: 'I', short: 'Disp. Financeira Bruta (I)', manual: false },
  { k: 'colII', label: 'II', short: 'Obrigações Financeiras (II)', manual: false },
  { k: 'colIII', label: 'III', short: 'Obrig. s/ Autorização LRF (III)', manual: false },
  { k: 'colIV', label: 'IV', short: 'Crédito Empenhado a Liquidar (IV)', manual: false },
  { k: 'colV', label: 'V', short: 'Disp. Líquida (V=I−II−III−IV)', manual: false },
  { k: 'colVI', label: 'VI', short: 'Arrecadação a Realizar (VI)', manual: true },
  { k: 'colVII', label: 'VII', short: 'Disp. p/ Novas Obrigações (VII=V+VI)', manual: false },
  { k: 'colVIII', label: 'VIII', short: 'Cota Orçamentária a Empenhar (VIII)', manual: false },
  { k: 'colIX', label: 'IX', short: 'Pressões Orçamentárias (IX)', manual: true },
  { k: 'colX', label: 'X', short: 'Disp. após Pressões (X=VII−VIII−IX)', manual: false },
  { k: 'colXI', label: 'XI', short: 'Cota a Fixar – Movimentação (XI)', manual: false },
  { k: 'colXII', label: 'XII', short: 'Cota Orçamentária Bloqueada (XII)', manual: false },
]

interface Props {
  rows: FinancialLineData[]
  referenceDate?: string | null
  uploadedAt?: string | null
}

export default function FinancialTechTable({ rows, referenceDate, uploadedAt }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    rows.forEach(r => { if (r.isGroup && r.children?.length) init[r.id] = true })
    return init
  })

  function getVal(row: FinancialLineData, key: string): number {
    if (key === 'colVI') return row.colVIAdjusted ?? row.colVI
    if (key === 'colVII') {
      const vi = row.colVIAdjusted ?? row.colVI
      return row.colV + vi
    }
    if (key === 'colIX') return row.colIXAdjusted ?? row.colIX
    if (key === 'colX') {
      const vi = row.colVIAdjusted ?? row.colVI
      const ix = row.colIXAdjusted ?? row.colIX
      return (row.colV + vi) - row.colVIII - ix
    }
    return (row as any)[key] ?? 0
  }

  function renderRow(row: FinancialLineData, isChild = false) {
    const dark = row.isGroup || row.isSubtotal || row.isTotal
    const bg = row.isTotal ? '#0F1624' : row.isSubtotal ? '#1e293b' : row.isGroup ? '#1e3a5f' : 'var(--color-background-primary)'
    const tc = dark ? 'white' : 'var(--color-text-primary)'
    const hasKids = (row.children?.length ?? 0) > 0
    const bd = '1px solid rgba(128,128,128,0.12)'

    return (
      <tr
        key={row.id}
        onClick={() => row.isGroup && hasKids && setExpanded(p => ({ ...p, [row.id]: !p[row.id] }))}
        style={{ background: bg, color: tc, cursor: row.isGroup && hasKids ? 'pointer' : 'default', borderBottom: '0.5px solid rgba(100,100,100,0.15)' }}
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
        {TECH_HDRS.map(({ k, manual }) => {
          const v = getVal(row, k)
          return (
            <td key={k} style={{
              textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              color: v < 0 ? (dark ? '#fca5a5' : '#dc2626') : tc,
              fontSize: 11, whiteSpace: 'nowrap', padding: '7px 7px', borderLeft: bd,
              background: manual ? (dark ? 'rgba(234,179,8,0.15)' : '#fefce8') : 'transparent',
            }}>
              {formatBRL(v)}
            </td>
          )
        })}
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
      <table style={{ borderCollapse: 'collapse', minWidth: 1380, width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 168 }} />
          {Array(12).fill(0).map((_, i) => <col key={i} style={{ width: 100 }} />)}
        </colgroup>
        <thead>
          <tr style={{ background: '#0F1624', color: 'white' }}>
            <th style={{
              padding: '10px 10px', textAlign: 'left', fontSize: 12, fontWeight: 500,
              position: 'sticky', left: 0, background: '#0F1624', zIndex: 2,
            }}>
              Fonte de Recurso
            </th>
            {TECH_HDRS.map(({ label, short, manual }) => (
              <th key={label} style={{
                padding: '6px 7px', textAlign: 'right', fontSize: 10, fontWeight: 400,
                lineHeight: 1.3, verticalAlign: 'top',
                background: manual ? 'rgba(234,179,8,0.25)' : 'transparent',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: manual ? '#fde047' : 'white', marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ opacity: manual ? 0.9 : 0.6, fontSize: 9, color: manual ? '#fde047' : 'white', lineHeight: 1.2 }}>
                  {short}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{allRows}</tbody>
      </table>
      <div style={{ padding: '8px 2px 0', fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
        VI e IX: preenchimento manual · VII e X: recalculados após input ·{' '}
        {referenceDate && `Posição: ${referenceDate} · `}
        Valores em R$
      </div>
    </div>
  )
}
