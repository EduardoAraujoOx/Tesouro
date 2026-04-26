'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'done' | 'error'

interface Check {
  name: string; passed: boolean; expected: string; found: string; critical: boolean
}

interface PreviewData {
  fileName: string
  referenceDate: string | null
  monthRef: string | null
  lineCount: number
  validation: { passed: boolean; checks: Check[] }
}

export default function UploadSigefesPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Formato inválido. Envie um arquivo .xlsx ou .xls.')
      return
    }
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
        validation: data.validation,
      })
      setState('preview')
    } catch {
      setError('Erro de conexão. Tente novamente.'); setState('error')
    }
  }

  async function handleConfirm() {
    if (!fileRef.current?.files?.[0]) return
    setState('confirming')
    try {
      const fd = new FormData()
      fd.append('file', fileRef.current.files[0])
      const res = await fetch('/api/sigefes/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao importar.'); setState('error'); return }
      setState('done')
    } catch {
      setError('Erro de conexão.'); setState('error')
    }
  }

  const cardStyle: React.CSSProperties = { background: 'var(--color-background-primary)', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)' }
  const btnPrimary: React.CSSProperties = { padding: '9px 18px', fontSize: 13, fontWeight: 500, background: '#1D4ED8', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer' }
  const btnSecondary: React.CSSProperties = { padding: '9px 14px', fontSize: 13, background: 'none', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-secondary)' }

  return (
    <div style={{ padding: '22px 26px', maxWidth: 640 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>Upload SIGEFES</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Planilha padrão exportada do SIGEFES-ES: 29 linhas, 12 colunas técnicas. VI e IX chegam zeradas e serão preenchidas manualmente após o upload.
        </div>
      </div>

      {(state === 'idle' || state === 'error') && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); if (fileRef.current) fileRef.current.files = dt.files; handleFile(f) } }}
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

      {state === 'parsing' && (
        <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Processando arquivo...</div>
        </div>
      )}

      {(state === 'preview' || state === 'confirming') && preview && (
        <div>
          {/* File info */}
          <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{preview.fileName}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Posição: {preview.referenceDate} · {preview.lineCount} linhas · 12 colunas identificadas
              </div>
            </div>
            <button onClick={() => { setState('idle'); setPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-secondary)' }}>×</button>
          </div>

          {/* Validation */}
          <div style={{ ...cardStyle, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--color-text-primary)' }}>
              Diagnóstico do arquivo
            </div>
            {preview.validation.checks.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12, borderBottom: i < preview.validation.checks.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <span>{c.passed ? '✅' : c.critical ? '❌' : '⚠️'}</span>
                <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>{c.name}</span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
                  Encontrado: {c.found}
                </span>
              </div>
            ))}
          </div>

          {!preview.validation.passed && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
              ❌ Verificação crítica falhou. Verifique se é a exportação correta do SIGEFES-ES.
            </div>
          )}

          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
            ⚠ VI e IX chegam zeradas do SIGEFES e serão preenchidas manualmente pela SUBSET e SEP após este upload.
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleConfirm}
              disabled={!preview.validation.passed || state === 'confirming'}
              style={{ ...btnPrimary, opacity: !preview.validation.passed ? 0.5 : 1, cursor: !preview.validation.passed ? 'not-allowed' : 'pointer' }}
            >
              {state === 'confirming' ? 'Importando...' : 'Confirmar importação'}
            </button>
            <button onClick={() => { setState('idle'); setPreview(null) }} style={btnSecondary}>Cancelar</button>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div style={{ textAlign: 'center', padding: '36px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>Base SIGEFES importada com sucesso</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 18 }}>
            {preview?.lineCount} linhas importadas para {preview?.monthRef}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => { setState('idle'); setPreview(null) }} style={btnSecondary}>Novo upload</button>
            <button onClick={() => router.push('/insercao/arrecadacao')} style={btnPrimary}>
              Ir para Arrecadação SUBSET →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
