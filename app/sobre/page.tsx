import type { Metadata } from 'next'
import Link from 'next/link'
import { IconArrow, IconExternal } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { gerencias, subgerenciasDe } from '@/lib/areas'
import {
  chamada, estrutura, FONTE_HISTORIA, FONTE_MAPA, FONTE_ORGANOGRAMA, funcoes, futuro, marcosHistoria, missao, porQueImporta, quemSomos, resumo, transparencia, valores, visao,
} from '@/lib/institucional'

export const metadata: Metadata = {
  title: 'Conheça o Tesouro Estadual',
  description: resumo,
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)

/** Seção em duas colunas: título à esquerda, texto à direita. Dá ritmo editorial à leitura. */
function Secao({ id, titulo, children, className = '' }: { id: string; titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`grid gap-6 border-t border-line pt-12 lg:grid-cols-12 lg:gap-10 ${className}`}>
      <div className="lg:col-span-4">
        <h2 id={id} className="text-section">{titulo}</h2>
        <span className="accent-bar" aria-hidden="true" />
      </div>
      <div className="lg:col-span-8">{children}</div>
    </section>
  )
}

const paragrafos = 'space-y-4 text-lead text-ink-soft'

export default function Sobre() {
  return (
    <>
      <PageHeader titulo="Conheça o Tesouro Estadual" imagem={{ src: '/img/vitoria-noite.jpg', alt: 'Terceira Ponte iluminada à noite, com os prédios de Vitória ao fundo' }}>
        {chamada}
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
        <p className="max-w-4xl font-serif text-headline font-semibold text-navy">{resumo}</p>

        <div className="mt-12 space-y-16">
          <Secao id="quem-somos" titulo="Quem somos">
            <div className={paragrafos}>{quemSomos.map((t) => <p key={t}>{t}</p>)}</div>
          </Secao>

          <section aria-labelledby="fazemos" className="border-t border-line pt-12">
            <h2 id="fazemos" className="text-section">O que fazemos</h2>
            <span className="accent-bar" aria-hidden="true" />
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

          <Secao id="importa" titulo="Por que o Tesouro importa?">
            <div className={paragrafos}>{porQueImporta.map((t) => <p key={t}>{t}</p>)}</div>
          </Secao>

          <Secao id="futuro" titulo="Preparando as finanças públicas para o futuro">
            <div className={paragrafos}>{futuro.map((t) => <p key={t}>{t}</p>)}</div>
          </Secao>

          <Secao id="transparencia" titulo="Transparência e informação para a sociedade">
            <div className={paragrafos}>{transparencia.texto.map((t) => <p key={t}>{t}</p>)}</div>
            <p className="mt-6 text-body font-semibold text-ink">Acesse as informações do Tesouro:</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {transparencia.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="inline-flex min-h-11 items-center rounded-brand border border-navy px-4 text-body font-semibold text-navy hover:bg-surface">{l.rotulo}</Link></li>
              ))}
            </ul>
          </Secao>

          <section aria-labelledby="estrutura" className="border-t border-line pt-12">
            <h2 id="estrutura" className="text-section">Nossa estrutura</h2>
            <span className="accent-bar" aria-hidden="true" />
            <p className="mt-4 max-w-4xl text-lead text-ink-soft">{estrutura}</p>
            <p className="mt-3 max-w-4xl text-body text-ink-soft">
              Conheça a organização do Tesouro Estadual e escolha uma área para enviar uma mensagem direto a ela pelo{' '}
              <Link href="/contato" className="font-semibold text-navy underline underline-offset-4">Fale conosco</Link>.
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

          <section aria-labelledby="identidade" className="border-t border-line pt-12">
            <h2 id="identidade" className="text-section">Identidade e memória institucional</h2>
            <span className="accent-bar" aria-hidden="true" />
            <p className="mt-3 text-body text-ink-soft">Missão, visão e valores da Secretaria da Fazenda, à qual o Tesouro Estadual pertence.</p>
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
            <p className="mt-6 text-small text-ink-soft">Fonte: Mapa Estratégico da SEFAZ. {ext(FONTE_MAPA, 'Ver o mapa completo')}</p>

            <h3 className="mt-12 text-title">Marcos da nossa história</h3>
            <ol className="mt-6 grid max-w-4xl border-l-2 border-line">
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
        </div>

        <p className="mt-14 border-t border-line pt-6 text-small text-ink-soft">
          Foto do cabeçalho: Vitor Jubini/MTur, domínio público (<Link href="/creditos" className="underline underline-offset-4">créditos</Link>).
        </p>
      </div>
    </>
  )
}
