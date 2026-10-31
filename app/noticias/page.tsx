import type { Metadata } from 'next'
import { IconExternal } from '@/components/Icons'
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
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-12">
        <ul className="border-t border-line">
          {noticias.map((n) => (
            <li key={n.href} className="border-b border-line py-6">
              <p className="text-sm text-ink-soft"><time dateTime={n.data}>{formatarData(n.data)}</time></p>
              <h2 className="mt-1 !font-sans text-xl font-semibold leading-snug !text-ink">
                <a href={n.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {n.titulo}<span className="sr-only"> (abre em nova aba)</span>
                </a>
              </h2>
              {n.resumo && <p className="mt-2 text-ink-soft">{n.resumo}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-ink-soft">
          Seleção das notícias do Tesouro Estadual publicadas no site da SEFAZ.{' '}
          <a href={fonteNoticias} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-navy underline underline-offset-4">
            Todas as notícias da SEFAZ <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
          </a>
        </p>
      </div>
    </>
  )
}
