import Image from 'next/image'
import Link from 'next/link'
import { PublicationRow } from '@/components/PublicationRow'
import { SectionTitle } from '@/components/SectionTitle'
import { IconArrow, iconePorNome } from '@/components/Icons'
import { acessoRapido, orientacoes } from '@/lib/links'
import { NoticiaImagem } from '@/components/NoticiaImagem'
import { PainelFiscal } from '@/components/PainelFiscal'
import { paraHome, type Noticia } from '@/lib/noticias'
import { formatarData, maisRecente, ultimasAtualizacoes } from '@/lib/acervo'

const btnPrimario =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-brand bg-navy px-6 text-body font-semibold text-on-navy transition hover:bg-navy-deep'
const linkTerciario =
  'group inline-flex min-h-12 items-center gap-2 text-body font-semibold text-navy underline underline-offset-4 hover:decoration-2'

function Hero() {
  return (
    <section aria-labelledby="titulo-hero" className="relative isolate overflow-hidden bg-paper">
      <div className="mx-auto max-w-page lg:grid lg:min-h-[17.5rem] lg:grid-cols-12 lg:items-center">
        <div className="relative z-10 px-5 pb-6 pt-8 md:px-8 md:pt-10 lg:col-span-6 lg:py-9">
          <span className="accent-bar !mt-0 mb-4 !w-20" aria-hidden="true" />
          <h1
            id="titulo-hero"
            className="text-display !text-ink"
          >
            Transparência e responsabilidade na gestão das finanças públicas
          </h1>
          <p className="mt-3 max-w-md text-lead text-ink-soft">
            Informações fiscais, contabilidade, dívida pública e publicações do Tesouro Estadual.
          </p>
          <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/publicacoes" className={`${btnPrimario} w-full sm:w-auto`}>
              Acessar publicações <IconArrow className="h-5 w-5" />
            </Link>
            <Link href="/sobre" className={linkTerciario}>
              Conheça o Tesouro <IconArrow className="h-[18px] w-[18px]" />
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

function AcessoRapido() {
  return (
    <section aria-labelledby="acesso-rapido" className="border-y border-line bg-paper">
      <div className="mx-auto max-w-page px-5 py-5 md:px-8 lg:flex lg:items-center lg:gap-8">
        <h2 id="acesso-rapido" className="mb-3 flex items-center gap-3 text-section lg:mb-0 lg:shrink-0">
          <span aria-hidden="true" className="inline-block h-9 w-1 shrink-0" style={{ background: 'linear-gradient(#39B5E8 50%, #F28AB2 50%)' }} />
          Acesso rápido
        </h2>
        <ul className="grid grid-cols-2 lg:flex lg:flex-1 lg:justify-between">
          {acessoRapido.map((a, i) => {
            const Icone = iconePorNome[a.icone]
            return (
              <li key={a.rotulo} className={`border-line ${i % 2 === 1 ? 'border-l pl-4' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} lg:flex-1 lg:border-l lg:pl-6`}>
                <Link href={a.href} className="flex min-h-14 items-center gap-3 py-3 text-body font-medium leading-tight text-ink underline-offset-4 hover:underline">
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
  const resultado = maisRecente({ pagina: 'resultado-do-tesouro-estadual' })
  const divida = maisRecente({ pagina: 'relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal' })
  const rgf = maisRecente({ tipos: ['rgf'] })
  const rreo = maisRecente({ tipos: ['rreo'] })

  return (
    <section aria-labelledby="destaques" className="mx-auto mt-14 max-w-page px-5 md:px-8">
      <SectionTitle
        id="destaques"
        action={
          <Link href="/publicacoes" className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-small font-semibold text-navy hover:underline underline-offset-4">
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
            formato={resultado.formato}
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
            formato={divida.formato}
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

const fmtData = (iso: string) => formatarData(iso)

function Destaque({ n }: { n: Noticia }) {
  return (
    <article className="group relative">
      <NoticiaImagem n={n} sizes="(min-width: 1024px) 56vw, 100vw" prioridade className="aspect-[16/10] rounded-brand" />
      <div className="mt-5">
        <p className="flex items-center gap-3 text-small text-ink-soft">
          <span className="rounded bg-navy px-2 py-0.5 text-label font-semibold uppercase text-on-navy">Em destaque</span>
          <time dateTime={n.data}>{fmtData(n.data)}</time>
        </p>
        <h3 className="mt-3 text-headline">
          <a
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {n.titulo}<span className="sr-only"> (abre em nova aba)</span>
          </a>
        </h3>
        {n.resumo && <p className="mt-3 line-clamp-3 text-lead text-ink-soft">{n.resumo}</p>}
      </div>
    </article>
  )
}

function ItemLateral({ n }: { n: Noticia }) {
  return (
    <article className="group relative grid grid-cols-[7.5rem_1fr] gap-4 py-4 first:pt-0 sm:grid-cols-[9rem_1fr] lg:py-5">
      <NoticiaImagem n={n} sizes="144px" className="aspect-[4/3] rounded-brand" />
      <div className="min-w-0">
        <p className="text-small text-ink-soft"><time dateTime={n.data}>{fmtData(n.data)}</time></p>
        <h3 className="mt-1 text-title !text-ink">
          <a
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-4 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {n.titulo}<span className="sr-only"> (abre em nova aba)</span>
          </a>
        </h3>
      </div>
    </article>
  )
}

function NoticiasPrincipais() {
  const { capa: lead, laterais: lateral } = paraHome()
  if (!lead) return null
  return (
    <section aria-labelledby="noticias" className="mx-auto max-w-page px-5 pt-8 md:px-8 md:pt-10">
      <SectionTitle
        id="noticias"
        action={
          <Link href="/noticias" className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-small font-semibold text-navy underline-offset-4 hover:underline">
            <span>Ver todas<span className="hidden sm:inline"> as notícias</span></span> <IconArrow className="h-[18px] w-[18px]" />
          </Link>
        }
      >
        Notícias
      </SectionTitle>
      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7"><Destaque n={lead} /></div>
        <div className="divide-y divide-line border-t border-line pt-5 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <h3 className="pb-4 !font-sans text-label font-semibold uppercase !text-ink-soft lg:pb-5">Mais recentes</h3>
          {lateral.map((n) => <ItemLateral key={n.href} n={n} />)}
        </div>
      </div>
    </section>
  )
}

function MaisNoticias() {
  const lista = paraHome().grade
  if (lista.length === 0) return null
  return (
    <section aria-labelledby="mais-noticias" className="mx-auto mt-14 max-w-page px-5 md:mt-20 md:px-8">
      <SectionTitle
        id="mais-noticias"
        action={
          <Link href="/noticias" className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-small font-semibold text-navy underline-offset-4 hover:underline">
            <span>Todas as notícias</span> <IconArrow className="h-[18px] w-[18px]" />
          </Link>
        }
      >
        Mais notícias
      </SectionTitle>
      <ul className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((n) => (
          <li key={n.href}>
            <article className="group relative">
              <NoticiaImagem n={n} sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw" className="aspect-[16/10] rounded-brand" />
              <p className="mt-4 text-small text-ink-soft"><time dateTime={n.data}>{fmtData(n.data)}</time></p>
              <h3 className="mt-1 text-title !text-ink">
                <a href={n.href} target="_blank" rel="noopener noreferrer" className="line-clamp-3 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">
                  {n.titulo}<span className="sr-only"> (abre em nova aba)</span>
                </a>
              </h3>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

function UltimasAtualizacoes() {
  const ult = ultimasAtualizacoes(3)
  return (
    <section aria-labelledby="atualizacoes" className="mx-auto mt-14 max-w-page px-5 md:px-8">
      <h3 id="atualizacoes" className="!font-sans text-lead font-semibold !text-ink">Últimas atualizações do acervo</h3>
      <ul className="mt-3 grid gap-x-10 gap-y-4 border-t border-line pt-4 md:grid-cols-3">
        {ult.map((p) => (
          <li key={p.id}>
            <p className="text-small text-ink-soft">{formatarData(p.atualizadoEm)}{p.tamanho ? ` · ${p.formato.toUpperCase()} · ${p.tamanho}` : ''}</p>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline-offset-4 hover:underline">
              {p.titulo}<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
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
                <span className="flex items-center gap-2 font-sans text-lead font-semibold text-ink">
                  {o.titulo} <IconArrow className="h-[18px] w-[18px]" />
                  {externo && <span className="sr-only">(abre em nova aba)</span>}
                </span>
                <span className="mt-1 block text-body text-ink-soft">{o.texto}</span>
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
      <NoticiasPrincipais />
      <div className="mt-12 md:mt-16"><AcessoRapido /></div>
      <PainelFiscal />
      <MaisNoticias />
      <Destaques />
      <UltimasAtualizacoes />
      <Orientacoes />
    </>
  )
}
