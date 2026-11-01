'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { IconChevron, IconClose, IconExternal, IconMenu, IconSearch } from './Icons'
import { menu, type ItemMenu, type Link as L } from '@/lib/links'

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

function estaAtivo(item: ItemMenu, pathname: string): boolean {
  return !!item.prefixos?.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`))
}

export function Header() {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)
  const [buscaMobile, setBuscaMobile] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null) // submenu aberto no desktop
  const [subMobile, setSubMobile] = useState<string | null>(null) // submenu aberto no celular
  const navRef = useRef<HTMLUListElement>(null)
  const idMenu = useId()
  const idBusca = useId()

  // Fecha menus ao navegar, com Esc e ao clicar fora.
  useEffect(() => { setMenuAberto(false); setAberto(null); setSubMobile(null) }, [pathname])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setAberto(null); setMenuAberto(false) }
    }
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setAberto(null)
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
        className="h-12 w-full rounded-brand border border-ink-soft/50 bg-paper pl-4 pr-12 text-body text-ink placeholder:text-ink-soft focus-visible:outline-offset-0"
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
        <div className="flex items-center justify-between gap-2 py-4 sm:gap-6 md:py-5">
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
              src="/img/logo-tesouro-horizontal.png"
              alt="Tesouro Estadual – Espírito Santo"
              width={1100}
              height={197}
              priority
              className="invert-hc h-9 w-auto min-[400px]:h-10 sm:h-12 lg:h-16"
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
          <ul ref={navRef} className="flex items-stretch justify-between">
            {menu.map((item) => {
              const ativo = estaAtivo(item, pathname)
              const barra = `accent-bar absolute -bottom-px left-0 mt-0 w-full transition-opacity group-hover:opacity-100 ${ativo ? 'opacity-100' : 'opacity-0'}`
              if (!item.filhos) {
                return (
                  <li key={item.rotulo}>
                    <Link href={item.href as string} aria-current={ativo ? 'page' : undefined} className="group relative inline-flex h-12 items-center text-body font-medium text-ink">
                      {item.rotulo}
                      <span className={barra} style={{ height: 3 }} />
                    </Link>
                  </li>
                )
              }
              const aberta = aberto === item.rotulo
              return (
                <li key={item.rotulo} className="relative">
                  <button
                    type="button"
                    className="group relative inline-flex h-12 items-center gap-1.5 text-body font-medium text-ink"
                    aria-expanded={aberta}
                    aria-haspopup="true"
                    onClick={() => setAberto(aberta ? null : item.rotulo)}
                  >
                    {item.rotulo} <IconChevron className={`h-4 w-4 transition-transform ${aberta ? 'rotate-180' : ''}`} />
                    <span className={`${barra} ${aberta ? '!opacity-100' : ''}`} style={{ height: 3 }} />
                  </button>
                  {aberta && (
                    <ul className="absolute left-0 top-full z-30 mt-px w-80 rounded-b-brand border border-line bg-paper py-2 shadow-lg">
                      {item.filhos.map((l, i) => (
                        <li key={l.href} className={i === (item.filhos?.length ?? 0) - 1 && (item.filhos?.length ?? 0) > 4 ? 'mt-1 border-t border-line pt-1' : ''}>
                          <ItemLink l={l} className={`block px-5 py-2.5 text-body text-ink hover:bg-surface ${i === (item.filhos?.length ?? 0) - 1 && (item.filhos?.length ?? 0) > 4 ? 'font-semibold' : ''}`} onClick={() => setAberto(null)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Menu mobile: seis linhas; Publicações e Institucional abrem sob demanda */}
      {menuAberto && (
        <nav id={idMenu} aria-label="Menu principal" className="border-t border-line bg-paper lg:hidden">
          <ul className="mx-auto max-w-page px-5 py-1">
            {menu.map((item) => {
              const ativo = estaAtivo(item, pathname)
              if (!item.filhos) {
                return (
                  <li key={item.rotulo} className="border-b border-line last:border-0">
                    <Link href={item.href as string} aria-current={ativo ? 'page' : undefined} className="block py-3.5 text-body font-medium text-ink" onClick={() => setMenuAberto(false)}>{item.rotulo}</Link>
                  </li>
                )
              }
              const aberta = subMobile === item.rotulo
              return (
                <li key={item.rotulo} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between py-3.5 text-left text-body font-medium text-ink"
                    aria-expanded={aberta}
                    onClick={() => setSubMobile(aberta ? null : item.rotulo)}
                  >
                    {item.rotulo} <IconChevron className={`h-5 w-5 transition-transform ${aberta ? 'rotate-180' : ''}`} />
                  </button>
                  {aberta && (
                    <ul className="mb-2 ml-1 border-l-2 border-line pl-4">
                      {item.filhos.map((l) => (
                        <li key={l.href}><ItemLink l={l} className="block py-2.5 text-body text-ink-soft" onClick={() => setMenuAberto(false)} /></li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </header>
  )
}
