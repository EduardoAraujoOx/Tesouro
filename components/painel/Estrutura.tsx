'use client'

import { useState, type ReactNode } from 'react'

/**
 * Sub-visões: uma pergunta por vez dentro de uma seção longa. Todas ficam montadas; só a escolhida aparece na tela,
 * e no PDF saem todas (a exportação precisa levar a seção inteira).
 */
export function Subvisoes({ itens, rotulo }: { itens: { id: string; rotulo: string; conteudo: ReactNode }[]; rotulo: string }) {
  const [ativa, setAtiva] = useState(itens[0].id)
  return (
    <div>
      <div role="group" aria-label={rotulo} className="inline-flex max-w-full flex-wrap overflow-hidden rounded-brand border border-line text-small print:hidden">
        {itens.map((i) => (
          <button key={i.id} type="button" aria-pressed={ativa === i.id} onClick={() => setAtiva(i.id)}
            className={`px-3 py-1.5 sm:px-4 ${ativa === i.id ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink hover:bg-surface'}`}>{i.rotulo}</button>
        ))}
      </div>
      {itens.map((i) => (
        <div key={i.id} className={`mt-3 ${ativa === i.id ? '' : 'hidden print:mt-6 print:block'}`}>{i.conteudo}</div>
      ))}
    </div>
  )
}

/** Texto de apoio recolhido: a tela mostra a frase-resumo, e o método, a fonte e as ressalvas ficam a um toque (e saem no PDF). */
export function Nota({ children, titulo = 'Como ler, método e fontes' }: { children: ReactNode; titulo?: string }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="mt-2">
      <button type="button" aria-expanded={aberta} onClick={() => setAberta((v) => !v)} className="text-small font-semibold text-navy underline underline-offset-4 print:hidden">
        {aberta ? '− ' : '+ '}{titulo}
      </button>
      <div className={`mt-2 max-w-3xl space-y-2 text-small text-ink-soft ${aberta ? '' : 'hidden print:block'}`}>{children}</div>
    </div>
  )
}
