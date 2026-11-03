import Image from 'next/image'
import Link from 'next/link'
import { IconArrow, IconDoc, iconePorNome } from '@/components/Icons'
import { IndicadoresDestaque } from '@/components/IndicadoresDestaque'
import { NoticiaImagem } from '@/components/NoticiaImagem'
import { SectionTitle } from '@/components/SectionTitle'
import { formatarData, maisRecente } from '@/lib/acervo'
import { catalogoIndicadores, rotuloPeriodo, ultimaCapag, ultimoLrf } from '@/lib/indicadores'
import { acessoRapido } from '@/lib/links'
import { hrefNoticia, paraCarrossel } from '@/lib/noticias'

const btnPrimario =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-brand bg-navy px-6 text-body font-semibold text-on-navy transition hover:bg-navy-deep'

function Hero() {
  return (
    <section aria-labelledby="titulo-hero" className="relative isolate overflow-hidden bg-paper">
      <div className="mx-auto max-w-page lg:grid lg:min-h-[16rem] lg:grid-cols-12 lg:items-center">
        <div className="relative z-10 px-5 pb-5 pt-6 md:px-8 md:pt-8 lg:col-span-6 lg:py-8">
          <p className="text-label font-semibold uppercase text-navy">Tesouro Estadual do Espírito Santo</p>
          <h1 id="titulo-hero" className="mt-2 text-display !text-ink">Responsabilidade na gestão das finanças públicas.</h1>
          <p className="mt-3 max-w-md text-lead text-ink-soft">Informação, equilíbrio fiscal e transparência para o Espírito Santo.</p>
          <div className="mt-5">
            <Link href="/sobre" className={`${btnPrimario} w-full sm:w-auto`}>
              Conheça o Tesouro <IconArrow className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="relative h-28 sm:h-56 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[62%]">
          <Image
            src="/img/hero-vitoria-dia.jpg"
            alt="Vista de Vitória com a Terceira Ponte cruzando a baía e o Convento da Penha ao fundo"
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-cover object-[68%_45%] [mask-image:linear-gradient(to_bottom,transparent,#000_30%)] lg:[mask-image:linear-gradient(to_right,transparent,#000_34%)]"
          />
        </div>
      </div>
    </section>
  )
}

function AcessosRapidos() {
  return (
    <section aria-labelledby="acessos" className="mx-auto mt-10 max-w-page px-5 md:mt-12 md:px-8">
      <SectionTitle id="acessos">Acessos rápidos</SectionTitle>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {acessoRapido.map((a) => {
          const Icone = iconePorNome[a.icone]
          return (
            <li key={a.rotulo}>
              <Link href={a.href} className="flex h-full min-h-28 flex-col items-center justify-center gap-2 rounded-brand border border-line bg-paper px-2 py-4 text-center text-body font-semibold leading-tight text-ink hover:bg-surface">
                <Icone className="h-9 w-9 text-navy" strokeWidth={1.4} />
                <span>{a.rotulo}{'detalhe' in a && <span className="block text-small font-normal text-ink-soft">({a.detalhe})</span>}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Recentes() {
  const candidatas = [
    { p: maisRecente({ pagina: 'resultado-do-tesouro-estadual' }), href: '/tesouro/resultado-do-tesouro-estadual' },
    { p: maisRecente({ tipos: ['rgf'] }), href: '/publicacoes?tipo=lrf' },
    { p: maisRecente({ tipos: ['rreo'] }), href: '/publicacoes?tipo=lrf' },
    { p: maisRecente({ pagina: 'relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal' }), href: '/tesouro/relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal' },
  ].filter((x) => x.p)
  candidatas.sort((a, b) => ((b.p!.atualizadoEm ?? '') < (a.p!.atualizadoEm ?? '') ? -1 : 1))
  return (
    <section aria-labelledby="recentes" className="min-w-0 lg:col-span-6">
      <SectionTitle id="recentes">Publicações recentes</SectionTitle>
      <ul className="mt-3 border-t border-line">
        {candidatas.map(({ p }) => (
          <li key={p!.id} className="border-b border-line">
            <a href={p!.url} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-4 py-3 hover:bg-surface">
              <IconDoc className="h-7 w-7 shrink-0 text-navy" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">{p!.titulo}</span>
                {p!.periodo && <span className="block text-small text-ink-soft">{p!.periodo} de {p!.ano}</span>}
              </span>
              <span className="shrink-0 text-small text-ink-soft"><time dateTime={p!.atualizadoEm ?? undefined}>{formatarData(p!.atualizadoEm)}</time></span>
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
      <Link href="/publicacoes" className="mt-3 inline-flex min-h-11 items-center gap-2 text-body font-semibold text-navy underline underline-offset-4">
        Ver todas as publicações <IconArrow className="h-5 w-5" />
      </Link>
    </section>
  )
}

function Noticias() {
  const itens = paraCarrossel(3)
  if (itens.length === 0) return null
  return (
    <section aria-labelledby="noticias" className="min-w-0 lg:col-span-6">
      <SectionTitle id="noticias">Notícias e atualizações</SectionTitle>
      <ul className="mt-3 border-t border-line">
        {itens.map((n) => (
          <li key={n.slug} className="border-b border-line">
            <article className="group relative flex min-h-20 items-center gap-4 py-3">
              <NoticiaImagem n={n} sizes="112px" className="h-16 w-24 shrink-0 rounded-brand sm:h-[4.5rem] sm:w-28" />
              <div className="min-w-0">
                <h3 className="text-body font-semibold leading-snug !text-ink">
                  <Link href={hrefNoticia(n)} className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">{n.titulo}</Link>
                </h3>
                <p className="text-small text-ink-soft"><time dateTime={n.data}>{formatarData(n.data)}</time></p>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <Link href="/noticias" className="mt-3 inline-flex min-h-11 items-center gap-2 text-body font-semibold text-navy underline underline-offset-4">
        Ver todas as notícias <IconArrow className="h-5 w-5" />
      </Link>
    </section>
  )
}

function TesouroCidadao() {
  return (
    <section aria-labelledby="cidadao" className="mx-auto mt-14 max-w-page px-5 md:px-8">
      <div className="grid gap-6 rounded-brand bg-surface p-6 md:grid-cols-12 md:items-center md:p-10">
        <div className="md:col-span-8">
          <h2 id="cidadao" className="text-section">Tesouro Cidadão</h2>
          <span className="accent-bar" aria-hidden="true" />
          <p className="mt-4 max-w-2xl text-lead text-ink-soft">
            Os demonstrativos fiscais publicados pelo Tesouro Estadual, como ler cada um e como acompanhar a situação das contas do Estado, com materiais de educação fiscal para toda a família.
          </p>
        </div>
        <div className="md:col-span-4 md:justify-self-end">
          <Link href="/cidadao" className={`${btnPrimario} w-full md:w-auto`}>
            Acompanhar as contas do Estado <IconArrow className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const indicadores = catalogoIndicadores().filter((i) => i.familia === 'lrf' || i.familia === 'capag')
  return (
    <>
      <Hero />
      <IndicadoresDestaque indicadores={indicadores} notaGeral={ultimaCapag.classificacao ?? '—'} periodoLrf={rotuloPeriodo(ultimoLrf)} />
      <AcessosRapidos />
      <div className="mx-auto mt-10 grid max-w-page gap-10 px-5 md:mt-12 md:px-8 lg:grid-cols-12 lg:gap-12">
        <Recentes />
        <Noticias />
      </div>
      <TesouroCidadao />
    </>
  )
}
