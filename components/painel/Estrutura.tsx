'use client'

import { useState, type ReactNode } from 'react'

/**
 * Sub-visões: uma pergunta por vez dentro de uma seção longa. Todas ficam montadas; só a escolhida aparece na tela,
 * e no PDF saem todas, cada uma numa página (a exportação precisa levar a seção inteira).
 */
export function Subvisoes({ itens, rotulo, ativa: ativaExterna, onMudar }: { itens: { id: string; rotulo: string; conteudo: ReactNode }[]; rotulo: string; /** sub-visão escolhida por quem controla o grupo (por exemplo, por um link das conclusões); sem ela, o grupo guarda a própria escolha */ ativa?: string; onMudar?: (id: string) => void }) {
  const [propria, setPropria] = useState(itens[0].id)
  const ativa = ativaExterna ?? propria
  const setAtiva = (id: string) => { setPropria(id); onMudar?.(id) }
  return (
    <div>
      <div role="group" aria-label={rotulo} className="inline-flex max-w-full flex-wrap overflow-hidden rounded-brand border border-line text-small print:hidden">
        {itens.map((i) => (
          <button key={i.id} type="button" aria-pressed={ativa === i.id} onClick={() => setAtiva(i.id)}
            className={`px-3 py-1.5 sm:px-4 ${ativa === i.id ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink hover:bg-surface'}`}>{i.rotulo}</button>
        ))}
      </div>
      {itens.map((i, k) => (
        <div key={i.id} className={`mt-3 ${ativa === i.id ? '' : 'hidden print:block'} ${k > 0 ? 'print:[break-before:page]' : ''}`}>{i.conteudo}</div>
      ))}
    </div>
  )
}

/** Observações e fontes: pequenas e discretas, para não competir com o dado. */
export const NOTA_DISCRETA = 'text-[0.6875rem] normal-case leading-snug tracking-normal text-ink-soft/75'

/** Texto de apoio recolhido: a tela mostra a frase-resumo, e o método, a fonte e as ressalvas ficam a um toque (e não saem no PDF, que cabe numa página). */
export function Nota({ children, titulo = 'Metodologia e fontes', larga = false }: { children: ReactNode; titulo?: string; /** conteúdo em tabela: ocupa a largura toda */ larga?: boolean }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="mt-2">
      <button type="button" aria-expanded={aberta} onClick={() => setAberta((v) => !v)} className="text-label font-medium normal-case tracking-normal text-ink-soft underline underline-offset-4 print:hidden">
        {aberta ? '− ' : '+ '}{titulo}
      </button>
      <div className={`mt-2 ${larga ? '' : 'max-w-3xl'} space-y-2 text-small text-ink-soft ${aberta ? '' : 'hidden'} print:hidden`}>{children}</div>
    </div>
  )
}
