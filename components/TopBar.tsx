'use client'

import { useEffect, useState } from 'react'
import { IconAccess, IconContrast } from './Icons'

type Tam = 'sm' | 'md' | 'lg' | 'xl'
const ORDEM: Tam[] = ['sm', 'md', 'lg', 'xl']

function guardar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor) } catch { /* armazenamento indisponível: segue sem persistir */ }
}

export function TopBar() {
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

  const btn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded px-2 text-sm font-semibold text-on-navy hover:bg-white/15 focus-visible:outline-white'

  return (
    <div role="region" aria-label="Governo do Estado do Espírito Santo" className="on-dark bg-navy-deep text-on-navy">
      <div className="mx-auto flex min-h-11 max-w-page items-center justify-center gap-4 px-5 text-[0.8125rem] md:justify-between md:px-8">
        <p className="flex flex-wrap items-center justify-center gap-x-3 py-2">
          <span>Governo do Estado do Espírito Santo</span>
          <span aria-hidden="true" className="hidden h-4 w-px bg-current opacity-60 sm:block" />
          <a href="https://sefaz.es.gov.br" className="underline-offset-4 hover:underline">
            <span className="hidden md:inline">Secretaria da Fazenda – </span>SEFAZ
          </a>
        </p>

        <div className="hidden items-center gap-1 md:flex" role="group" aria-label="Recursos de acessibilidade">
          <button type="button" className={`${btn} disabled:opacity-40`} onClick={alternarContraste} aria-pressed={alto}>
            <IconAccess className="mr-1.5 h-[18px] w-[18px]" />
            Acessibilidade<span className="sr-only">: alto contraste</span>
            <IconContrast className="ml-2 h-[18px] w-[18px]" />
          </button>
          <span aria-hidden="true" className="mx-2 h-4 w-px bg-current opacity-40" />
          <button type="button" className={btn} onClick={() => passo(-1)} disabled={tam === 'sm'}>A−<span className="sr-only"> diminuir o tamanho do texto</span></button>
          <button type="button" className={btn} onClick={() => aplicarTam('md')} aria-pressed={tam === 'md'}>A<span className="sr-only"> tamanho padrão do texto</span></button>
          <button type="button" className={btn} onClick={() => passo(1)} disabled={tam === 'xl'}>A+<span className="sr-only"> aumentar o tamanho do texto</span></button>
        </div>
      </div>
    </div>
  )
}
