'use client'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

interface HeaderBarProps {
  onMenuClick?: () => void
  mobile?: boolean
  exportMonth?: string
}

export default function HeaderBar({ onMenuClick, mobile, exportMonth }: HeaderBarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) setTheme(stored)
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  function handleExportPDF() {
    const month = exportMonth || new Date().toISOString().slice(0, 7)
    window.open(`/api/export/pdf?month=${month}`, '_blank')
  }

  function handleExportExcel() {
    const month = exportMonth || new Date().toISOString().slice(0, 7)
    window.open(`/api/export/excel?month=${month}`, '_blank')
  }

  const btnStyle: React.CSSProperties = {
    padding: '5px 10px', fontSize: 11,
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 6, background: 'none', cursor: 'pointer',
    color: 'var(--color-text-secondary)',
  }

  return (
    <header style={{
      padding: mobile ? '10px 12px' : '11px 18px',
      background: 'var(--color-background-primary)',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
    }}>
      {mobile && (
        <button
          onClick={onMenuClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-secondary)', padding: '2px', flexShrink: 0 }}
        >
          ☰
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e3a5f', borderRadius: 6, padding: '4px 6px', flexShrink: 0 }}>
        <img
          src="https://cdn.es.gov.br/images/logo/governo/brasao/center-white/Brasao_Governo_100.png"
          alt="Brasão ES"
          style={{ height: mobile ? 20 : 24, width: 'auto' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: mobile ? 11 : 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
          {mobile ? 'Disponibilidade Financeira Líquida | SEFAZ-ES' : 'Controle de Disponibilidade Financeira Líquida do Poder Executivo | SEFAZ-ES'}
        </div>
        {!mobile && (
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 1 }}>
            Para cumprimento do Art. 42 da LRF
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <button onClick={handleExportPDF} style={btnStyle}>
          {mobile ? 'PDF' : '↓ Exportar PDF'}
        </button>
        {!mobile && (
          <button onClick={handleExportExcel} style={btnStyle}>
            ↓ Exportar Excel
          </button>
        )}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          style={{
            ...btnStyle,
            width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontSize: 14,
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ ...btnStyle, fontSize: 10 }}
        >
          Sair
        </button>
      </div>
    </header>
  )
}
