'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { IconChevron, IconClose, IconExternal, IconMenu, IconSearch } from './Icons'
import { institucional, menuPrincipal, type Link as L } from '@/lib/links'

function ItemLink({ l, className, onClick }: { l: L; className?: string; onClick?: () => void }) {
  if (l.externo) {
    return (
      <a href={l.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {l.rotulo}
        <IconExternal className="ml-1.5 inline h-3.5 w-3.5 align-[-1px] opacity-70" />
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    )
  }
  return <Link href={l.href} className={className} onClick={onClick}>{l.rotulo}</Link>
}

export function Header() {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)
  const [buscaMobile, setBuscaMobile] = useState(false)
  const [instAberto, setInstAberto] = useState(false)
  const instRef = useRef<HTMLLIElement>(null)
  const idMenu = useId()
  const idBusca = useId()

  // Fecha menus ao navegar, com Esc e ao clicar fora.
  useEffect(() => { setMenuAberto(false); setInstAberto(false) }, [pathname])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setInstAberto(false); setMenuAberto(false) }
    }
    function onClick(e: MouseEvent) {
      if (instRef.current && !instRef.current.contains(e.target as Node)) setInstAberto(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick) }
  }, [])

  const busca = (
    <form action="/publicacoes" method="get" role="search" className="relative w-full">
      <label htmlFor={`${idBusca}-q`} className="sr-only">Buscar publicações do Tesouro Estadual</label>
      <input
        id={`${idBusca}-q`}
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Buscar publicações do Tesouro Estadual"
        className="h-12 w-full rounded-brand border border-ink-soft/50 bg-paper pl-4 pr-12 text-[0.9375rem] text-ink placeholder:text-ink-soft focus-visible:outline-offset-0"
      />
      <button type="submit" className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-ink" aria-label="Buscar">
        <IconSearch className="h-5 w-5" />
      </button>
    </form>
  )

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto max-w-page px-5 md:px-8">
        {/* Linha 1: logo + busca */}
        <div className="flex items-center justify-between gap-6 py-4 md:py-5">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink lg:hidden"
            aria-expanded={menuAberto}
            aria-controls={idMenu}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuAberto((v) => !v)}
          >
            {menuAberto ? <IconClose className="h-7 w-7" /> : <IconMenu className="h-7 w-7" />}
          </button>

          <Link href="/" className="shrink-0" aria-label="Tesouro Estadual do Espírito Santo – página inicial">
            <Image
              src="/img/logo-tesouro-estadual.png"
              alt="Tesouro Estadual – Espírito Santo"
              width={900}
              height={290}
              priority
              className="invert-hc h-12 w-auto sm:h-14 lg:h-[4.25rem]"
            />
          </Link>

          <div className="hidden w-full max-w-[26rem] lg:block">{busca}</div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink lg:hidden"
            aria-expanded={buscaMobile}
            aria-controls={`${idBusca}-m`}
            aria-label="Buscar"
            onClick={() => setBuscaMobile((v) => !v)}
          >
            <IconSearch className="h-6 w-6" />
          </button>
        </div>

        {buscaMobile && <div id={`${idBusca}-m`} className="pb-4 lg:hidden">{busca}</div>}

        {/* Menu desktop */}
        <nav aria-label="Menu principal" className="hidden lg:block">
          <ul className="flex items-stretch justify-between">
            <li ref={instRef} className="relative">
              <button
                type="button"
                className="group relative inline-flex h-12 items-center gap-1.5 text-[0.9375rem] font-medium text-ink"
                aria-expanded={instAberto}
                aria-haspopup="true"
                onClick={() => setInstAberto((v) => !v)}
              >
                Institucional <IconChevron className="h-4 w-4" />
                <span className="accent-bar absolute -bottom-px left-0 mt-0 w-full opacity-0 transition-opacity group-hover:opacity-100 group-aria-expanded:opacity-100" style={{ height: 3 }} />
              </button>
              {instAberto && (
                <ul className="absolute left-0 top-full z-30 mt-px w-80 rounded-b-brand border border-line bg-paper py-2 shadow-lg">
                  {institucional.map((l) => (
                    <li key={l.href}>
                      <ItemLink l={l} className="block px-5 py-2.5 text-[0.9375rem] text-ink hover:bg-surface" onClick={() => setInstAberto(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
            {menuPrincipal.map((l) => {
              const ativo = !l.href.includes('?') && !l.href.startsWith('#') && l.href === pathname
              return (
                <li key={l.rotulo}>
                  <Link
                    href={l.href}
                    aria-current={ativo ? 'page' : undefined}
                    className="group relative inline-flex h-12 items-center text-[0.9375rem] font-medium text-ink"
                  >
                    {l.rotulo}
                    <span className={`accent-bar absolute -bottom-px left-0 mt-0 w-full transition-opacity group-hover:opacity-100 ${ativo ? 'opacity-100' : 'opacity-0'}`} style={{ height: 3 }} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Menu mobile */}
      {menuAberto && (
        <nav id={idMenu} aria-label="Menu principal" className="border-t border-line bg-paper lg:hidden">
          <ul className="mx-auto max-w-page px-5 py-2">
            <li className="border-b border-line py-2">
              <p className="py-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">Institucional</p>
              <ul>
                {institucional.map((l) => (
                  <li key={l.href}><ItemLink l={l} className="block py-2.5 text-base text-ink" onClick={() => setMenuAberto(false)} /></li>
                ))}
              </ul>
            </li>
            {menuPrincipal.map((l) => (
              <li key={l.rotulo} className="border-b border-line last:border-0">
                <Link href={l.href} className="block py-3 text-base font-medium text-ink" onClick={() => setMenuAberto(false)}>{l.rotulo}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
