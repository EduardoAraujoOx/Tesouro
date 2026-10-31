import Image from 'next/image'
import Link from 'next/link'
import { PublicationRow } from '@/components/PublicationRow'
import { SectionTitle } from '@/components/SectionTitle'
import { IconArrow, iconePorNome } from '@/components/Icons'
import { acessoRapido, noticia, orientacoes } from '@/lib/links'
import { formatarData, maisRecente, ultimasAtualizacoes } from '@/lib/acervo'

const btnPrimario =
  'inline-flex min-h-12 items-center justify-center gap-3 rounded-brand bg-navy px-6 text-base font-medium text-on-navy transition hover:bg-navy-deep focus-visible:outline-offset-4'
const btnSecundario =
  'inline-flex min-h-12 items-center justify-center gap-3 rounded-brand border border-navy bg-paper px-6 text-base font-medium text-navy transition hover:bg-surface'

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
          <Link href="/publicacoes" className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-ink hover:underline">
            <span>Ver todas<span className="hidden sm:inline"> as publicações</span></span> <IconArrow className="h-[18px] w-[18px]" />
          </Link>
        }
      >
        Publicações em destaque
      </SectionTitle>

      <ul className="mt-4 border-t border-line">
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
      <SectionTitle id="noticias">Notícias e atualizações</SectionTitle>

      <div className="mt-5 grid gap-8 border-t border-line pt-6 md:grid-cols-2 md:gap-0">
        <article className="md:pr-10">
          <p className="text-sm text-ink-soft"><time dateTime={noticia.data}>{formatarData(noticia.data)}</time></p>
          <h3 className="mt-1 !font-sans text-xl font-semibold leading-snug !text-ink">
            <a href={noticia.href} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">
              {noticia.titulo}<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </h3>
          <p className="mt-2 text-ink-soft">{noticia.resumo}</p>
        </article>

        <div className="md:border-l md:border-line md:pl-10">
          <h3 className="!font-sans text-xl font-semibold !text-ink">Últimas atualizações do acervo</h3>
          <ul className="mt-3 space-y-3">
            {ult.map((p) => (
              <li key={p.id} className="text-[0.9375rem]">
                <p className="text-sm text-ink-soft">{formatarData(p.atualizadoEm)}</p>
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

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section aria-labelledby="titulo-hero" className="relative isolate overflow-hidden">
        <div className="mx-auto grid max-w-page items-center lg:grid-cols-12">
          <div className="relative z-10 px-5 pb-8 pt-8 md:px-8 md:pb-14 md:pt-14 lg:col-span-7 lg:max-w-[46rem] lg:py-16">
            <span className="accent-bar !mb-5 !mt-0 !w-20 lg:hidden" aria-hidden="true" />
            <h1
              id="titulo-hero"
              className="text-[2.5rem] font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] [&]:!text-ink"
            >
              Transparência e responsabilidade na gestão das finanças públicas
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Informações fiscais, contabilidade, dívida pública e publicações do Tesouro Estadual.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/publicacoes" className={btnPrimario}>Acessar publicações <IconArrow className="h-5 w-5" /></Link>
              <Link href="/sobre" className={btnSecundario}>Conheça o Tesouro <IconArrow className="h-5 w-5" /></Link>
            </div>
          </div>

          <div className="relative h-56 sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[52%] xl:w-[55%]">
            <Image
              src="/img/hero-vitoria.jpg"
              alt="Vista de Vitória (ES) com a Terceira Ponte e o Convento da Penha ao fundo"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-[60%_center] [mask-image:linear-gradient(to_bottom,transparent,#000_22%)] lg:[mask-image:linear-gradient(to_right,transparent,#000_38%)]"
            />
          </div>
        </div>
      </section>

      {/* ACESSO RÁPIDO */}
      <section aria-labelledby="acesso-rapido" className="relative z-10 border-y border-line bg-paper">
        <div className="mx-auto max-w-page px-5 py-6 md:px-8 lg:flex lg:items-center lg:gap-8">
          <h2 id="acesso-rapido" className="mb-4 flex items-center gap-3 text-[1.75rem] font-bold lg:mb-0 lg:shrink-0">
            <span aria-hidden="true" className="inline-block h-9 w-1 shrink-0" style={{ background: 'linear-gradient(#39B5E8 50%, #F28AB2 50%)' }} />
            Acesso rápido
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 lg:flex lg:flex-1 lg:justify-between lg:gap-0">
            {acessoRapido.map((a, i) => {
              const Icone = iconePorNome[a.icone]
              return (
                <li key={a.rotulo} className={`lg:flex-1 ${i > 0 ? 'lg:border-l lg:border-line lg:pl-6' : 'lg:border-l lg:border-line lg:pl-6'}`}>
                  <Link href={a.href} className="flex min-h-14 items-center gap-3 py-2 text-[0.9375rem] font-medium leading-tight text-ink hover:underline underline-offset-4">
                    <Icone className="h-9 w-9 shrink-0 text-navy" strokeWidth={1.4} />
                    {a.rotulo}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <Destaques />
      <Noticias />

      {/* ORIENTAÇÕES */}
      <section aria-labelledby="orientacoes" className="mx-auto mt-14 max-w-page px-5 md:px-8">
        <SectionTitle id="orientacoes">Orientações</SectionTitle>
        <ul className="mt-5 grid gap-3 border-t border-line pt-6 md:grid-cols-3 md:gap-0 md:border-0 md:pt-4">
          {orientacoes.map((o, i) => {
            const Icone = iconePorNome[o.icone]
            const externo = o.href.startsWith('http')
            const conteudo = (
              <>
                <Icone className="mt-1 h-10 w-10 shrink-0 text-navy" strokeWidth={1.3} />
                <div className={`min-w-0 ${i >= 0 ? 'md:border-l-0' : ''}`}>
                  <p className="flex items-center gap-2 font-sans text-[1.0625rem] font-semibold text-ink">
                    {o.titulo} <IconArrow className="h-[18px] w-[18px]" />
                    {externo && <span className="sr-only">(abre em nova aba)</span>}
                  </p>
                  <p className="mt-1 text-[0.9375rem] text-ink-soft">{o.texto}</p>
                </div>
              </>
            )
            const cls = `flex h-full gap-4 rounded-brand border border-line p-5 hover:bg-surface md:rounded-none md:border-0 md:border-l md:py-2 md:hover:bg-surface ${i === 0 ? 'md:border-l-0 md:pl-0 md:pr-8' : 'md:px-8'}`
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
    </>
  )
}
