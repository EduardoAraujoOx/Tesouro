'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

type NavLeaf = { id: string; label: string; icon: string; href: string; sub?: never }
type NavGroup = { id: string; label: string; icon: string; href?: never; sub: { id: string; label: string; href: string }[] }
type NavItem = NavLeaf | NavGroup

const NAV_BASE: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', href: '/dashboard' },
  {
    id: 'insercao', label: 'Inserção de Dados', icon: '↑',
    sub: [
      { id: 'upload', label: 'Upload SIGEFES', href: '/insercao/upload' },
      { id: 'arrecadacao', label: 'Arrecadação SUBSET', href: '/insercao/arrecadacao' },
      { id: 'pressoes', label: 'Pressões SEP', href: '/insercao/pressoes' },
    ],
  },
  { id: 'historico', label: 'Histórico', icon: '⏱', href: '/historico' },
  { id: 'memoria', label: 'Memória de Cálculo', icon: '≡', href: '/memoria' },
]

const NAV_ADMIN: NavItem = { id: 'admin', label: 'Administração', icon: '⚙', href: '/admin/usuarios' }

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [insOpen, setInsOpen] = useState(
    pathname?.startsWith('/insercao') ?? false
  )

  const isActive = (href: string) => pathname === href
  const isInsercaoActive = pathname?.startsWith('/insercao') ?? false

  const isAdmin = session?.user?.role === 'ADMIN'
  const NAV = isAdmin ? [...NAV_BASE, NAV_ADMIN] : NAV_BASE

  const initials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).slice(0, 2).join('')
    : 'U'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 4 }}>
          SEFAZ-ES / TESOURO ESTADUAL
        </div>
        <div style={{ fontSize: 13, color: 'white', fontWeight: 500, lineHeight: 1.35 }}>
          Disponibilidade<br />Financeira Líquida
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
          Art. 42 da LRF
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px' }}>
        {NAV.map(item => (
          <div key={item.id}>
            {item.sub ? (
              <button
                onClick={() => setInsOpen(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: isInsercaoActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 9, opacity: 0.45 }}>{insOpen ? '▲' : '▼'}</span>
              </button>
            ) : (
              <Link
                href={item.href!}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: isActive(item.href!) ? '#1D4ED8' : 'transparent',
                  color: isActive(item.href!) ? 'white' : 'rgba(255,255,255,0.65)',
                  fontSize: 13, textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )}
            {item.sub && insOpen && (
              <div style={{ paddingLeft: 24, paddingBottom: 2 }}>
                {item.sub.map(s => (
                  <Link
                    key={s.id}
                    href={s.href}
                    onClick={onClose}
                    style={{
                      display: 'block', width: '100%', padding: '7px 10px',
                      borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      background: isActive(s.href) ? 'rgba(29,78,216,0.45)' : 'transparent',
                      color: isActive(s.href) ? 'white' : 'rgba(255,255,255,0.5)',
                      fontSize: 12, textDecoration: 'none',
                    }}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#1D4ED8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: 'white', fontWeight: 600, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {session?.user?.name ?? 'Usuário'}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
              {session?.user?.role ?? ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
