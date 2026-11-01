import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrow, IconExternal } from '@/components/Icons'
import { NoticiaImagem } from '@/components/NoticiaImagem'
import { formatarData } from '@/lib/acervo'
import { hrefNoticia, noticiaPorSlug, noticias, prepararCorpo, vizinhas } from '@/lib/noticias'

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return noticias.map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const n = noticiaPorSlug(slug)
  if (!n) return {}
  return {
    title: n.titulo,
    description: n.resumo,
    openGraph: { type: 'article', title: n.titulo, description: n.resumo, publishedTime: n.data, images: n.imagem ? [{ url: n.imagem }] : undefined },
  }
}

export default async function PaginaNoticia({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const n = noticiaPorSlug(slug)
  if (!n) notFound()
  const { anterior, proxima } = vizinhas(slug)
  const outras = noticias.filter((x) => x.slug !== slug).slice(0, 3)

  return (
    <article aria-labelledby="titulo-noticia">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
          <nav aria-label="Você está em" className="text-small text-ink-soft">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link href="/" className="underline-offset-4 hover:underline">Início</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/noticias" className="underline-offset-4 hover:underline">Notícias</Link></li>
            </ol>
          </nav>
          <p className="mt-5 text-small text-ink-soft"><time dateTime={n.data}>{formatarData(n.data)}</time></p>
          <h1 id="titulo-noticia" className="mt-2 max-w-3xl text-headline">{n.titulo}</h1>
          <span className="accent-bar" aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
        <div className="max-w-3xl">
          <NoticiaImagem n={n} sizes="(min-width: 768px) 48rem, 100vw" prioridade className="rounded-brand" style={{ aspectRatio: n.imagemTipo === 'arte' && n.imagemLargura && n.imagemAltura ? `${n.imagemLargura} / ${n.imagemAltura}` : '16 / 9' }} />
          {n.corpo ? (
            <div className="prose-tesouro mt-8" dangerouslySetInnerHTML={{ __html: prepararCorpo(n.corpo) }} />
          ) : (
            <p className="prose-tesouro mt-8">{n.resumo}</p>
          )}

          <p className="mt-10 border-t border-line pt-4 text-small text-ink-soft">
            Matéria publicada originalmente no site da Secretaria da Fazenda (SEFAZ) em {formatarData(n.data)}.{' '}
            <a href={n.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-navy underline underline-offset-4">
              Ver no site de origem <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
            </a>
          </p>

          {(anterior || proxima) && (
            <nav aria-label="Outras notícias em sequência" className="mt-8 grid gap-4 sm:grid-cols-2">
              {anterior ? (
                <Link href={hrefNoticia(anterior)} className="group rounded-brand border border-line p-4 hover:bg-surface">
                  <span className="text-label font-semibold uppercase text-ink-soft">Notícia anterior</span>
                  <span className="mt-1 line-clamp-3 block text-body font-medium text-ink group-hover:underline">{anterior.titulo}</span>
                </Link>
              ) : <span />}
              {proxima && (
                <Link href={hrefNoticia(proxima)} className="group rounded-brand border border-line p-4 hover:bg-surface sm:text-right">
                  <span className="text-label font-semibold uppercase text-ink-soft">Próxima notícia</span>
                  <span className="mt-1 line-clamp-3 block text-body font-medium text-ink group-hover:underline">{proxima.titulo}</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        <section aria-labelledby="mais-noticias" className="mt-16 border-t border-line pt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="mais-noticias" className="text-section">Mais notícias</h2>
            <Link href="/noticias" className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-navy underline-offset-4 hover:underline">
              Ver todas as notícias <IconArrow className="h-[18px] w-[18px]" />
            </Link>
          </div>
          <ul className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-3">
            {outras.map((o) => (
              <li key={o.slug}>
                <article className="group relative">
                  <NoticiaImagem n={o} sizes="(min-width: 640px) 30vw, 100vw" className="aspect-[16/10] rounded-brand" />
                  <p className="mt-4 text-small text-ink-soft"><time dateTime={o.data}>{formatarData(o.data)}</time></p>
                  <h3 className="mt-1 text-title !text-ink">
                    <Link href={hrefNoticia(o)} className="line-clamp-3 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">{o.titulo}</Link>
                  </h3>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  )
}
