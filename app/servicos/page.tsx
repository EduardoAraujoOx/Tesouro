import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'
import { IconExternal } from '@/components/Icons'
import { iconePorNome } from '@/components/Icons'
import { orientacoes, servicos } from '@/lib/links'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Finanças: serviços e orientações',
  description: 'Serviços e orientações do Tesouro Estadual para órgãos, gestores e servidores: contas bancárias, obrigações de pequeno valor, transferências, sistemas e normas.',
}

export default function Servicos() {
  return (
    <>
    <PageHeader titulo="Finanças: serviços e orientações">
      Rotinas, sistemas e orientações do Tesouro Estadual voltadas a órgãos, gestores e servidores públicos.
    </PageHeader>
    <div className="mx-auto max-w-page px-5 py-6 md:px-8 md:py-8">
      <section aria-labelledby="orientacoes" className="mb-10">
        <h2 id="orientacoes" className="text-title">Orientações</h2>
        <span className="accent-bar" aria-hidden="true" />
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {orientacoes.map((o) => {
            const Icone = iconePorNome[o.icone]
            return (
              <li key={o.titulo}>
                <Link href={o.href} className="flex h-full gap-4 rounded-brand border border-line p-4 hover:bg-surface">
                  <Icone className="mt-0.5 h-10 w-10 shrink-0 text-navy" strokeWidth={1.3} />
                  <span className="min-w-0">
                    <span className="block text-lead font-semibold text-ink">{o.titulo}</span>
                    <span className="mt-1 block text-body text-ink-soft">{o.texto}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <div className="grid gap-10 md:grid-cols-3">
        {servicos.map((g) => (
          <section key={g.grupo} aria-labelledby={g.grupo.replace(/\W/g, '')}>
            <h2 id={g.grupo.replace(/\W/g, '')} className="text-title">{g.grupo}</h2>
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
    </>
  )
}
