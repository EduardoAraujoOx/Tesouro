'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const ROLES = ['ADMIN', 'SUBSET', 'SEFAZ', 'SEP', 'CONSULTA'] as const
type Role = typeof ROLES[number]

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

const ROLE_COLORS: Record<Role, string> = {
  ADMIN:    '#dc2626',
  SUBSET:   '#d97706',
  SEFAZ:    '#1D4ED8',
  SEP:      '#7c3aed',
  CONSULTA: '#6b7280',
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'CONSULTA' as Role }

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers]         = useState<UserRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/usuarios')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') {
      if (!isAdmin) { router.push('/dashboard'); return }
      load()
    }
  }, [status, isAdmin, load, router])

  function flash(msg: string, isErr = false) {
    if (isErr) { setError(msg); setSuccess(null) }
    else { setSuccess(msg); setError(null) }
    setTimeout(() => { setError(null); setSuccess(null) }, 4000)
  }

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(u: UserRow) {
    setEditId(u.id)
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const isNew = !editId
      const body = isNew
        ? { name: form.name, email: form.email, password: form.password, role: form.role }
        : { id: editId, name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }

      const res = await fetch('/api/admin/usuarios', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error || 'Erro ao salvar.', true); return }
      flash(isNew ? `Usuário ${data.user.name} criado.` : `Usuário atualizado.`)
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: UserRow) {
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    })
    const data = await res.json()
    if (!res.ok) { flash(data.error || 'Erro.', true); return }
    flash(`${u.name} ${!u.active ? 'ativado' : 'desativado'}.`)
    load()
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`Excluir permanentemente o usuário "${u.name}"?`)) return
    const res = await fetch('/api/admin/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
    const data = await res.json()
    if (!res.ok) { flash(data.error || 'Erro ao excluir.', true); return }
    flash(`${u.name} excluído.`)
    load()
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: 32, fontSize: 13, color: 'var(--color-text-secondary)' }}>Carregando...</div>
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Gerenciar Usuários</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{ fontSize: 12, padding: '7px 14px', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
        >
          + Novo usuário
        </button>
      </div>

      {/* Feedback */}
      {error   && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12 }}>{error}</div>}
      {success && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: 6, fontSize: 12 }}>{success}</div>}

      {/* Table */}
      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--color-background-secondary)' }}>
              {['Nome', 'E-mail', 'Perfil', 'Status', 'Criado em', 'Ações'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 11, letterSpacing: '0.05em' }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', background: u.active ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                <td style={{ padding: '9px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '9px 12px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role] }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500, background: u.active ? '#f0fdf4' : '#fef2f2', color: u.active ? '#16a34a' : '#dc2626' }}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(u)} style={btnStyle('#1D4ED8')}>Editar</button>
                    <button onClick={() => toggleActive(u)} style={btnStyle(u.active ? '#d97706' : '#16a34a')}>
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => handleDelete(u)} style={btnStyle('#dc2626')}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 10, padding: 24, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 18 }}>
              {editId ? 'Editar usuário' : 'Novo usuário'}
            </div>
            <form onSubmit={handleSubmit}>
              <Field label="Nome completo">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} />
              </Field>
              {!editId && (
                <Field label="E-mail">
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
                </Field>
              )}
              <Field label={editId ? 'Nova senha (deixe em branco para manter)' : 'Senha'}>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editId} minLength={8} style={inputStyle} />
              </Field>
              <Field label="Perfil de acesso">
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} style={inputStyle}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...btnStyle('#6b7280'), padding: '7px 16px', fontSize: 12 }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ ...btnStyle('#1D4ED8'), padding: '7px 16px', fontSize: 12, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid var(--color-border-tertiary)',
  borderRadius: 5, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
  boxSizing: 'border-box',
}

function btnStyle(color: string): React.CSSProperties {
  return {
    fontSize: 11, padding: '4px 10px', background: color + '15', color, border: `1px solid ${color}30`,
    borderRadius: 4, cursor: 'pointer', fontWeight: 500,
  }
}
