'use client'
import React, { useState, useRef, useId } from 'react'
import * as XLSX from 'xlsx'

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

interface Props {
  colKey: 'VI' | 'IX'
  colLabel: string
  apiEndpoint: string
  month?: string
  canEdit: boolean
  saveMsg?: string
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'done' | 'error'

interface PreviewLine { id: string; label: string; value: number }

interface PreviewData {
  fileName: string
  matched: number
  total: number
  lines: PreviewLine[]
  uploadId: string
  monthRef: string
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function downloadModelo(lines: LineData[], colKey: string) {
  const wb = XLSX.utils.book_new()

  // Header row
  const rows: (string | number | null)[][] = [
    [`Fonte de Recurso`, `Coluna ${colKey} — Valor (R$) — preencha apenas as linhas de fundo (sem fundo azul)`],
  ]
  // Styles: track which rows are headers/subtotals (cannot set bg in xlsx easily, use indentation)
  const rowMeta: { level: number; isHeader: boolean; isSubtotal: boolean }[] = [
    { level: -1, isHeader: true, isSubtotal: false },
  ]

  for (const l of lines) {
    if (l.level === 0) {
      rows.push([l.rowLabel, null])
      rowMeta.push({ level: 0, isHeader: true, isSubtotal: l.isSubtotal || l.isTotal })
    } else if (l.level === 1) {
      rows.push(['    ' + l.rowLabel, null])
      rowMeta.push({ level: 1, isHeader: true, isSubtotal: false })
    } else {
      rows.push(['        ' + l.rowLabel, ''])
      rowMeta.push({ level: 2, isHeader: false, isSubtotal: false })
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 70 }, { wch: 24 }]

  // Apply bold + background to header rows via cell styles
  const totalRows = rows.length
  for (let r = 0; r < totalRows; r++) {
    const meta = rowMeta[r]
    const cellA = ws[XLSX.utils.encode_cell({ r, c: 0 })]
    const cellB = ws[XLSX.utils.encode_cell({ r, c: 1 })]
    if (!cellA) continue
    const bold = meta.isHeader || meta.isSubtotal
    const fgColor = meta.level === 0 ? '1e3a5f'
      : meta.level === 1 ? '162032'
      : meta.level === -1 ? '0F1624'
      : 'FFFFFF'
    const fontColor = (meta.isHeader || meta.level === -1) ? 'FFFFFF' : '000000'
    const style = {
      font: { bold, color: { rgb: fontColor } },
      fill: { fgColor: { rgb: fgColor } },
      alignment: { vertical: 'center' as const },
    }
    cellA.s = style
    if (cellB) cellB.s = { ...style, alignment: { horizontal: 'right' as const, vertical: 'center' as const } }
  }

  XLSX.utils.book_append_sheet(wb, ws, `Coluna ${colKey}`)
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `modelo-col${colKey.toLowerCase()}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ManualInputTable({ colKey, colLabel, apiEndpoint, month, canEdit, saveMsg }: Props) {
  const fileInputId = useId()
  const [state, setState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [completedAt, setCompletedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [allLines, setAllLines] = useState<LineData[]>([])
  const [loadedUploadId, setLoadedUploadId] = useState('')
  const [loadedMonthRef, setLoadedMonthRef] = useState('')
  const [loadingLines, setLoadingLines] = useState(true)

  // Load existing lines from API (needed for label matching and modelo download)
  React.useEffect(() => {
    async function load() {
      setLoadingLines(true)
      try {
        const url = month ? `${apiEndpoint}?month=${month}` : apiEndpoint
        const res = await fetch(url)
        const data = await res.json()
        setAllLines(data.lines || [])
        setLoadedUploadId(data.uploadId || '')
        setLoadedMonthRef(data.monthRef || '')
      } finally {
        setLoadingLines(false)
      }
    }
    load()
  }, [month, apiEndpoint])

  function parseExcelFile(file: File): Promise<PreviewData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 }) as (string | number)[][]

          const level2Lines = allLines.filter(l => l.level === 2)
          const labelMap: Record<string, LineData> = {}
          level2Lines.forEach(l => { labelMap[l.rowLabel.trim().toLowerCase()] = l })

          const matched: PreviewLine[] = []
          for (const row of rows.slice(1)) {
            const label = String(row[0] ?? '').trim()
            const rawVal = row[1]
            const line = labelMap[label.toLowerCase()]
            if (!line || rawVal === null || rawVal === undefined || rawVal === '') continue
            const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/\./g, '').replace(',', '.'))
            if (!isNaN(num)) matched.push({ id: line.id, label: line.rowLabel, value: num })
          }

          resolve({
            fileName: file.name,
            matched: matched.length,
            total: level2Lines.length,
            lines: matched,
            uploadId: loadedUploadId,
            monthRef: loadedMonthRef,
          })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Formato inválido. Envie um arquivo .xlsx ou .xls.')
      setState('error')
      return
    }
    if (!loadedUploadId) {
      setError('Nenhuma base SIGEFES encontrada. Faça o upload do SIGEFES antes.')
      setState('error')
      return
    }
    setState('parsing')
    setError('')
    try {
      const data = await parseExcelFile(file)
      setPreview(data)
      setState('preview')
    } catch {
      setError('Erro ao processar o arquivo. Verifique se é um Excel válido.')
      setState('error')
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setState('confirming')
    try {
      const values = preview.lines.map(l => ({ lineId: l.id, value: l.value }))
      // Also send nulls for level-2 lines not in the file (clear previous values)
      const includedIds = new Set(preview.lines.map(l => l.id))
      const cleared = allLines
        .filter(l => l.level === 2 && !includedIds.has(l.id))
        .map(l => ({ lineId: l.id, value: null }))
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: preview.uploadId, values: [...values, ...cleared] }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setCompletedAt(new Date())
      setState('done')
    } catch {
      setError('Erro ao salvar. Tente novamente.')
      setState('error')
    }
  }

  function reset() { setState('idle'); setPreview(null); setError('') }

  const card: React.CSSProperties = {
    background: 'var(--color-background-primary)', borderRadius: 8,
    border: '0.5px solid var(--color-border-secondary)',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '9px 18px', fontSize: 13, fontWeight: 500,
    background: '#1D4ED8', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer',
  }
  const btnSecondary: React.CSSProperties = {
    padding: '9px 14px', fontSize: 13, background: 'none',
    border: '0.5px solid var(--color-border-secondary)', borderRadius: 7,
    cursor: 'pointer', color: 'var(--color-text-secondary)',
  }

  const colName = colKey === 'VI' ? 'Arrecadação Prevista' : 'Pressões Orçamentárias'

  if (loadingLines) {
    return <div style={{ padding: 32, color: 'var(--color-text-secondary)', fontSize: 13 }}>Carregando...</div>
  }

  if (allLines.length === 0) {
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

  return (
    <div style={{ padding: '22px 26px', maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>{colLabel}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Importe uma planilha Excel com Col A (Fonte de Recurso) e Col B (Valor em R$).
          {!canEdit && <span style={{ marginLeft: 8, color: '#d97706', fontWeight: 500 }}>⚠ Você não tem permissão para editar.</span>}
        </div>
      </div>

      {/* ── Idle / Error ── */}
      {(state === 'idle' || state === 'error') && (
        <>
          <label
            htmlFor={fileInputId}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            style={{
              display: 'block',
              border: `1.5px dashed ${dragging ? '#1D4ED8' : 'var(--color-border-secondary)'}`,
              borderRadius: 10, padding: '36px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(29,78,216,0.04)' : 'var(--color-background-secondary)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>↑</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>
              Arraste ou toque para selecionar o arquivo
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Aceita: .xlsx · .xls · Col A: Fonte · Col B: Valor
            </div>
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Sem o modelo?{' '}
            <span
              onClick={() => downloadModelo(allLines, colKey)}
              style={{ color: '#1D4ED8', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Baixar modelo Excel com as {allLines.filter(l => l.level === 2).length} fontes de recurso →
            </span>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '0.5px solid #fecaca' }}>
              ❌ {error}
            </div>
          )}
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
                {preview.matched} de {preview.total} fontes preenchidas · Coluna {colKey}
              </div>
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-secondary)' }}>×</button>
          </div>

          {/* Validation summary */}
          <div style={{ ...card, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--color-text-primary)' }}>Diagnóstico do arquivo</div>
            <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12 }}>
              <span>{preview.matched > 0 ? '✅' : '❌'}</span>
              <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>Linhas mapeadas por nome da fonte</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
                {preview.matched} de {preview.total} ({Math.round(preview.matched / preview.total * 100)}%)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <span>{preview.lines.length > 0 ? '✅' : '⚠️'}</span>
              <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>Linhas com valor preenchido</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
                {formatBRL(preview.lines.reduce((s, l) => s + l.value, 0))} total
              </span>
            </div>
          </div>

          {preview.matched === 0 && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
              ❌ Nenhuma fonte reconhecida. Use o modelo Excel para garantir os nomes corretos.
            </div>
          )}

          {/* Data preview table */}
          <div style={{ ...card, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 8px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              Prévia dos valores importados ({preview.lines.length} linhas)
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ background: '#1e3a5f', color: 'white' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500 }}>Fonte de Recurso</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Coluna {colKey} — {colName}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((l, i) => (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? 'var(--color-background-primary)' : 'var(--color-background-secondary)', borderBottom: '0.3px solid var(--color-border-tertiary)' }}>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-primary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.label}
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: l.value < 0 ? '#dc2626' : 'var(--color-text-primary)' }}>
                        {formatBRL(l.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleConfirm}
              disabled={preview.matched === 0 || state === 'confirming' || !canEdit}
              style={{ ...btnPrimary, opacity: preview.matched === 0 || !canEdit ? 0.5 : 1, cursor: preview.matched === 0 || !canEdit ? 'not-allowed' : 'pointer' }}
            >
              {state === 'confirming' ? 'Salvando...' : 'Confirmar importação'}
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
            Dados importados com sucesso
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Concluído em {formatDateTime(completedAt)}
          </div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'auto auto', gap: '6px 24px', textAlign: 'left', marginBottom: 24, fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Tipo de dado</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Coluna {colKey} — {colName}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Mês de referência</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{preview.monthRef || '—'}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Linhas importadas</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{preview.matched}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Total informado</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>R$ {formatBRL(preview.lines.reduce((s, l) => s + l.value, 0))}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Enviado por</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{saveMsg || '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={reset} style={btnSecondary}>Nova importação</button>
            <a href="/dashboard" style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Ver Dashboard →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
