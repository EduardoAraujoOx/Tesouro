import type { Metadata } from 'next'
import { IconExternal } from '@/components/Icons'
import { NoticiaImagem } from '@/components/NoticiaImagem'
import { PageHeader } from '@/components/PageHeader'
import { formatarData } from '@/lib/acervo'
import { fonteNoticias, noticias } from '@/lib/noticias'

export const metadata: Metadata = {
  title: 'Notícias',
  description: 'Notícias da SEFAZ-ES sobre gestão fiscal, contabilidade pública, dívida, transferências e o Fundo Soberano.',
}

export default function Noticias() {
  return (
    <>
      <PageHeader titulo="Notícias">
        Notícias da Secretaria da Fazenda sobre gestão fiscal, contabilidade pública, dívida, transferências e o Fundo Soberano.
      </PageHeader>
      <div className="mx-auto max-w-page px-5 py-10 md:px-8 md:py-12">
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {noticias.map((n, i) => (
            <li key={n.href}>
              <article className="group relative">
                <NoticiaImagem n={n} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" prioridade={i < 3} className="aspect-[16/10] rounded-brand" />
                <p className="mt-4 text-small text-ink-soft"><time dateTime={n.data}>{formatarData(n.data)}</time></p>
                <h2 className="mt-1 text-title !text-ink">
                  <a href={n.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">
                    {n.titulo}<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </h2>
                {n.resumo && <p className="mt-2 line-clamp-3 text-ink-soft">{n.resumo}</p>}
              </article>
            </li>
          ))}
        </ul>
        <p className="mt-12 border-t border-line pt-4 text-small text-ink-soft">
          Seleção das notícias do Tesouro Estadual publicadas no site da SEFAZ.{' '}
          <a href={fonteNoticias} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-navy underline underline-offset-4">
            Todas as notícias da SEFAZ <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
          </a>
        </p>
      </div>
    </>
  )
}
