import type { Metadata } from 'next'
import { IconExternal } from '@/components/Icons'
import { servicos } from '@/lib/links'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Finanças: serviços e orientações',
  description: 'Serviços e orientações do Tesouro Estadual para órgãos, gestores e servidores: contas bancárias, obrigações de pequeno valor, transferências, sistemas e normas.',
}

export default function Servicos() {
  return (
    <div className="mx-auto max-w-page px-5 py-10 md:px-8 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Finanças: serviços e orientações</h1>
      <span className="accent-bar" aria-hidden="true" />
      <p className="mt-5 max-w-3xl text-lg text-ink-soft">
        Rotinas, sistemas e orientações do Tesouro Estadual voltadas a órgãos, gestores e servidores públicos.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-3">
        {servicos.map((g) => (
          <section key={g.grupo} aria-labelledby={g.grupo.replace(/\W/g, '')}>
            <h2 id={g.grupo.replace(/\W/g, '')} className="text-2xl font-bold">{g.grupo}</h2>
            <span className="accent-bar" aria-hidden="true" />
            <ul className="mt-3 border-t border-line">
              {g.itens.map((l) => (
                <li key={l.href} className="border-b border-line">
                  {l.externo ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-3 py-3 font-medium text-ink hover:underline underline-offset-4">
                      <span>{l.rotulo}</span><IconExternal className="h-4 w-4 shrink-0 opacity-70" /><span className="sr-only">(abre em nova aba)</span>
                    </a>
                  ) : (
                    <Link href={l.href} className="flex min-h-12 items-center py-3 font-medium text-ink hover:underline underline-offset-4">{l.rotulo}</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
