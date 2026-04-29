'use client'
import { useRouter } from 'next/navigation'

const FAKE_ROWS = [
  { label: 'RECURSOS ADMINISTRADOS PELO TESOURO', group: true },
  { label: 'Recursos Ordinários', group: false },
  { label: 'Recursos de Transferências Livres', group: false },
  { label: 'Fundo Especial de Despesa', group: false },
  { label: 'DEMAIS RECURSOS — PODER EXECUTIVO', group: true },
  { label: 'Recursos Vinculados à Educação', group: false },
  { label: 'Recursos Vinculados à Saúde', group: false },
  { label: 'Royalties e Participações Especiais', group: false },
  { label: 'SUBTOTAL', group: true },
  { label: 'RECURSOS VINCULADOS À PREVIDÊNCIA', group: true },
  { label: 'RPPS — Regime Próprio de Previdência', group: false },
  { label: 'TOTAL', group: true },
]

const COLS = ['1. Caixa Bruto', '2. Obrigações', '3. Caixa Líquido', '4. Arrec. Prevista', '5. Total Disp.', '6. Pressões', '7. Saldo Art. 42']

const LIGHTS = ['VERDE', 'VERDE', 'AMARELO', 'VERDE', 'VERDE', 'VERMELHO', 'AMARELO', 'VERDE', 'VERDE', 'VERDE', 'AMARELO', 'VERDE']
const LIGHT_COLORS: Record<string, string> = { VERDE: '#16a34a', AMARELO: '#d97706', VERMELHO: '#dc2626' }

function fakeVal(seed: number): string {
  const v = ((seed * 137 + 42) % 900 + 100) * 1_000_000
  return `R$ ${(v / 1e6).toFixed(1)}M`
}

export default function PreviewPage() {
  const router = useRouter()

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Background: blurred app shell ───────────────────────────────── */}
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ height: 44, background: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>SEFAZ-ES / TESOURO</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            {['Dashboard', 'Histórico', 'Memória', 'Inserção'].map(t => (
              <span key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: 4 }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Controls bar */}
        <div style={{ height: 38, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <span style={{ fontSize: 11, padding: '4px 10px', background: '#1D4ED8', color: 'white' }}>Modo Executivo</span>
            <span style={{ fontSize: 11, padding: '4px 10px', color: '#64748b' }}>Modo Técnico</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {['Fev/2026', 'Mar/2026', 'Abr/2026'].map(m => (
              <span key={m} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', color: '#64748b' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(7, 1fr) 80px', background: '#1e3a5f', padding: '8px 16px', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>FONTE / GRUPO</span>
          {COLS.map(c => (
            <span key={c} style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontWeight: 600 }}>{c}</span>
          ))}
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: 600 }}>FAROL</span>
        </div>

        {/* Table rows */}
        <div style={{ flex: 1, overflowY: 'hidden', background: 'white' }}>
          {FAKE_ROWS.map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr repeat(7, 1fr) 80px',
              padding: row.group ? '9px 16px' : '7px 16px 7px 28px',
              borderBottom: '1px solid #f1f5f9',
              background: row.group ? '#eff6ff' : 'white',
            }}>
              <span style={{ fontSize: row.group ? 11 : 10, fontWeight: row.group ? 600 : 400, color: row.group ? '#1e3a5f' : '#475569' }}>
                {row.label}
              </span>
              {COLS.map((_, j) => (
                <span key={j} style={{ fontSize: 11, textAlign: 'right', color: j === 6 ? '#dc2626' : '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
                  {fakeVal(i * 7 + j)}
                </span>
              ))}
              <span style={{ fontSize: 10, textAlign: 'center', fontWeight: 700, color: LIGHT_COLORS[LIGHTS[i] || 'VERDE'] }}>
                {LIGHTS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Overlay ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15, 30, 55, 0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>

        {/* Login card */}
        <div style={{
          background: 'white',
          borderRadius: 14,
          padding: '40px 38px',
          width: '100%',
          maxWidth: 360,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>
            SEFAZ-ES / TESOURO ESTADUAL
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 6 }}>
            Disponibilidade<br />Financeira Líquida
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            Art. 42 da Lei de Responsabilidade Fiscal
          </div>

          {/* Feature chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', margin: '20px 0 28px' }}>
            {['Painel Executivo', 'Painel Técnico', 'Histórico mensal', 'Export PDF / Excel', 'Farol de suficiência'].map(f => (
              <span key={f} style={{ fontSize: 11, padding: '4px 10px', background: '#eff6ff', color: '#1D4ED8', borderRadius: 20, fontWeight: 500 }}>
                {f}
              </span>
            ))}
          </div>

          <button
            onClick={() => router.push('/login')}
            style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: '#1D4ED8', color: 'white', border: 'none',
              borderRadius: 8, cursor: 'pointer', letterSpacing: '0.01em',
            }}
          >
            Entrar no sistema
          </button>

          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
            Acesso restrito a servidores autorizados da SEFAZ-ES
          </p>
        </div>
      </div>
    </div>
  )
}
