'use client'
import { useState, useEffect } from 'react'
import FinancialExecutiveTable from '@/components/financial/FinancialExecutiveTable'
import FinancialTechTable from '@/components/financial/FinancialTechTable'
import type { FinancialLineData } from '@/components/financial/FinancialExecutiveTable'

const MONTH_LABELS: Record<string, string> = {
  '2026-02': 'Fev/2026',
  '2026-03': 'Mar/2026',
  '2026-04': 'Abr/2026',
  '2026-05': 'Mai/2026',
}

function monthLabel(m: string) {
  return MONTH_LABELS[m] || m
}

export default function DashboardPage() {
  const [mode, setMode] = useState<'exec' | 'tech'>('exec')
  const [period, setPeriod] = useState<string>('')
  const [months, setMonths] = useState<string[]>([])
  const [rows, setRows] = useState<FinancialLineData[]>([])
  const [referenceDate, setReferenceDate] = useState<string | null>(null)
  const [uploadedAt, setUploadedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData(period)
  }, [period])

  async function fetchData(month?: string) {
    setLoading(true)
    try {
      const url = month ? `/api/dashboard?month=${month}` : '/api/dashboard'
      const res = await fetch(url)
      const data = await res.json()
      setMonths(data.months || [])
      setRows(data.rows || [])
      setReferenceDate(data.referenceDate)
      setUploadedAt(data.uploadedAt)
      if (!period && data.months?.[0]) setPeriod(data.months[0])
    } finally {
      setLoading(false)
    }
  }

  const allMonths = months.length > 0 ? months : ['2026-02', '2026-03', '2026-04', '2026-05']

  const btnBase: React.CSSProperties = {
    padding: '5px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Controls bar */}
      <div style={{
        padding: '8px 18px',
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0,
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
          {([['exec', 'Modo Executivo'], ['tech', 'Modo Técnico']] as const).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              style={{
                ...btnBase,
                background: mode === id ? '#1D4ED8' : 'transparent',
                color: mode === id ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {mode === 'tech' && (
          <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>
            VI e IX: preenchimento manual · VII e X: recalculados após input
          </span>
        )}

        {/* Period selector */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0 }}>Histórico</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {allMonths.map(m => (
              <button
                key={m}
                onClick={() => setPeriod(m)}
                style={{
                  padding: '4px 9px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                  border: '0.5px solid',
                  borderColor: period === m ? '#1D4ED8' : 'var(--color-border-secondary)',
                  background: period === m ? '#1D4ED8' : 'transparent',
                  color: period === m ? 'white' : 'var(--color-text-secondary)',
                  fontWeight: period === m ? 500 : 400,
                }}
              >
                {monthLabel(m)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Carregando dados...
        </div>
      ) : rows.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: 32 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Nenhum dado disponível</div>
          <div style={{ fontSize: 12 }}>Faça o upload da planilha SIGEFES para começar.</div>
        </div>
      ) : mode === 'exec' ? (
        <FinancialExecutiveTable rows={rows} referenceDate={referenceDate} uploadedAt={uploadedAt} />
      ) : (
        <FinancialTechTable rows={rows} referenceDate={referenceDate} uploadedAt={uploadedAt} />
      )}
    </div>
  )
}
