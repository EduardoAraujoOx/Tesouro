'use client'
import { useState, useEffect, useMemo } from 'react'
import { computeExecutiveColumns, computeTrafficLight, formatBRL } from '@/lib/calculations/financialCalc'
import { GLOSSARIO_FONTES } from '@/lib/constants/glossarioFontes'
import { GLOSSARIO_COLUNAS } from '@/lib/constants/glossarioColunas'

type Tab = 'memoria' | 'fontes' | 'colunas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'memoria', label: 'Memória da Linha' },
  { id: 'fontes', label: 'Glossário — Fontes' },
  { id: 'colunas', label: 'Glossário — Colunas' },
]

interface LineData {
  id: string
  rowLabel: string
  isGroup: boolean
  isSubtotal: boolean
  isTotal: boolean
  level: number
  colI: number; colII: number; colIII: number; colIV: number; colV: number
  colVI: number; colVIII: number; colIX: number
  colXI: number; colXII: number
  colVIAdjusted: number | null
  colIXAdjusted: number | null
  children?: LineData[]
}

const TECH_COLS: { key: keyof LineData | string; label: string; short: string; manual: boolean }[] = [
  { key: 'colI',    label: 'I',    short: 'Disponibilidade Financeira Bruta',              manual: false },
  { key: 'colII',   label: 'II',   short: 'Obrigações Financeiras',                        manual: false },
  { key: 'colIII',  label: 'III',  short: 'Obrigações s/ Autorização Orçamentária (LRF)',  manual: false },
  { key: 'colIV',   label: 'IV',   short: 'Crédito Empenhado a Liquidar',                  manual: false },
  { key: 'colV',    label: 'V',    short: 'Disponibilidade Líquida',                       manual: false },
  { key: '_VI',     label: 'VI',   short: 'Arrecadação Prevista a Realizar (SUBSET)',       manual: true  },
  { key: '_VII',    label: 'VII',  short: 'Disponibilidade p/ Novas Obrigações',            manual: false },
  { key: 'colVIII', label: 'VIII', short: 'Cota Orçamentária Liberada a Empenhar',          manual: false },
  { key: '_IX',     label: 'IX',   short: 'Pressões Orçamentárias Identificadas (SEP)',     manual: true  },
  { key: '_X',      label: 'X',    short: 'Disponibilidade após Pressões — Saldo Art. 42', manual: false },
  { key: 'colXI',   label: 'XI',   short: 'Cota Orçamentária a Fixar — Movimentação',      manual: false },
  { key: 'colXII',  label: 'XII',  short: 'Cota Orçamentária Bloqueada',                   manual: false },
]

function getTechValue(line: LineData, key: string): { value: number; pending: boolean } {
  const vi  = line.colVIAdjusted ?? null
  const ix  = line.colIXAdjusted ?? null
  const viEff = vi  !== null ? vi  : 0
  const ixEff = ix  !== null ? ix  : 0
  switch (key) {
    case '_VI':  return { value: viEff,                            pending: vi === null }
    case '_VII': return { value: line.colV + viEff,                pending: false }
    case '_IX':  return { value: ixEff,                            pending: ix === null }
    case '_X':   return { value: line.colV + viEff - line.colVIII - ixEff, pending: false }
    default:     return { value: (line as any)[key] ?? 0,          pending: false }
  }
}

const EXEC_ROWS: { formula: string; desc: string; idx: number }[] = [
  { formula: 'Col 1 = I',          desc: 'Caixa bruto de referência',    idx: 0 },
  { formula: 'Col 2 = II+III+IV',  desc: 'Obrigações comprometidas',      idx: 1 },
  { formula: 'Col 3 = V',          desc: 'Caixa líquido atual',           idx: 2 },
  { formula: 'Col 4 = VI',         desc: 'Arrecadação prevista',          idx: 3 },
  { formula: 'Col 5 = Col3+Col4',  desc: 'Total disponível projetado',    idx: 4 },
  { formula: 'Col 6 = VIII+IX',    desc: 'Pressões futuras a considerar', idx: 5 },
  { formula: 'Col 7 = Col5−Col6',  desc: 'Saldo projetado do art. 42',    idx: 6 },
]

const LIGHT_COLORS = { VERDE: '#16a34a', AMARELO: '#d97706', VERMELHO: '#dc2626', CINZA: '#6b7280' }
const LIGHT_LABELS = { VERDE: 'VERDE', AMARELO: 'AMARELO', VERMELHO: 'VERMELHO', CINZA: 'CINZA (dados pendentes)' }

