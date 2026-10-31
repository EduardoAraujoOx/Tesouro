import Image from 'next/image'
import Link from 'next/link'
import { PublicationRow } from '@/components/PublicationRow'
import { SectionTitle } from '@/components/SectionTitle'
import { IconArrow, IconExternal, iconePorNome } from '@/components/Icons'
import { acessoRapido, noticia, orientacoes, reconhecimentos } from '@/lib/links'
import { formatarData, maisRecente, ultimasAtualizacoes } from '@/lib/acervo'

const btnPrimario =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-brand bg-navy px-6 text-base font-semibold text-on-navy shadow-lg shadow-navy/20 transition hover:-translate-y-0.5 hover:bg-navy-deep hover:shadow-xl'
const btnSecundario =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-brand border border-navy bg-paper px-6 text-base font-semibold text-navy transition hover:-translate-y-0.5 hover:bg-surface'

function Hero() {
  return (
    <section aria-labelledby="titulo-hero" className="relative isolate overflow-hidden bg-paper">
      <div className="mx-auto max-w-page lg:grid lg:min-h-[34rem] lg:grid-cols-12 lg:items-center">
        <div className="relative z-10 px-5 pb-8 pt-10 md:px-8 md:pt-16 lg:col-span-6 lg:py-24 lg:pb-32 xl:col-span-6">
          <span className="accent-bar !mt-0 mb-6 !w-20" aria-hidden="true" />
          <h1
            id="titulo-hero"
            className="text-[2.5rem] font-bold leading-[1.05] tracking-tight !text-ink sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem]"
          >
            Transparência e responsabilidade na gestão das finanças públicas
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Informações fiscais, contabilidade, dívida pública e publicações do Tesouro Estadual.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/publicacoes" className={btnPrimario}>
              Acessar publicações <IconArrow className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link href="/sobre" className={btnSecundario}>
              Conheça o Tesouro <IconArrow className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="relative h-72 sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[62%]">
          <Image
            src="/img/hero-vitoria-dia.jpg"
            alt="Vista de Vitória com a Terceira Ponte cruzando a baía e o Convento da Penha ao fundo"
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-cover object-[68%_50%] [mask-image:linear-gradient(to_bottom,transparent,#000_30%)] lg:[mask-image:linear-gradient(to_right,transparent,#000_34%)]"
          />
        </div>
      </div>
    </section>
  )
}

function AcessoRapido() {
  return (
    <section aria-labelledby="acesso-rapido" className="relative z-10 mx-auto -mt-20 max-w-page px-5 md:-mt-24 md:px-8 lg:-mt-20">
      <div className="overflow-hidden rounded-brand border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(8,43,87,0.45)] lg:flex lg:items-stretch">
        <h2
          id="acesso-rapido"
          className="flex items-center gap-3 border-b border-line px-6 py-5 text-[1.5rem] font-bold lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r"
        >
          <span aria-hidden="true" className="inline-block h-9 w-1 shrink-0" style={{ background: 'linear-gradient(#39B5E8 50%, #F28AB2 50%)' }} />
          Acesso rápido
        </h2>
        <ul className="grid flex-1 grid-cols-2 lg:grid-cols-4">
          {acessoRapido.map((a, i) => {
            const Icone = iconePorNome[a.icone]
            return (
              <li key={a.rotulo} className={`border-line ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l' : ''}`}>
                <Link href={a.href} className="group flex h-full min-h-20 flex-col items-start gap-3 px-4 py-4 transition hover:bg-surface sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-navy transition group-hover:bg-navy group-hover:text-on-navy">
                    <Icone className="h-6 w-6" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 text-[0.9375rem] font-semibold leading-snug text-ink">{a.rotulo}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Destaques() {
  const resultado = maisRecente(['resultado-tesouro'])
  const divida = maisRecente(['divida-paf'])
  const rgf = maisRecente(['rgf'])
  const rreo = maisRecente(['rreo'])

  return (
    <section aria-labelledby="destaques" className="mx-auto mt-16 max-w-page px-5 md:px-8">
      <SectionTitle
        id="destaques"
        action={
          <Link href="/publicacoes" className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-navy hover:underline underline-offset-4">
            <span>Ver todas<span className="hidden sm:inline"> as publicações</span></span> <IconArrow className="h-[18px] w-[18px]" />
          </Link>
        }
      >
        Publicações em destaque
      </SectionTitle>

      <ul className="mt-5 border-t border-line">
        {resultado && (
          <PublicationRow
            titulo={resultado.titulo}
            descricao="Desempenho fiscal, receitas, despesas e resultado primário do Estado."
            atualizadoEm={formatarData(resultado.atualizadoEm)}
            tamanho={resultado.tamanho}
            href={resultado.url}
            acao="Baixar PDF"
          />
        )}
        {divida && (
          <PublicationRow
            titulo={divida.titulo}
            descricao="Evolução, composição e indicadores da dívida pública estadual."
            atualizadoEm={formatarData(divida.atualizadoEm)}
            tamanho={divida.tamanho}
            href={divida.url}
            acao="Baixar PDF"
          />
        )}
        {(rgf || rreo) && (
          <PublicationRow
            titulo="Relatórios Fiscais (LRF)"
            descricao={`Exigidos pela Lei de Responsabilidade Fiscal. Mais recentes: ${rgf?.titulo.replace('RGF — ', 'RGF, ')}; ${rreo?.titulo.replace('RREO — ', 'RREO, ')}.`}
            atualizadoEm={formatarData(rgf?.atualizadoEm ?? null)}
            href="/publicacoes?tipo=lrf"
            acao="Acessar"
            externo={false}
          />
        )}
      </ul>
    </section>
  )
}

function Noticias() {
  const ult = ultimasAtualizacoes(3)
  return (
    <section aria-labelledby="noticias" className="mx-auto mt-20 max-w-page px-5 md:px-8">
      <SectionTitle id="noticias">Notícias e atualizações</SectionTitle>

      {/* Destaque editorial: notícia real da SEFAZ + números do reconhecimento */}
      <article className="mt-6 overflow-hidden rounded-brand border border-line bg-paper shadow-[0_18px_44px_-28px_rgba(8,43,87,0.45)] lg:grid lg:grid-cols-12">
        <figure className="relative lg:col-span-5">
          <div className="relative aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto">
            <Image
              src="/img/vitoria-aerea.jpg"
              alt="Vista aérea de Vitória, com a Terceira Ponte cruzando a baía"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-2 pt-8 text-xs text-white">
            Foto: Bento Mattos, <Link href="/creditos" className="underline underline-offset-2">CC BY-SA 4.0</Link>
          </figcaption>
        </figure>

        <div className="p-6 md:p-8 lg:col-span-7 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
            Notícia · <time dateTime={noticia.data}>{formatarData(noticia.data)}</time>
          </p>
          <h3 className="mt-2 text-2xl font-bold leading-snug md:text-[1.75rem]">{noticia.titulo}</h3>
          <p className="mt-3 text-ink-soft">{noticia.resumo}</p>

          <dl className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
            {reconhecimentos.map((r) => (
              <div key={r.valor} className="flex items-center gap-4">
                <dt className="font-serif text-5xl font-bold leading-none text-navy md:text-6xl" aria-label={r.rotuloAcessivel}>{r.valor}</dt>
                <dd className="text-[0.9375rem] leading-snug text-ink-soft">
                  <span className="block font-semibold text-ink">{r.titulo}</span>
                  {r.detalhe}
                </dd>
              </div>
            ))}
          </dl>

          <a
            href={noticia.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-navy underline-offset-4 hover:underline"
          >
            Ler a notícia completa na SEFAZ <IconExternal className="h-4 w-4" /><span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
      </article>

      <h3 className="mt-10 !font-sans text-lg font-semibold !text-ink">Últimas atualizações do acervo</h3>
      <ul className="mt-3 grid gap-4 md:grid-cols-3">
        {ult.map((p) => (
          <li key={p.id}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full rounded-brand border border-line p-4 transition hover:-translate-y-0.5 hover:border-navy hover:shadow-md"
            >
              <span className="block text-sm text-ink-soft">{formatarData(p.atualizadoEm)}{p.tamanho ? ` · PDF · ${p.tamanho}` : ''}</span>
              <span className="mt-1 block font-semibold leading-snug text-ink group-hover:underline underline-offset-4">{p.titulo}</span>
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Orientacoes() {
  return (
    <section aria-labelledby="orientacoes" className="mx-auto mt-20 max-w-page px-5 md:px-8">
      <SectionTitle id="orientacoes">Orientações</SectionTitle>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {orientacoes.map((o) => {
          const Icone = iconePorNome[o.icone]
          const externo = o.href.startsWith('http')
          const conteudo = (
            <>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-navy transition group-hover:bg-navy group-hover:text-on-navy">
                <Icone className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-sans text-[1.0625rem] font-semibold text-ink">
                  {o.titulo} <IconArrow className="h-[18px] w-[18px] transition group-hover:translate-x-1" />
                  {externo && <span className="sr-only">(abre em nova aba)</span>}
                </span>
                <span className="mt-1 block text-[0.9375rem] text-ink-soft">{o.texto}</span>
              </span>
            </>
          )
          const cls = 'group flex h-full gap-4 rounded-brand border border-line p-5 transition hover:-translate-y-0.5 hover:border-navy hover:shadow-md'
          return (
            <li key={o.titulo}>
              {externo ? (
                <a href={o.href} target="_blank" rel="noopener noreferrer" className={cls}>{conteudo}</a>
              ) : (
                <Link href={o.href} className={cls}>{conteudo}</Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <AcessoRapido />
      <Destaques />
      <Noticias />
      <Orientacoes />
    </>
  )
}
