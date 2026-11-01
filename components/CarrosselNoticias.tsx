'use client'

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { NoticiaImagem } from './NoticiaImagem'
import { IconExternal, IconPause, IconPlay } from './Icons'
import type { Noticia } from '@/lib/noticias'

export type ItemCarrossel = Noticia & { dataFmt: string }

const DURACAO = 7000 // ms por notícia

/**
 * Carrossel de notícias no padrão "tabbed carousel" do W3C (APG):
 * as três manchetes ficam sempre visíveis como abas, a matéria ativa aparece em destaque.
 * Acessibilidade (WCAG 2.2.2): botão de pausa sempre visível; a rotação para sozinha com o mouse
 * sobre o bloco, com foco de teclado dentro dele e quando o usuário prefere menos movimento.
 */
export function CarrosselNoticias({ itens }: { itens: ItemCarrossel[] }) {
  const id = useId()
  const total = itens.length
  const [ativo, setAtivo] = useState(0)
  const [rodando, setRodando] = useState(true) // vontade do usuário (botão)
  const [movimentoReduzido, setMovimentoReduzido] = useState(false)
  const [sobre, setSobre] = useState(false) // mouse em cima
  const [foco, setFoco] = useState(false) // foco de teclado dentro
  const decorrido = useRef(0)
  const barra = useRef<HTMLSpanElement | null>(null)
  const abas = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const atualiza = () => setMovimentoReduzido(mq.matches)
    atualiza()
    mq.addEventListener('change', atualiza)
    return () => mq.removeEventListener('change', atualiza)
  }, [])

  const girando = rodando && !movimentoReduzido && !sobre && !foco && total > 1

  const irPara = useCallback((i: number) => {
    decorrido.current = 0
    if (barra.current) barra.current.style.transform = 'scaleX(0)'
    setAtivo(((i % total) + total) % total)
  }, [total])

  useEffect(() => {
    if (!girando) return
    let quadro = 0
    let ultimo = performance.now()
    const passo = (agora: number) => {
      decorrido.current += agora - ultimo
      ultimo = agora
      if (barra.current) barra.current.style.transform = `scaleX(${Math.min(decorrido.current / DURACAO, 1)})`
      if (decorrido.current >= DURACAO) {
        decorrido.current = 0
        setAtivo((a) => (a + 1) % total)
      }
      quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [girando, total])

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const mapa: Record<string, number> = {
      ArrowRight: ativo + 1, ArrowDown: ativo + 1, ArrowLeft: ativo - 1, ArrowUp: ativo - 1, Home: 0, End: total - 1,
    }
    if (!(e.key in mapa)) return
    e.preventDefault()
    const destino = ((mapa[e.key] % total) + total) % total
    irPara(destino)
    abas.current[destino]?.focus()
  }

  if (total === 0) return null

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label="Últimas notícias do Tesouro Estadual"
      className="grid gap-5 lg:grid-cols-12 lg:gap-10"
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) setFoco(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFoco(false) }}
    >
      {/* Matérias: todas empilhadas no mesmo lugar (a altura é a da maior), só a ativa aparece */}
      <div className="grid lg:col-span-8" aria-live={girando ? 'off' : 'polite'}>
        {itens.map((n, i) => {
          const ligado = i === ativo
          return (
            <div
              key={n.href}
              role="tabpanel"
              id={`${id}-p${i}`}
              aria-labelledby={`${id}-t${i}`}
              aria-hidden={!ligado}
              inert={!ligado}
              className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${ligado ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <article className="group relative">
                <NoticiaImagem n={n} sizes="(min-width: 1024px) 64vw, 100vw" prioridade={i === 0} className="aspect-[16/10] rounded-brand lg:aspect-[16/9]" />
                <div className="mt-5">
                  <p className="text-small text-ink-soft"><time dateTime={n.data}>{n.dataFmt}</time></p>
                  <h3 className="mt-2 text-headline">
                    <a
                      href={n.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline"
                    >
                      {n.titulo}<span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </h3>
                  {n.resumo && <p className="mt-3 line-clamp-3 text-lead text-ink-soft">{n.resumo}</p>}
                  <p className="mt-3 inline-flex items-center gap-2 text-small font-semibold text-navy" aria-hidden="true">
                    Ler no site da SEFAZ <IconExternal className="h-4 w-4" />
                  </p>
                </div>
              </article>
            </div>
          )
        })}
      </div>

      {/* Manchetes: abas. No celular viram um seletor compacto (1, 2, 3). */}
      <div className="flex items-center gap-3 lg:col-span-4 lg:flex-col lg:items-stretch lg:gap-4 lg:border-l lg:border-line lg:pl-8">
        <div role="tablist" aria-label="Escolher notícia" onKeyDown={aoTeclar} className="flex flex-1 gap-2 lg:w-full lg:flex-col lg:gap-0 lg:divide-y lg:divide-line">
          {itens.map((n, i) => {
            const ligado = i === ativo
            return (
              <button
                key={n.href}
                ref={(el) => { abas.current[i] = el }}
                type="button"
                role="tab"
                id={`${id}-t${i}`}
                aria-selected={ligado}
                aria-controls={`${id}-p${i}`}
                tabIndex={ligado ? 0 : -1}
                onClick={() => irPara(i)}
                className={`relative flex min-h-11 flex-1 items-center justify-center overflow-hidden rounded-brand border text-left transition-colors lg:min-h-0 lg:flex-1 lg:justify-start lg:gap-4 lg:rounded-none lg:border-0 lg:border-l-[3px] lg:py-4 lg:pl-4 ${
                  ligado ? 'border-navy bg-navy text-on-navy lg:bg-surface lg:text-ink' : 'border-line bg-paper text-ink hover:bg-surface lg:border-transparent lg:bg-transparent'
                }`}
              >
                <span className="sr-only">{n.titulo}</span>
                <span aria-hidden="true" className="text-body font-semibold lg:hidden">{i + 1}</span>
                <span aria-hidden="true" className="relative hidden w-28 shrink-0 lg:block">
                  <NoticiaImagem n={n} sizes="112px" className="aspect-[4/3] rounded-brand" />
                </span>
                <span aria-hidden="true" className="hidden min-w-0 flex-1 lg:block">
                  <span className="block text-small text-ink-soft">{n.dataFmt}</span>
                  <span className={`mt-1 line-clamp-3 block text-body ${ligado ? 'font-semibold' : 'font-medium'}`}>{n.titulo}</span>
                  <span className={`mt-2 block h-[3px] overflow-hidden rounded-full ${ligado ? 'bg-line' : 'bg-transparent'}`}>
                    {ligado && (
                      <span
                        key={`${id}-b${i}`}
                        ref={barra}
                        className="block h-full origin-left bg-navy"
                        style={{ transform: 'scaleX(0)' }}
                      />
                    )}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {total > 1 && !movimentoReduzido && (
          <button
            type="button"
            onClick={() => setRodando((v) => !v)}
            aria-pressed={!rodando}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-brand border border-line px-3 text-small font-semibold text-ink hover:bg-surface lg:w-full lg:justify-start"
          >
            {rodando ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
            <span className="sr-only lg:not-sr-only">{rodando ? 'Pausar rotação' : 'Retomar rotação'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
