import type { Metadata } from 'next'
import Link from 'next/link'
import { IconArrow, IconExternal } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { geradoEm } from '@/lib/acervo'
import { gerencias, subgerenciasDe } from '@/lib/areas'
import {
  definicao, FONTE_HISTORIA, FONTE_MAPA, FONTE_ORGANOGRAMA, funcoes, marcosHistoria, missao, valores, visao,
} from '@/lib/institucional'

export const metadata: Metadata = {
  title: 'Conheça o Tesouro Estadual',
  description: definicao,
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <>
      <h2 id={id} className="text-section">{children}</h2>
      <span className="accent-bar" aria-hidden="true" />
    </>
  )
}

export default function Sobre() {
  return (
    <>
      <PageHeader titulo="Conheça o Tesouro Estadual" imagem={{ src: '/img/vitoria-noite.jpg', alt: 'Terceira Ponte iluminada à noite, com os prédios de Vitória ao fundo' }}>
        {definicao}
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
        {/* ---------- O que o Tesouro faz ---------- */}
        <section aria-labelledby="funcoes">
          <Titulo id="funcoes">O que o Tesouro Estadual faz</Titulo>
          <ul className="mt-8 grid gap-x-10 gap-y-9 md:grid-cols-2 lg:grid-cols-3">
            {funcoes.map((f) => (
              <li key={f.titulo} className="border-t-2 border-navy pt-4">
                <h3 className="text-title">{f.titulo}</h3>
                <p className="mt-2 text-body text-ink-soft">{f.texto}</p>
                <p className="mt-3"><Link href={f.href} className="inline-flex items-center gap-2 text-small font-semibold text-navy underline underline-offset-4">Saiba mais <IconArrow className="h-4 w-4" /></Link></p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Missão, visão e valores ---------- */}
        <section aria-labelledby="identidade" className="mt-16 border-t border-line pt-12">
          <Titulo id="identidade">Missão, visão e valores</Titulo>
          <p className="mt-3 text-body text-ink-soft">Identidade da Secretaria da Fazenda, à qual o Tesouro Estadual pertence.</p>
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h3 className="!font-sans text-label font-semibold uppercase !text-ink-soft">Missão</h3>
              <p className="mt-3 font-serif text-title font-semibold text-navy">{missao}</p>
            </div>
            <div className="lg:col-span-5">
              <h3 className="!font-sans text-label font-semibold uppercase !text-ink-soft">Visão</h3>
              <p className="mt-3 font-serif text-title font-semibold text-navy">{visao}</p>
            </div>
            <div className="lg:col-span-3">
              <h3 className="!font-sans text-label font-semibold uppercase !text-ink-soft">Valores</h3>
              <ul className="mt-3 space-y-1.5 text-body font-medium text-ink">{valores.map((v) => <li key={v}>{v}</li>)}</ul>
            </div>
          </div>
          <p className="mt-8 text-small text-ink-soft">Fonte: Mapa Estratégico da SEFAZ. {ext(FONTE_MAPA, 'Ver o mapa completo')}</p>
        </section>

        {/* ---------- Estrutura ---------- */}
        <section aria-labelledby="estrutura" className="mt-16 border-t border-line pt-12">
          <Titulo id="estrutura">Estrutura da Subsecretaria</Titulo>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">
            A Subsecretaria do Tesouro Estadual (SUBSET) reúne {gerencias.length} gerências. Escolha uma área para enviar uma mensagem direto a ela pelo Fale conosco.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {gerencias.map((g) => (
              <li key={g.id} className="flex flex-col rounded-brand border border-line p-6">
                <h3 className="text-body font-semibold text-ink">{g.nome}</h3>
                <p className="mt-1 text-small font-semibold text-navy">{g.sigla}</p>
                <ul className="mt-4 flex-1 space-y-2 border-t border-line pt-4">
                  {subgerenciasDe(g.id).map((s) => (
                    <li key={s.id} className="text-small">
                      <Link href={`/contato?area=${s.id}`} className="text-ink underline-offset-4 hover:underline">{s.nome}</Link>{' '}
                      <span className="text-ink-soft">({s.sigla})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5"><Link href={`/contato?area=${g.id}`} className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-navy underline underline-offset-4">Escrever para a {g.sigla} <IconArrow className="h-4 w-4" /></Link></p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-small text-ink-soft">Conforme a Lei nº 12.379/2025 e o Decreto nº 6.005-R/2025. {ext(FONTE_ORGANOGRAMA, 'Organograma oficial da SEFAZ')}</p>
        </section>

        {/* ---------- História ---------- */}
        <section aria-labelledby="historia" className="mt-16 border-t border-line pt-12">
          <Titulo id="historia">Memória institucional</Titulo>
          <ol className="mt-8 grid max-w-4xl border-l-2 border-line">
            {marcosHistoria.map((m) => (
              <li key={m.quando} className="relative pb-6 pl-6 last:pb-0">
                <span aria-hidden="true" className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-navy" />
                <p className="text-small font-semibold text-navy">{m.quando}</p>
                <p className="mt-0.5 text-body text-ink-soft">{m.texto}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-small text-ink-soft">Resumo de "História Institucional", texto elaborado para a SEFAZ por pesquisadores do Espaço Cultural Burle Marx. {ext(FONTE_HISTORIA, 'Ler o texto completo')}</p>
        </section>

        <p className="mt-14 border-t border-line pt-6 text-small text-ink-soft">
          Foto do cabeçalho: Vitor Jubini/MTur, domínio público (<Link href="/creditos" className="underline underline-offset-4">créditos</Link>). Índice do acervo atualizado em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
        </p>
      </div>
    </>
  )
}
