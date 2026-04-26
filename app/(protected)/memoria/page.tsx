'use client'
import { useState } from 'react'

type Tab = 'memoria' | 'fontes' | 'colunas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'memoria', label: 'Memória da Linha' },
  { id: 'fontes', label: 'Glossário — Fontes' },
  { id: 'colunas', label: 'Glossário — Colunas' },
]

// Placeholder line list — substituído por dados reais via API na próxima etapa
const LINE_STUBS = [
  { id: 'g1', label: 'RECURSOS ADMINISTRADOS PELO TESOURO (I)', isGroup: true },
  { id: 'g2', label: 'DEMAIS RECURSOS - PODER EXECUTIVO (II)', isGroup: true },
  { id: 'g3', label: 'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL (IV)', isGroup: true },
]

export default function MemoriaPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('memoria')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Painel esquerdo — lista de linhas */}
      <aside style={{
        width: 220,
        borderRight: '0.5px solid var(--color-border-tertiary)',
        overflowY: 'auto',
        flexShrink: 0,
        background: 'var(--color-background-secondary)',
      }}>
        <div style={{
          padding: '11px 11px 5px',
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.06em',
        }}>
          LINHA
        </div>

        {LINE_STUBS.map(line => (
          <button
            key={line.id}
            onClick={() => { setSelectedId(line.id); setTab('memoria') }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: line.isGroup ? '9px 10px' : '7px 10px 7px 19px',
              fontSize: line.isGroup ? 12 : 11,
              border: 'none',
              cursor: 'pointer',
              background: selectedId === line.id && tab === 'memoria'
                ? '#1D4ED8'
                : line.isGroup ? 'rgba(0,0,0,0.04)' : 'transparent',
              color: selectedId === line.id && tab === 'memoria'
                ? 'white'
                : line.isGroup ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              fontWeight: line.isGroup ? 500 : 400,
            }}
          >
            {line.label}
          </button>
        ))}
      </aside>

      {/* Painel direito */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Abas */}
        <div style={{
          display: 'flex',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)',
          flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 16px',
                fontSize: 12,
                border: 'none',
                cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid #1D4ED8' : '2px solid transparent',
                background: 'transparent',
                color: tab === t.id ? '#1D4ED8' : 'var(--color-text-secondary)',
                fontWeight: tab === t.id ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {tab === 'memoria' && (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {selectedId
                ? '⏳ Conteúdo da memória de cálculo em implementação.'
                : '← Selecione uma linha à esquerda'}
            </div>
          )}

          {tab === 'fontes' && (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              ⏳ Glossário de fontes em implementação.
            </div>
          )}

          {tab === 'colunas' && (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              ⏳ Glossário de colunas em implementação.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
