'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function monthLabel(m: string) {
  const [year, month] = m.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]}/${year}`
}

interface MonthData {
  monthRef: string
  status: string
  sigefes: { count: number; last: string; user: string } | null
  subset: { last: string; user: string } | null
  sep: { last: string; user: string } | null
}

export default function HistoricoPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [months, setMonths] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/historico')
    const d = await r.json()
    setMonths(d.months || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(monthRef: string) {
    const label = monthLabel(monthRef)
    if (!confirm(`Excluir todos os dados de ${label}?\n\nEsta ação remove o upload SIGEFES, arrecadação SUBSET, pressões SEP e log de exportações deste mês. Não é reversível.`)) return
    setDeleting(monthRef)
    try {
      const res = await fetch(`/api/historico?monthRef=${monthRef}`, { method: 'DELETE' })
      if (!res.ok) { alert('Erro ao excluir. Tente novamente.'); return }
      setMonths(prev => prev.filter(m => m.monthRef !== monthRef))
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--color-text-secondary)', fontSize: 13 }}>Carregando...</div>

  return (
    <div style={{ padding: '20px 26px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>
          Histórico de consolidações
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          A planilha de cada mês usa sempre o upload mais recente de cada fonte. Múltiplos uploads no mesmo mês registram auditoria, mas apenas o último compõe o painel.
        </div>
      </div>

      {months.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 14 }}>Nenhum histórico disponível ainda.</div>
        </div>
      )}

      {months.map(m => (
        <div key={m.monthRef} style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 8, padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Planilha de {monthLabel(m.monthRef)}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: m.status === 'Consolidado' ? '#dcfce7' : '#fef3c7',
                color: m.status === 'Consolidado' ? '#166534' : '#92400e',
              }}>
                {m.status}
              </span>
              <button
                onClick={() => window.open(`/api/export/pdf?month=${m.monthRef}`, '_blank')}
                style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid var(--color-border-secondary)', borderRadius: 5, background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                ↓ PDF
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(m.monthRef)}
                  disabled={deleting === m.monthRef}
                  style={{
                    padding: '4px 10px', fontSize: 11, borderRadius: 5, cursor: deleting === m.monthRef ? 'not-allowed' : 'pointer',
                    border: '0.5px solid #fca5a5', background: 'none', color: '#dc2626',
                    opacity: deleting === m.monthRef ? 0.5 : 1,
                  }}
                >
                  {deleting === m.monthRef ? 'Excluindo…' : '🗑 Excluir'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: '📥 Base SIGEFES', data: m.sigefes, bg: 'var(--color-background-secondary)' },
              { label: '📝 Arrecadação SUBSET', data: m.subset, bg: '#f0fdf4' },
              { label: '⚡ Pressões SEP', data: m.sep, bg: '#eff6ff' },
            ].map(({ label, data, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 6, padding: '10px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 3 }}>{label}</div>
                {data ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: 'var(--color-text-primary)' }}>
                      {data.last}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{data.user}</div>
                    {'count' in data && (data as { count: number }).count > 1 && (
                      <div style={{ fontSize: 10, color: '#d97706', marginTop: 3 }}>{(data as { count: number }).count} uploads neste mês</div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>Pendente</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
