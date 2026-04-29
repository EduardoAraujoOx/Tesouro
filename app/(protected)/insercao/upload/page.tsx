'use client'
import { useState, useRef } from 'react'

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'done' | 'error'

interface Check {
  name: string; passed: boolean; expected: string; found: string; critical: boolean
}

interface ParsedLine {
  rowLabel: string; isGroup: boolean; isSubtotal: boolean; isTotal: boolean; level: number
  colI: number; colII: number; colIII: number; colIV: number; colV: number; colVIII: number
}

interface PreviewData {
  fileName: string
  referenceDate: string | null
  monthRef: string | null
  lineCount: number
  lines: ParsedLine[]
  validation: { passed: boolean; checks: Check[] }
  manualMonthRef: string
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export default function UploadSigefesPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [completedAt, setCompletedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Formato inválido. Envie um arquivo .xlsx ou .xls.')
      return
    }
    setSelectedFile(file)
    setState('parsing')
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('preview', 'true')
      const res = await fetch('/api/sigefes/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao processar arquivo.'); setState('error'); return }
      setPreview({
        fileName: data.fileName,
        referenceDate: data.parseResult.referenceDate,
        monthRef: data.parseResult.monthRef,
        lineCount: data.parseResult.lines.length,
        lines: data.parseResult.lines,
        validation: data.validation,
        manualMonthRef: data.parseResult.monthRef ?? new Date().toISOString().slice(0, 7),
      })
      setState('preview')
    } catch {
      setError('Erro de conexão. Tente novamente.'); setState('error')
    }
  }

  async function handleConfirm() {
    if (!selectedFile) return
    setState('confirming')
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      if (preview?.manualMonthRef) fd.append('monthRef', preview.manualMonthRef)
      const res = await fetch('/api/sigefes/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao importar.'); setState('error'); return }
      setCompletedAt(new Date())
      setState('done')
    } catch {
      setError('Erro de conexão.'); setState('error')
    }
  }

  function reset() { setState('idle'); setPreview(null); setSelectedFile(null); setError('') }

  const card: React.CSSProperties = { background: 'var(--color-background-primary)', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)' }
  const btnPrimary: React.CSSProperties = { padding: '9px 18px', fontSize: 13, fontWeight: 500, background: '#1D4ED8', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer' }
  const btnSecondary: React.CSSProperties = { padding: '9px 14px', fontSize: 13, background: 'none', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-secondary)' }

  return (
    <div style={{ padding: '22px 26px', maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>Upload SIGEFES</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Planilha padrão exportada do SIGEFES-ES. VI e IX chegam zeradas e serão preenchidas manualmente após o upload.
        </div>
      </div>

      {/* ── Idle / Error ── */}
      {(state === 'idle' || state === 'error') && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) { const dt = new DataTransfer(); dt.items.add(f); if (fileRef.current) fileRef.current.files = dt.files; handleFile(f) }
            }}
            style={{
              border: `1.5px dashed ${dragging ? '#1D4ED8' : 'var(--color-border-secondary)'}`,
              borderRadius: 10, padding: '36px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(29,78,216,0.04)' : 'var(--color-background-secondary)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>↑</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>Arraste ou clique para selecionar</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Aceita: .xlsx · Exportação padrão SIGEFES</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{error}</div>}
        </>
      )}

      {/* ── Parsing ── */}
      {state === 'parsing' && (
        <div style={{ ...card, padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Processando arquivo...</div>
        </div>
      )}

      {/* ── Preview ── */}
      {(state === 'preview' || state === 'confirming') && preview && (
        <div>
          {/* File info */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{preview.fileName}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {preview.referenceDate ? `Posição: ${preview.referenceDate} · ` : ''}{preview.lineCount} linhas · 12 colunas
              </div>
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-secondary)' }}>×</button>
          </div>

          {/* Validation checks */}
          <div style={{ ...card, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--color-text-primary)' }}>Diagnóstico do arquivo</div>
            {preview.validation.checks.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12, borderBottom: i < preview.validation.checks.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <span>{c.passed ? '✅' : c.critical ? '❌' : '⚠️'}</span>
                <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>{c.name}</span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>Encontrado: {c.found}</span>
              </div>
            ))}
          </div>

          {!preview.validation.passed && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
              ❌ Verificação crítica falhou. Verifique se é a exportação correta do SIGEFES-ES.
            </div>
          )}

          {!preview.monthRef && (
            <div style={{ background: '#fef3c7', border: '0.5px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
              <div style={{ marginBottom: 6 }}>⚠ Data não encontrada no arquivo. Informe o mês:</div>
              <input
                type="month"
                value={preview.manualMonthRef}
                onChange={e => setPreview(p => p ? { ...p, manualMonthRef: e.target.value } : p)}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 5, border: '1px solid #fbbf24', background: 'white', color: '#1a1a2e' }}
              />
            </div>
          )}

          {/* Data preview table */}
          <div style={{ ...card, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 8px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              Prévia dos dados importados
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#1e3a5f', color: 'white' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap', minWidth: 160 }}>Fonte de Recurso</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Col I — Caixa Bruto</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Col II — Obrigações</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Col V — Caixa Líquido</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Col VIII — Pressões</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((l, i) => {
                    const isHeader = l.isGroup || l.isSubtotal || l.isTotal
                    const bg = l.isTotal ? '#1e3a5f' : l.isSubtotal ? '#dbeafe' : l.isGroup ? '#eff6ff' : i % 2 === 0 ? 'var(--color-background-primary)' : 'var(--color-background-secondary)'
                    const tc = l.isTotal ? 'white' : 'var(--color-text-primary)'
                    return (
                      <tr key={i} style={{ background: bg, borderBottom: '0.3px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding: `5px 10px 5px ${l.isGroup || l.isSubtotal || l.isTotal ? 10 : 18}px`, fontWeight: isHeader ? 600 : 400, color: tc, whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.rowLabel}
                        </td>
                        {[l.colI, l.colII, l.colV, l.colVIII].map((v, j) => (
                          <td key={j} style={{ padding: '5px 8px', textAlign: 'right', color: l.isTotal ? (v < 0 ? '#fca5a5' : 'white') : v < 0 ? '#dc2626' : tc, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(v)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '6px 14px', fontSize: 10, color: 'var(--color-text-secondary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              VI e IX não são exibidas pois chegam zeradas do SIGEFES e serão preenchidas manualmente.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleConfirm}
              disabled={!preview.validation.passed || state === 'confirming'}
              style={{ ...btnPrimary, opacity: !preview.validation.passed ? 0.5 : 1, cursor: !preview.validation.passed ? 'not-allowed' : 'pointer' }}
            >
              {state === 'confirming' ? 'Importando...' : 'Confirmar importação'}
            </button>
            <button onClick={reset} style={btnSecondary}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {state === 'done' && preview && completedAt && (
        <div style={{ ...card, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-primary)' }}>
            Importação registrada com sucesso
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Concluído em {completedAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'auto auto', gap: '6px 24px', textAlign: 'left', marginBottom: 24, fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Arquivo</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{preview.fileName}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Mês de referência</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{preview.manualMonthRef}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Linhas importadas</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{preview.lineCount}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Posição SIGEFES</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{preview.referenceDate ?? '—'}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 20, padding: '8px 12px', background: 'var(--color-background-secondary)', borderRadius: 6 }}>
            Os valores de Arrecadação Prevista (Col VI) e Pressões SEP (Col IX) devem ser inseridos separadamente pelas áreas responsáveis.
          </div>
          <button onClick={reset} style={btnSecondary}>Novo upload</button>
        </div>
      )}
    </div>
  )
}
