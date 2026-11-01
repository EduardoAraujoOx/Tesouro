import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  titulo: string
  children?: ReactNode // descrição
  trilha?: string // rótulo da página atual na trilha
  imagem?: { src: string; alt: string }
}

/** Cabeçalho das páginas internas. Com `imagem`, vira uma faixa fotográfica; sem ela, uma faixa clara e discreta. */
export function PageHeader({ titulo, children, trilha, imagem }: Props) {
  const crumbs = (cls: string) => (
    <nav aria-label="Você está em" className={`text-small ${cls}`}>
      <ol className="flex items-center gap-2">
        <li><Link href="/" className="underline-offset-4 hover:underline">Início</Link></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page">{trilha ?? titulo}</li>
      </ol>
    </nav>
  )

  if (imagem) {
    return (
      <section aria-labelledby="titulo-pagina" className="relative isolate overflow-hidden bg-hero-overlay">
        <Image src={imagem.src} alt={imagem.alt} fill priority sizes="100vw" className="-z-20 object-cover object-[50%_45%]" />
        <div aria-hidden="true" className="band-shade absolute inset-0 -z-10" />
        <div className="on-dark mx-auto max-w-page px-5 py-14 text-white md:px-8 md:py-20">
          {crumbs('text-white/85')}
          <h1 id="titulo-pagina" className="mt-4 text-headline !text-white">{titulo}</h1>
          <span className="accent-bar" aria-hidden="true" />
          {children && <div className="mt-5 max-w-2xl text-lead text-white/95">{children}</div>}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="titulo-pagina" className="border-b border-line bg-surface">
      <div className="mx-auto max-w-page px-5 py-5 md:px-8 md:py-7">
        {crumbs('text-ink-soft')}
        <h1 id="titulo-pagina" className="mt-2 text-headline">{titulo}</h1>
        {children && <div className="mt-2 max-w-3xl text-body text-ink-soft md:text-lead">{children}</div>}
      </div>
    </section>
  )
}
