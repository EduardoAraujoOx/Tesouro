'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { IconAccess, IconContrast } from './Icons'

type Tam = 'sm' | 'md' | 'lg' | 'xl'
const ORDEM: Tam[] = ['sm', 'md', 'lg', 'xl']

function guardar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor) } catch { /* armazenamento indisponível: segue sem persistir */ }
}

/** Controles de acessibilidade (alto contraste e tamanho do texto), usados na faixa do portal e na barra do painel. */
export function ControlesAcessibilidade({ className = '', claro = false, compacto = false }: { className?: string; claro?: boolean; compacto?: boolean }) {
  const [tam, setTam] = useState<Tam>('md')
  const [alto, setAlto] = useState(false)

  useEffect(() => {
    const d = document.documentElement
    setAlto(d.dataset.contrast === 'alto')
    const f = d.dataset.font as Tam | undefined
    if (f && ORDEM.includes(f)) setTam(f)
  }, [])

  function aplicarTam(t: Tam) {
    setTam(t)
    const d = document.documentElement
    if (t === 'md') delete d.dataset.font
    else d.dataset.font = t
    guardar('tesouro:fonte', t)
  }
  function passo(delta: number) {
    const i = Math.min(ORDEM.length - 1, Math.max(0, ORDEM.indexOf(tam) + delta))
    aplicarTam(ORDEM[i])
  }
  function alternarContraste() {
    const d = document.documentElement
    const novo = !alto
    setAlto(novo)
    if (novo) d.dataset.contrast = 'alto'
    else delete d.dataset.contrast
    guardar('tesouro:contraste', novo ? 'alto' : 'normal')
  }

  const btn = `inline-flex h-9 min-w-9 items-center justify-center rounded px-2 text-small font-semibold ${claro ? 'text-ink-soft hover:bg-surface hover:text-ink' : 'text-on-navy hover:bg-white/15 focus-visible:outline-white'}`
  return (
    <div className={`items-center gap-1 ${className}`} role="group" aria-label="Recursos de acessibilidade">
      <button type="button" className={`${btn} disabled:opacity-40`} onClick={alternarContraste} aria-pressed={alto}>
        <IconAccess className={`h-[18px] w-[18px] ${compacto ? '2xl:mr-1.5' : 'mr-1.5'}`} />
        <span className={compacto ? 'sr-only 2xl:not-sr-only' : ''}>Acessibilidade</span><span className="sr-only">: alto contraste</span>
        <IconContrast className={`h-[18px] w-[18px] ${compacto ? 'ml-1 2xl:ml-2' : 'ml-2'}`} />
      </button>
      <span aria-hidden="true" className="mx-2 h-4 w-px bg-current opacity-40" />
      <button type="button" className={btn} onClick={() => passo(-1)} disabled={tam === 'sm'}>A−<span className="sr-only"> diminuir o tamanho do texto</span></button>
      <button type="button" className={btn} onClick={() => aplicarTam('md')} aria-pressed={tam === 'md'}>A<span className="sr-only"> tamanho padrão do texto</span></button>
      <button type="button" className={btn} onClick={() => passo(1)} disabled={tam === 'xl'}>A+<span className="sr-only"> aumentar o tamanho do texto</span></button>
    </div>
  )
}

export function TopBar() {
  // o painel de dados tem a própria barra, no topo da página (ver components/painel/Painel.tsx)
  const painel = usePathname().startsWith('/painel')
  if (painel) return null

  return (
    <div role="region" aria-label="Governo do Estado do Espírito Santo" className="on-dark bg-navy-deep text-on-navy print:hidden">
      <div className="mx-auto flex min-h-11 max-w-page items-center justify-center gap-4 px-4 text-small sm:px-5 md:justify-between md:px-8">
        <p className="flex flex-wrap items-center justify-center gap-x-3 py-2">
          <span>Governo do Estado do Espírito Santo</span>
          <span aria-hidden="true" className="hidden h-4 w-px bg-current opacity-60 sm:block" />
          <a href="https://sefaz.es.gov.br" className="underline-offset-4 hover:underline">
            <span className="hidden md:inline">Secretaria da Fazenda (</span>SEFAZ<span className="hidden md:inline">)</span>
          </a>
        </p>
        <ControlesAcessibilidade className="hidden md:flex" />
      </div>
    </div>
  )
}
