'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { IconExternal } from './Icons'

const BASE = 'https://cdn.tesouro.gov.br/sistemas-internos/monica/revistinha/index.html?revistinha='

/** Materiais do programa Em Busca do Tesouro (Tesouro Nacional), exibidos no leitor do próprio programa. */
const materiais = [
  { id: 1, titulo: 'Onde está o Tesouro?', detalhe: 'Revistinha 1, 20 páginas' },
  { id: 2, titulo: 'O Tesouro é nosso', detalhe: 'Revistinha 2, 28 páginas' },
  { id: 3, titulo: 'Manual do Educador', detalhe: 'Para pais e professores, 15 páginas' },
] as const

export function LeitorRevistinhas() {
  const uid = useId()
  const [ativo, setAtivo] = useState(0)
  const abas = useRef<(HTMLButtonElement | null)[]>([])
  const m = materiais[ativo]

  function teclar(e: KeyboardEvent<HTMLDivElement>) {
    const destino = e.key === 'ArrowRight' ? ativo + 1 : e.key === 'ArrowLeft' ? ativo - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? materiais.length - 1 : null
    if (destino === null) return
    e.preventDefault()
    const i = (destino + materiais.length) % materiais.length
    setAtivo(i)
    abas.current[i]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label="Escolha o material" onKeyDown={teclar} className="flex flex-wrap gap-2">
        {materiais.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => { abas.current[i] = el }}
            role="tab"
            type="button"
            id={`${uid}-t${i}`}
            aria-selected={i === ativo}
            aria-controls={`${uid}-p`}
            tabIndex={i === ativo ? 0 : -1}
            onClick={() => setAtivo(i)}
            className={`min-h-11 rounded-brand border px-4 py-2 text-left ${i === ativo ? 'border-navy bg-navy text-on-navy' : 'border-line bg-paper text-ink hover:bg-surface'}`}
          >
            <span className="block text-body font-semibold">{x.titulo}</span>
            <span className="block text-small opacity-90">{x.detalhe}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${uid}-p`} aria-labelledby={`${uid}-t${ativo}`} className="mt-4">
        <iframe
          key={m.id}
          src={`${BASE}${m.id}`}
          title={`${m.titulo}: leitor de revistinha do programa Em Busca do Tesouro, do Tesouro Nacional`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-[78vh] min-h-[30rem] w-full rounded-brand border border-line bg-surface"
        />
        <p className="mt-3 text-small text-ink-soft">
          Conteúdo exibido a partir do site do Tesouro Nacional.{' '}
          <a href={`${BASE}${m.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
            Abrir em tela cheia <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
          </a>
        </p>
      </div>
    </div>
  )
}
