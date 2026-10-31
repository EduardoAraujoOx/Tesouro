'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PublicationRow } from './PublicationRow'
import type { Publicacao } from '@/lib/acervo'

type Tipo = { id: string; rotulo: string; tipos: string[] }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function fmt(iso: string | null) {
  if (!iso) return undefined
  const [a, m, d] = iso.split('-')
  const mes = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'][Number(m) - 1]
  return `${Number(d)} ${mes} ${a}`
}

const PASSO = 40

export function AcervoExplorer({ itens, tipos }: { itens: Publicacao[]; tipos: Tipo[] }) {
  const sp = useSearchParams()
  const tipoInicial = tipos.some((t) => t.id === sp.get('tipo')) ? sp.get('tipo')! : ''
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [tipo, setTipo] = useState(tipoInicial)
  const [ano, setAno] = useState('')
  const [limite, setLimite] = useState(PASSO)

  function sincronizarUrl(novoQ: string, novoTipo: string) {
    const p = new URLSearchParams()
    if (novoQ) p.set('q', novoQ)
    if (novoTipo) p.set('tipo', novoTipo)
    const qs = p.toString()
    try { window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname) } catch { /* ignora */ }
  }

  const tiposSel = useMemo(() => tipos.find((t) => t.id === tipo)?.tipos ?? null, [tipo, tipos])

  const base = useMemo(
    () => (tiposSel ? itens.filter((p) => tiposSel.includes(p.tipo)) : itens),
    [itens, tiposSel],
  )
  const anos = useMemo(
    () => Array.from(new Set(base.map((p) => p.ano).filter((a): a is number => !!a))).sort((a, b) => b - a),
    [base],
  )

  const resultado = useMemo(() => {
    const termo = norm(q.trim())
    return base
      .filter((p) => (!ano || String(p.ano) === ano) && (!termo || norm(`${p.titulo} ${p.ano ?? ''} ${p.periodo ?? ''}`).includes(termo)))
      .sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || b.ordem - a.ordem || (b.atualizadoEm ?? '').localeCompare(a.atualizadoEm ?? ''))
  }, [base, q, ano])

  const visiveis = resultado.slice(0, limite)
  const grupos = useMemo(() => {
    const m = new Map<string, Publicacao[]>()
    for (const p of visiveis) {
      const k = p.ano ? String(p.ano) : 'Sem ano de referência'
      m.set(k, [...(m.get(k) ?? []), p])
    }
    return Array.from(m.entries())
  }, [visiveis])

  const campo =
    'h-12 w-full rounded-brand border border-ink-soft/50 bg-paper px-4 text-[0.9375rem] text-ink focus-visible:outline-offset-0'

  return (
    <div>
      <form
        role="search"
        aria-label="Filtrar publicações"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-brand bg-surface p-5 md:grid-cols-[2fr_2fr_1fr]"
      >
        <div>
          <label htmlFor="f-q" className="mb-1.5 block text-sm font-semibold">Buscar</label>
          <input
            id="f-q" type="search" value={q} placeholder="Ex.: RGF 2026, dívida, municípios"
            className={campo}
            onChange={(e) => { setQ(e.target.value); setLimite(PASSO); sincronizarUrl(e.target.value, tipo) }}
          />
        </div>
        <div>
          <label htmlFor="f-tipo" className="mb-1.5 block text-sm font-semibold">Tipo de publicação</label>
          <select
            id="f-tipo" value={tipo} className={campo}
            onChange={(e) => { setTipo(e.target.value); setAno(''); setLimite(PASSO); sincronizarUrl(q, e.target.value) }}
          >
            <option value="">Todas</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-ano" className="mb-1.5 block text-sm font-semibold">Ano</label>
          <select id="f-ano" value={ano} className={campo} onChange={(e) => { setAno(e.target.value); setLimite(PASSO) }}>
            <option value="">Todos</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </form>

      <p role="status" aria-live="polite" className="mt-6 text-sm text-ink-soft">
        {resultado.length === 0
          ? 'Nenhuma publicação encontrada. Tente outro termo ou limpe os filtros.'
          : `${resultado.length} ${resultado.length === 1 ? 'publicação encontrada' : 'publicações encontradas'}.`}
      </p>

      {grupos.map(([anoGrupo, lista]) => (
        <section key={anoGrupo} aria-labelledby={`ano-${anoGrupo.replace(/\W/g, '')}`} className="mt-8">
          <h2 id={`ano-${anoGrupo.replace(/\W/g, '')}`} className="text-2xl font-bold">{anoGrupo}</h2>
          <span className="accent-bar" aria-hidden="true" />
          <ul className="mt-3 border-t border-line">
            {lista.map((p) => (
              <PublicationRow
                key={p.id}
                titulo={p.titulo}
                atualizadoEm={fmt(p.atualizadoEm)}
                tamanho={p.tamanho}
                href={p.url}
                acao={p.formato === 'pdf' ? 'Baixar PDF' : 'Acessar'}
              />
            ))}
          </ul>
        </section>
      ))}

      {resultado.length > limite && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setLimite((l) => l + PASSO)}
            className="inline-flex min-h-12 items-center rounded-brand border border-navy px-6 font-medium text-navy hover:bg-surface"
          >
            Mostrar mais ({resultado.length - limite} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