export default function MemoriaPage() {
  const [lines, setLines]           = useState<LineData[]>([])
  const [referenceDate, setRef]     = useState<string | null>(null)
  const [uploadedAt, setUpAt]       = useState<string | null>(null)
  const [selected, setSelected]     = useState<LineData | null>(null)
  const [tab, setTab]               = useState<Tab>('memoria')
  const [loading, setLoading]       = useState(true)

  const selectedCalc = useMemo(() => {
    if (!selected) return null
    const ec = computeExecutiveColumns({
      colI: selected.colI, colII: selected.colII, colIII: (selected as any).colIII ?? 0,
      colIV: selected.colIV, colV: selected.colV,
      colVI: selected.colVI ?? 0, colVIAdjusted: selected.colVIAdjusted,
      colVIII: selected.colVIII, colIX: selected.colIX ?? 0, colIXAdjusted: selected.colIXAdjusted,
    })
    const light = computeTrafficLight(
      ec.col7, ec.col1,
      selected.colVIAdjusted !== null,
      selected.colIXAdjusted !== null,
    )
    return { ec, light, ecArr: [ec.col1, ec.col2, ec.col3, ec.col4, ec.col5, ec.col6, ec.col7] }
  }, [selected])

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        const flat: LineData[] = []
        for (const row of (data.rows ?? []) as LineData[]) {
          if (row.isSubtotal || row.isTotal) continue
          flat.push(row)
          if (row.children?.length) flat.push(...row.children)
        }
        setLines(flat)
        setRef(data.referenceDate ?? null)
        setUpAt(data.uploadedAt ?? null)
      })
      .catch(err => console.error('Erro ao carregar memória:', err))
      .finally(() => setLoading(false))
  }, [])

  // ── Memória da Linha content ─────────────────────────────────────────────
  function renderMemoria() {
    if (!selected || !selectedCalc) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          ← Selecione uma linha à esquerda
        </div>
      )
    }

    const { ec, ecArr, light } = selectedCalc

    return (
      <div>
        {/* Line header */}
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, color: 'var(--color-text-primary)' }}>
          {selected.rowLabel}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          {referenceDate && `Posição: ${referenceDate}`}
          {referenceDate && uploadedAt && ' · '}
          {uploadedAt && `Importado em ${uploadedAt}`}
        </div>

        {/* 12 technical columns */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', marginBottom: 8 }}>
            COLUNAS TÉCNICAS — BASE IMPORTADA DO SIGEFES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 16px' }}>
            {TECH_COLS.map(({ key, label, short, manual }) => {
              const { value, pending } = getTechValue(selected, key)
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <span style={{ fontSize: 11, color: manual ? '#d97706' : 'var(--color-text-secondary)', fontWeight: manual ? 500 : 400 }}>
                    {label} — {short}
                  </span>
                  <span style={{
                    fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 500,
                    color: pending ? '#d97706' : value < 0 ? '#dc2626' : 'var(--color-text-primary)',
                    marginLeft: 12, whiteSpace: 'nowrap',
                  }}>
                    {pending ? 'pendente' : formatBRL(value)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 7 executive columns derivation */}
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', marginBottom: 8 }}>
          DERIVAÇÃO DAS 7 COLUNAS EXECUTIVAS
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px' }}>
          {EXEC_ROWS.map(({ formula, desc, idx }, i) => {
            const v = ecArr[idx]
            return (
              <div key={formula} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 6 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, marginRight: 8, color: 'var(--color-text-primary)' }}>{formula}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>— {desc}</span>
                </div>
                <span style={{
                  fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 13, whiteSpace: 'nowrap', marginLeft: 12,
                  color: v < 0 ? '#dc2626' : v > 0 ? '#16a34a' : 'var(--color-text-secondary)',
                }}>
                  {formatBRL(v)}
                </span>
              </div>
            )
          })}

          {/* Traffic light */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Farol:</span>
            <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: LIGHT_COLORS[light], flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: LIGHT_COLORS[light] }}>
              {LIGHT_LABELS[light]}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Shared layout ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Painel esquerdo */}
      <aside style={{ width: 220, borderRight: '0.5px solid var(--color-border-tertiary)', overflowY: 'auto', flexShrink: 0, background: 'var(--color-background-secondary)' }}>
        <div style={{ padding: '11px 11px 5px', fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.06em' }}>
          LINHA
        </div>
        {loading && <div style={{ padding: 12, fontSize: 11, color: 'var(--color-text-secondary)' }}>Carregando...</div>}
        {lines.map(line => {
          const active = selected?.id === line.id && tab === 'memoria'
          return (
            <button
              key={line.id}
              onClick={() => { setSelected(line); setTab('memoria') }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: line.isGroup ? '9px 10px' : '7px 10px 7px 19px',
                fontSize: line.isGroup ? 12 : 11,
                border: 'none', cursor: 'pointer',
                background: active ? '#1D4ED8' : line.isGroup ? 'rgba(0,0,0,0.04)' : 'transparent',
                color: active ? 'white' : line.isGroup ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: '0.5px solid var(--color-border-tertiary)',
                fontWeight: line.isGroup ? 500 : 400,
              }}
            >
              {line.rowLabel}
            </button>
          )
        })}
      </aside>

      {/* Painel direito */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 16px', fontSize: 12, border: 'none', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid #1D4ED8' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.id ? '#1D4ED8' : 'var(--color-text-secondary)',
              fontWeight: tab === t.id ? 500 : 400,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {tab === 'memoria' && renderMemoria()}

          {tab === 'fontes' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', marginBottom: 12 }}>
                GLOSSÁRIO DE FONTES DE RECURSOS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map(line => {
                  const def = GLOSSARIO_FONTES[line.rowLabel]
                  if (!def) return null
                  return (
                    <div key={line.id} style={{
                      borderLeft: line.isGroup ? '3px solid #1D4ED8' : '1px solid var(--color-border-tertiary)',
                      paddingLeft: 12,
                      paddingTop: 8,
                      paddingBottom: 8,
                      background: line.isGroup ? 'var(--color-background-secondary)' : 'transparent',
                      borderRadius: line.isGroup ? 4 : 0,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: line.isGroup ? 600 : 500, color: 'var(--color-text-primary)', marginBottom: 3 }}>
                        {line.rowLabel}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {def}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'colunas' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', marginBottom: 12 }}>
                GLOSSÁRIO DE COLUNAS TÉCNICAS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {GLOSSARIO_COLUNAS.map(item => (
                  <div key={item.k} style={{
                    borderLeft: item.m ? '3px solid #d97706' : '3px solid #1D4ED8',
                    paddingLeft: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
                    background: 'var(--color-background-secondary)',
                    borderRadius: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.m ? '#d97706' : '#1D4ED8' }}>
                        {item.k}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {item.s}
                      </span>
                      {item.m && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 3, padding: '1px 5px', fontWeight: 500 }}>
                          preenchimento manual
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {item.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
