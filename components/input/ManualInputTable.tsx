'use client'
import { useState, useEffect } from 'react'

interface LineData {
  id: string
  rowLabel: string
  groupKey: string | null
  isGroup: boolean
  isSubtotal: boolean
  isTotal: boolean
  level: number
  colVIAdjusted?: number | null
  colIXAdjusted?: number | null
}

interface ConfirmationData {
  submittedAt: Date
  monthRef: string
  linesCount: number
  total: number
  submittedBy: string
}

interface Props {
  colKey: 'VI' | 'IX'
  colLabel: string
  apiEndpoint: string
  month?: string
  canEdit: boolean
  saveMsg?: string
}

function parseBRL(s: string): number | null {
  const clean = s.replace(/\./g, '').replace(',', '.').trim()
  if (!clean) return null
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function ManualInputTable({ colKey, colLabel, apiEndpoint, month, canEdit, saveMsg }: Props) {
  const [lines, setLines] = useState<LineData[]>([])
  const [vals, setVals] = useState<Record<string, string>>({})
  const [uploadId, setUploadId] = useState<string>('')
  const [monthRef, setMonthRef] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inputMode, setInputMode] = useState<'digitar' | 'upload'>('digitar')
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null)

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    try {
      const url = month ? `${apiEndpoint}?month=${month}` : apiEndpoint
      const res = await fetch(url)
      const data = await res.json()
      setLines(data.lines || [])
      setUploadId(data.uploadId || '')
      setMonthRef(data.monthRef || '')
      const initial: Record<string, string> = {}
      ;(data.lines || []).forEach((l: LineData) => {
        const adj = colKey === 'VI' ? l.colVIAdjusted : l.colIXAdjusted
        if (adj !== null && adj !== undefined) initial[l.id] = formatBRL(adj)
      })
      setVals(initial)
    } finally {
      setLoading(false)
    }
  }

  function computeTotal(): number {
    return lines
      .filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal)
      .reduce((acc, l) => acc + (parseBRL(vals[l.id] || '') ?? 0), 0)
  }

  async function handleSave() {
    setSaving(true)
    const total = computeTotal()
    const detailLines = lines.filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal)
    const filledCount = detailLines.filter(l => parseBRL(vals[l.id] || '') !== null).length
    try {
      const values = detailLines.map(l => ({ lineId: l.id, value: parseBRL(vals[l.id] || '') }))
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, values }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')

      setConfirmation({
        submittedAt: new Date(),
        monthRef,
        linesCount: filledCount,
        total,
        submittedBy: saveMsg || '',
      })
    } finally {
      setSaving(false)
    }
  }

  function handleNovoEnvio() {
    setVals({})
    setConfirmation(null)
  }

  // ── Tela de confirmação ───────────────────────────────────────────────────────
  if (confirmation) {
    const colName = colKey === 'VI' ? 'Arrecadação Prevista' : 'Pressões Orçamentárias'
    const colFull = `Coluna ${colKey} — ${colName}`
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

          {/* Ícone de sucesso */}
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 32,
          }}>
            ✓
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Dados enviados com sucesso
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 28 }}>
            Concluído em {formatDateTime(confirmation.submittedAt)}
          </div>

          {/* Comprovante */}
          <div style={{
            background: 'var(--color-background-secondary)',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 10, padding: '18px 24px', textAlign: 'left', marginBottom: 24,
          }}>
            {[
              ['Tipo de dado', colFull],
              ['Mês de referência', confirmation.monthRef || '—'],
              ['Linhas preenchidas', `${confirmation.linesCount}`],
              ['Total informado', `R$ ${formatBRL(confirmation.total)}`],
              ['Enviado por', confirmation.submittedBy || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'right', maxWidth: 280 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Os dados foram registrados e já estão disponíveis no Dashboard.
            Para fazer uma nova inserção, clique em "Novo envio" abaixo.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={handleNovoEnvio}
              style={{
                padding: '10px 22px', fontSize: 13, fontWeight: 500,
                background: '#1D4ED8', color: 'white',
                border: 'none', borderRadius: 7, cursor: 'pointer',
              }}
            >
              Novo envio
            </button>
            <a
              href="/dashboard"
              style={{
                padding: '10px 22px', fontSize: 13, fontWeight: 500,
                background: 'transparent', color: 'var(--color-text-secondary)',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 7, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              Ver Dashboard →
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Estados de carregamento e vazio ───────────────────────────────────────────
  if (loading) return <div style={{ padding: 32, color: 'var(--color-text-secondary)', fontSize: 13 }}>Carregando...</div>

  const groups    = lines.filter(l => l.isGroup)
  const subtotals = lines.filter(l => l.isSubtotal)
  const totals    = lines.filter(l => l.isTotal)

  if (lines.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-primary)' }}>
          Nenhuma base SIGEFES importada
        </div>
        <div style={{ fontSize: 12, marginBottom: 16 }}>
          É necessário importar a planilha SIGEFES antes de preencher os valores.
        </div>
        <a
          href="/insercao/upload"
          style={{
            display: 'inline-block', padding: '9px 20px', fontSize: 13, fontWeight: 500,
            background: '#1D4ED8', color: 'white', borderRadius: 7, textDecoration: 'none',
          }}
        >
          Ir para importação SIGEFES →
        </a>
      </div>
    )
  }

  const BD = '0.5px solid var(--color-border-tertiary)'

  function groupSum(groupKey: string | null): number {
    return lines
      .filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal && l.groupKey === groupKey)
      .reduce((acc, l) => acc + (parseBRL(vals[l.id] || '') ?? 0), 0)
  }

  function renderGroupSection(g: LineData) {
    const children = lines.filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal && l.groupKey === g.groupKey)
    const sum = groupSum(g.groupKey)
    return (
      <>
        <tr key={g.id} style={{ background: '#1e3a5f', color: 'white' }}>
          <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500 }}>▸ {g.rowLabel}</td>
          <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', background: 'rgba(234,179,8,0.15)', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            {sum !== 0 ? formatBRL(sum) : '—'}
          </td>
        </tr>
        {children.map((d, i) => (
          <tr key={d.id} style={{ borderBottom: BD, background: i % 2 === 0 ? 'var(--color-background-primary)' : 'var(--color-background-secondary)' }}>
            <td style={{ padding: '7px 14px 7px 28px', color: 'var(--color-text-primary)', fontSize: 11, maxWidth: 340 }}>
              {d.rowLabel}
            </td>
            <td style={{ padding: '5px 10px', textAlign: 'center', background: canEdit ? '#fefce8' : 'transparent', borderLeft: BD }}>
              {canEdit ? (
                <input
                  type="text"
                  value={vals[d.id] || ''}
                  onChange={e => setVals(p => ({ ...p, [d.id]: e.target.value }))}
                  onBlur={e => {
                    const parsed = parseBRL(e.target.value)
                    if (parsed !== null) setVals(p => ({ ...p, [d.id]: formatBRL(parsed) }))
                  }}
                  placeholder="0,00"
                  style={{
                    width: 160, padding: '5px 8px', fontSize: 12,
                    border: '0.5px solid #fde047', borderRadius: 5,
                    textAlign: 'right', background: 'white',
                    color: '#0f172a', fontVariantNumeric: 'tabular-nums',
                  }}
                />
              ) : (
                <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                  {vals[d.id] || '—'}
                </span>
              )}
            </td>
          </tr>
        ))}
      </>
    )
  }

  function renderSummaryRow(label: string, value: number, bg: string, color: string) {
    return (
      <tr key={label} style={{ background: bg, color }}>
        <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600 }}>{label}</td>
        <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderLeft: BD }}>
          {formatBRL(value)}
        </td>
      </tr>
    )
  }

  const grandTotal = computeTotal()

  return (
    <div style={{ padding: '16px 22px', overflow: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>{colLabel}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Preencha por fonte de recurso. Os subtotais são calculados automaticamente para conferência.
          {!canEdit && <span style={{ marginLeft: 8, color: '#d97706', fontWeight: 500 }}>⚠ Você não tem permissão para editar estes valores.</span>}
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, overflow: 'hidden' }}>
          {(['digitar', 'upload'] as const).map(m => (
            <button key={m} onClick={() => setInputMode(m)} style={{
              padding: '5px 13px', fontSize: 12, border: 'none', cursor: 'pointer',
              background: inputMode === m ? '#1D4ED8' : 'transparent',
              color: inputMode === m ? 'white' : 'var(--color-text-secondary)',
            }}>
              {m === 'digitar' ? '✏ Digitar' : '↑ Upload Excel'}
            </button>
          ))}
        </div>
      </div>

      {inputMode === 'upload' && (
        <div style={{ marginBottom: 14, border: '1.5px dashed var(--color-border-secondary)', borderRadius: 8, padding: '24px', textAlign: 'center', background: 'var(--color-background-secondary)' }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>↑</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, color: 'var(--color-text-primary)' }}>Arraste a planilha preenchida aqui</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Col A: Fonte de Recurso · Col B: Valor em R$</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            Sem o modelo?{' '}
            <span style={{ color: '#1D4ED8', cursor: 'pointer', textDecoration: 'underline' }}>Baixar modelo Excel →</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ border: BD, borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0F1624', color: 'white' }}>
              <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11 }}>Fonte de Recurso</th>
              <th style={{ padding: '9px 14px', textAlign: 'right', fontSize: 11, background: 'rgba(234,179,8,0.2)', width: 200 }}>
                Coluna {colKey} — Valor (R$)
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => renderGroupSection(g))}
            {subtotals.map(s => renderSummaryRow(s.rowLabel, grandTotal, '#1e293b', 'white'))}
            {totals.map(t => renderSummaryRow(t.rowLabel, grandTotal, '#0F1624', 'white'))}
            {subtotals.length === 0 && totals.length === 0 &&
              renderSummaryRow('TOTAL (calculado)', grandTotal, '#0F1624', 'white')
            }
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 500,
              background: '#1D4ED8', color: 'white',
              border: 'none', borderRadius: 7,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Enviando...' : 'Enviar dados'}
          </button>
        </div>
      )}
    </div>
  )
}
