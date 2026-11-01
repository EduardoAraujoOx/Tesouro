import type { Metadata } from 'next'
import Link from 'next/link'
import { IconExternal } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { geradoEm, todas } from '@/lib/acervo'
import { AREAS, gerencias, subgerenciasDe } from '@/lib/areas'
import {
  FONTE_HISTORIA, FONTE_MAPA, FONTE_ORGANOGRAMA, marcosHistoria, missao, objetivosFinalisticos, resultadosParaSociedade, secretario, valores, visao,
} from '@/lib/institucional'
import { paginas } from '@/lib/paginas'

export const metadata: Metadata = {
  title: 'Conheça o Tesouro Estadual',
  description: 'Missão, visão e valores, estrutura da Subsecretaria do Tesouro Estadual, história e o que o portal publica.',
}

const mapa = [
  ['Resultado do Tesouro Estadual', 'Desempenho fiscal do Estado, publicado por quadrimestre.', '/tesouro/resultado-do-tesouro-estadual'],
  ['Resultado de Caixa do Tesouro', 'Demonstrativo bimestral do resultado de caixa.', '/tesouro/resultado-de-caixa-do-tesouro-estadual'],
  ['Relatórios fiscais (LRF)', 'RREO (bimestral) e RGF (quadrimestral), exigidos pela Lei de Responsabilidade Fiscal.', '/publicacoes?tipo=lrf'],
  ['Dívida pública e PAF', 'Relatório anual da dívida pública, Programa de Ajuste Fiscal e PROPAG.', '/tesouro/relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal'],
  ['Prestação de Contas do Governador', 'Demonstrativos contábeis, relatórios de gestão e pareceres prévios do TCE-ES.', '/tesouro/prestacao-de-contas-do-governador'],
  ['Transferências aos Municípios', 'Distribuição mensal das transferências constitucionais.', '/tesouro/transferencias-constitucionais-aos-municipios'],
  ['Contabilidade aplicada', 'Manual de Contabilidade (MCONT), normas e procedimentos do Sistema de Contabilidade.', '/publicacoes?tipo=normas-contabeis'],
  ['Legislação do Tesouro', 'Leis, decretos e portarias sobre contabilidade e finanças públicas.', '/tesouro/legislacao-para-orientacoes-contabeis'],
  ['Tesouro Cidadão', 'As contas públicas em linguagem simples: balanço, perguntas e respostas, glossário.', '/cidadao'],
  ['Fundo Soberano (FUNSES)', 'Relatório de desempenho e regimento do comitê gestor.', '/tesouro/funses'],
  ['Finanças: serviços e orientações', 'Contas bancárias, obrigações de pequeno valor, transferências especiais e sistemas.', '/servicos'],
  ['Painel fiscal', 'Nota da CAPAG e limites da Lei de Responsabilidade Fiscal, com séries históricas e dados abertos.', '/indicadores'],
  ['Notícias', 'Notícias da SEFAZ sobre gestão fiscal, contabilidade e dívida.', '/noticias'],
] as const

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
  const subset = AREAS.find((a) => a.id === 'subset')!
  return (
    <>
      <PageHeader titulo="Conheça o Tesouro Estadual" imagem={{ src: '/img/vitoria-noite.jpg', alt: 'Terceira Ponte iluminada à noite, com os prédios de Vitória ao fundo' }}>
        O Tesouro Estadual é a área da Secretaria da Fazenda que cuida do dinheiro público do Espírito Santo: contabilidade, caixa, dívida, fundos e transferências aos municípios.
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
        {/* ---------- Missão, visão e valores ---------- */}
        <section aria-labelledby="identidade">
          <Titulo id="identidade">Missão, visão e valores</Titulo>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">Identidade da Secretaria da Fazenda, da qual o Tesouro Estadual faz parte.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-brand border border-line p-6">
              <h3 className="!font-sans text-label font-semibold uppercase !text-ink-soft">Missão</h3>
              <p className="mt-3 font-serif text-title font-semibold text-navy">{missao}</p>
            </div>
            <div className="rounded-brand border border-line p-6">
              <h3 className="!font-sans text-label font-semibold uppercase !text-ink-soft">Visão</h3>
              <p className="mt-3 font-serif text-title font-semibold text-navy">{visao}</p>
            </div>
          </div>
          <div className="mt-6 rounded-brand bg-surface p-6">
            <h3 className="!font-sans text-label font-semibold uppercase !text-ink-soft">Valores</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {valores.map((v) => <li key={v} className="rounded-full border border-navy px-4 py-1.5 text-body font-medium text-navy">{v}</li>)}
            </ul>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-title">Resultados para a sociedade</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-ink-soft">{resultadosParaSociedade.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
            <div>
              <h3 className="text-title">Objetivos finalísticos</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-ink-soft">{objetivosFinalisticos.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          </div>
          <p className="mt-6 text-small text-ink-soft">Fonte: Mapa Estratégico da SEFAZ. {ext(FONTE_MAPA, 'Ver o mapa completo no site da SEFAZ')}</p>
        </section>

        {/* ---------- Quem somos ---------- */}
        <section aria-labelledby="estrutura" className="mt-16 border-t border-line pt-12">
          <Titulo id="estrutura">Quem somos</Titulo>
          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <div className="rounded-brand border border-line p-6">
                <p className="text-label font-semibold uppercase text-ink-soft">{secretario.cargo}</p>
                <p className="mt-2 font-serif text-title font-semibold text-navy">{secretario.nome}</p>
                <p className="mt-3 text-small text-ink-soft">{secretario.resumo}</p>
                <p className="mt-3 text-small">{ext(secretario.fonte, 'Perfil no site da SEFAZ')}</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <h3 className="text-title">{subset.nome} (SUBSET)</h3>
              <p className="mt-2 text-body text-ink-soft">
                A Subsecretaria reúne {gerencias.length} gerências. Abra cada uma para ver o que faz e para escrever direto para a área responsável.
              </p>
              <div className="mt-5 divide-y divide-line border-y border-line">
                {gerencias.map((g) => (
                  <details key={g.id} className="group py-1">
                    <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-body font-semibold text-ink">
                      <span>{g.nome} <span className="font-normal text-ink-soft">({g.sigla})</span></span>
                      <span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">⌄</span>
                    </summary>
                    <div className="pb-5">
                      <p className="text-body text-ink-soft">{g.assuntos}</p>
                      <p className="mt-2"><Link href={`/contato?area=${g.id}`} className="text-small font-semibold text-navy underline underline-offset-4">Escrever para a {g.sigla}</Link></p>
                      <ul className="mt-4 space-y-4 border-l-2 border-line pl-4">
                        {subgerenciasDe(g.id).map((s) => (
                          <li key={s.id}>
                            <p className="text-body font-medium text-ink">{s.nome} <span className="font-normal text-ink-soft">({s.sigla})</span></p>
                            <p className="text-small text-ink-soft">{s.assuntos}</p>
                            <p className="mt-1"><Link href={`/contato?area=${s.id}`} className="text-small font-semibold text-navy underline underline-offset-4">Escrever para a {s.sigla}</Link></p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
              <p className="mt-4 text-small text-ink-soft">
                Estrutura conforme a Lei nº 12.379/2025 e o Decreto nº 6.005-R/2025. {ext(FONTE_ORGANOGRAMA, 'Organograma oficial da SEFAZ')}
              </p>
            </div>
          </div>
        </section>

        {/* ---------- História ---------- */}
        <section aria-labelledby="historia" className="mt-16 border-t border-line pt-12">
          <Titulo id="historia">Nossa história</Titulo>
          <ol className="mt-6 grid max-w-4xl gap-0 border-l-2 border-line">
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

        {/* ---------- Mapa do portal ---------- */}
        <section aria-labelledby="mapa" className="mt-16 border-t border-line pt-12">
          <Titulo id="mapa">Onde encontrar cada informação</Titulo>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">
            O portal reúne hoje {todas.length} documentos de {paginas.length} áreas do site da SEFAZ, onde os arquivos permanecem hospedados.
          </p>
          <ul className="mt-4 max-w-4xl border-t border-line">
            {mapa.map(([titulo, texto, href]) => (
              <li key={titulo} className="border-b border-line">
                <Link href={href} className="block py-4 hover:bg-surface md:px-2">
                  <span className="font-semibold text-ink">{titulo}</span>
                  <span className="mt-0.5 block text-body text-ink-soft">{texto}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-small text-ink-soft">
            Foto do cabeçalho: Vitor Jubini/MTur, domínio público (<Link href="/creditos" className="underline underline-offset-4">créditos</Link>). Índice atualizado em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
          </p>
        </section>
      </div>
    </>
  )
}
