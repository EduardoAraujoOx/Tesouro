import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AcervoExplorer } from '@/components/AcervoExplorer'
import { IconExternal } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { PublicationRow } from '@/components/PublicationRow'
import { doPagina, formatarData, isoDeBr } from '@/lib/acervo'
import { acaoDoFormato, paginaPorSlug, paginas, prepararHtml, totalArquivos } from '@/lib/paginas'

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return paginas.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const p = paginaPorSlug(slug)
  return p ? { title: p.titulo, description: `${p.titulo}: documentos e orientações do Tesouro Estadual do Espírito Santo.` } : {}
}

const LIMITE_LISTA = 40

export default async function PaginaTesouro({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const pagina = paginaPorSlug(slug)
  if (!pagina) notFound()

  const total = totalArquivos(pagina)
  const usaExplorador = total > LIMITE_LISTA

  return (
    <>
      <PageHeader titulo={pagina.titulo} trilha={pagina.titulo}>
        <span className="text-ink-soft">{pagina.secao}{total > 0 ? ` · ${total} ${total === 1 ? 'documento' : 'documentos'}` : ''}</span>
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-10 md:px-8 md:py-12">
        {usaExplorador ? (
          <>
            {pagina.segmentos.filter((s) => s.tipo === 'texto').map((s, i) => s.tipo === 'texto' && (
              <div key={i} className="prose-tesouro mb-8 max-w-3xl" dangerouslySetInnerHTML={{ __html: prepararHtml(s.html) }} />
            ))}
            <Suspense fallback={<p className="text-ink-soft">Carregando documentos…</p>}>
              <AcervoExplorer itens={doPagina(pagina.slug)} tipos={[]} mostrarTipo={false} />
            </Suspense>
          </>
        ) : (
          <div className="max-w-4xl">
            {pagina.segmentos.map((s, i) => {
              if (s.tipo === 'texto') {
                return <div key={i} className="prose-tesouro mt-6 first:mt-0" dangerouslySetInnerHTML={{ __html: prepararHtml(s.html) }} />
              }
              if (s.tipo === 'subtitulo') {
                return <h2 key={i} className="mt-10 text-2xl font-bold leading-snug first:mt-0">{s.texto}</h2>
              }
              return (
                <section key={i} className="mt-8 first:mt-0">
                  {s.titulo && (
                    <>
                      <h2 className="text-2xl font-bold leading-snug">{s.titulo}</h2>
                      <span className="accent-bar" aria-hidden="true" />
                    </>
                  )}
                  <ul className={`${s.titulo ? 'mt-4' : 'mt-2'} border-t border-line`}>
                    {s.itens.map((it) => (
                      <PublicationRow
                        key={it.url + it.titulo}
                        titulo={it.exibicao}
                        descricao={it.descricao || undefined}
                        atualizadoEm={formatarData(isoDeBr(it.atualizadoEm)) || undefined}
                        tamanho={it.tamanho}
                        formato={it.formato}
                        href={it.url}
                        acao={acaoDoFormato(it.formato)}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        <p className="mt-12 border-t border-line pt-4 text-sm text-ink-soft">
          Conteúdo reproduzido da{' '}
          <a href={pagina.fonte} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-navy underline underline-offset-4">
            página oficial na SEFAZ <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
          </a>
          , que permanece como fonte de referência.
        </p>
      </div>
    </>
  )
}
