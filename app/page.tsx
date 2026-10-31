import Image from 'next/image'
import Link from 'next/link'
import { PublicationRow } from '@/components/PublicationRow'
import { SectionTitle } from '@/components/SectionTitle'
import { IconArrow, iconePorNome } from '@/components/Icons'
import { acessoRapido, noticia, orientacoes } from '@/lib/links'
import { formatarData, maisRecente, ultimasAtualizacoes } from '@/lib/acervo'

const btnPrimario =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-brand bg-navy px-6 text-base font-semibold text-on-navy transition hover:bg-navy-deep'
const btnSecundario =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-brand border border-navy bg-paper px-6 text-base font-semibold text-navy transition hover:bg-surface'

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
              Acessar publicações <IconArrow className="h-5 w-5" />
            </Link>
            <Link href="/sobre" className={btnSecundario}>
              Conheça o Tesouro <IconArrow className="h-5 w-5" />
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
    <section aria-labelledby="acesso-rapido" className="border-y border-line bg-paper">
      <div className="mx-auto max-w-page px-5 py-5 md:px-8 lg:flex lg:items-center lg:gap-8">
        <h2 id="acesso-rapido" className="mb-3 flex items-center gap-3 text-[1.75rem] font-bold lg:mb-0 lg:shrink-0">
          <span aria-hidden="true" className="inline-block h-9 w-1 shrink-0" style={{ background: 'linear-gradient(#39B5E8 50%, #F28AB2 50%)' }} />
          Acesso rápido
        </h2>
        <ul className="grid grid-cols-2 lg:flex lg:flex-1 lg:justify-between">
          {acessoRapido.map((a, i) => {
            const Icone = iconePorNome[a.icone]
            return (
              <li key={a.rotulo} className={`border-line ${i % 2 === 1 ? 'border-l pl-4' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} lg:flex-1 lg:border-l lg:pl-6`}>
                <Link href={a.href} className="flex min-h-14 items-center gap-3 py-3 text-[0.9375rem] font-medium leading-tight text-ink underline-offset-4 hover:underline">
                  <Icone className="h-9 w-9 shrink-0 text-navy" strokeWidth={1.4} />
                  <span><span className="lg:hidden">{a.curto}</span><span className="hidden lg:inline">{a.rotulo}</span></span>
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
    <section aria-labelledby="destaques" className="mx-auto mt-14 max-w-page px-5 md:px-8">
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
    <section aria-labelledby="noticias" className="mx-auto mt-14 max-w-page px-5 md:px-8">
      <SectionTitle
        id="noticias"
        action={
          <a href="https://sefaz.es.gov.br" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-navy underline-offset-4 hover:underline">
            <span>Ver todas<span className="hidden sm:inline"> as notícias</span></span> <IconArrow className="h-[18px] w-[18px]" />
            <span className="sr-only">(site da SEFAZ, abre em nova aba)</span>
          </a>
        }
      >
        Notícias e atualizações
      </SectionTitle>

      <div className="mt-5 grid gap-8 border-t border-line pt-5 md:grid-cols-2 md:gap-0">
        <article className="md:pr-10">
          <p className="text-sm text-ink-soft"><time dateTime={noticia.data}>{formatarData(noticia.data)}</time></p>
          <h3 className="mt-1 !font-sans text-xl font-semibold leading-snug !text-ink">
            <a href={noticia.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
              {noticia.titulo}<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </h3>
          <p className="mt-2 text-ink-soft">{noticia.resumo}</p>
        </article>

        <div className="md:border-l md:border-line md:pl-10">
          <h3 className="!font-sans text-xl font-semibold !text-ink">Últimas atualizações do acervo</h3>
          <ul className="mt-3 space-y-3">
            {ult.map((p) => (
              <li key={p.id}>
                <p className="text-sm text-ink-soft">{formatarData(p.atualizadoEm)}{p.tamanho ? ` · PDF · ${p.tamanho}` : ''}</p>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline-offset-4 hover:underline">
                  {p.titulo}<span className="sr-only"> (PDF, abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Orientacoes() {
  return (
    <section aria-labelledby="orientacoes" className="mx-auto mt-14 max-w-page px-5 md:px-8">
      <SectionTitle id="orientacoes">Orientações</SectionTitle>
      <ul className="mt-5 grid gap-3 md:grid-cols-3 md:gap-0">
        {orientacoes.map((o, i) => {
          const Icone = iconePorNome[o.icone]
          const externo = o.href.startsWith('http')
          const conteudo = (
            <>
              <Icone className="mt-0.5 h-10 w-10 shrink-0 text-navy" strokeWidth={1.3} />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-sans text-[1.0625rem] font-semibold text-ink">
                  {o.titulo} <IconArrow className="h-[18px] w-[18px]" />
                  {externo && <span className="sr-only">(abre em nova aba)</span>}
                </span>
                <span className="mt-1 block text-[0.9375rem] text-ink-soft">{o.texto}</span>
              </span>
            </>
          )
          const cls = `flex h-full gap-4 rounded-brand border border-line p-4 hover:bg-surface md:rounded-none md:border-0 md:py-3 ${i === 0 ? 'md:pl-0 md:pr-8' : 'md:border-l md:px-8'}`
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
