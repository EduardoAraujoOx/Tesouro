'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Email ou senha inválidos.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-tertiary)',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-secondary)',
        borderRadius: 12,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', marginBottom: 6 }}>
            SEFAZ-ES / TESOURO ESTADUAL
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.35 }}>
            Disponibilidade<br />Financeira Líquida
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Art. 42 da LRF
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="usuario@sefaz.es.gov.br"
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                border: '0.5px solid var(--color-border-primary)', borderRadius: 7,
                background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                border: '0.5px solid var(--color-border-primary)', borderRadius: 7,
                background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px', fontSize: 13, fontWeight: 500,
              background: loading ? '#93c5fd' : '#1D4ED8', color: 'white',
              border: 'none', borderRadius: 7, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
