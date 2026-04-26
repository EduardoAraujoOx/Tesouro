'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import HeaderBar from '@/components/layout/HeaderBar'
import SessionProvider from '@/components/providers/SessionProvider'

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 700)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Mobile overlay */}
      {mobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--color-sidebar-bg)',
        flexShrink: 0,
        position: mobile ? 'absolute' : 'relative',
        top: 0, bottom: 0, left: 0,
        zIndex: 50,
        height: mobile ? '100%' : 'auto',
        transform: mobile && !sidebarOpen ? 'translateX(-220px)' : 'translateX(0)',
        transition: 'transform 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <Sidebar mobile={mobile} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <HeaderBar
          mobile={mobile}
          onMenuClick={() => setSidebarOpen(p => !p)}
        />
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {mobile && (
            <div style={{ background: '#fef3c7', padding: '5px 12px', fontSize: 10, color: '#92400e', textAlign: 'center', flexShrink: 0 }}>
              ↻ Gire o dispositivo para melhor visualização
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </SessionProvider>
  )
}
