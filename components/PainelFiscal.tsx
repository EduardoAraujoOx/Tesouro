import Link from 'next/link'
import { IconArrow } from './Icons'
import { Medidor } from './Medidor'
import { formatarData } from '@/lib/acervo'
import { ORDEM_LRF, pct, rotuloPeriodo, serieCapag, ultimaCapag, ultimoLrf } from '@/lib/indicadores'
import { noticiaPorTrecho } from '@/lib/noticias'

const NOTAS = [
  { chave: 'endividamento', nota: 'notaEndividamento', nome: 'Endividamento', texto: 'Peso da dívida em relação à receita' },
  { chave: 'poupanca', nota: 'notaPoupanca', nome: 'Poupança corrente', texto: 'Parcela da receita corrente consumida pela despesa corrente' },
  { chave: 'liquidez', nota: 'notaLiquidez', nome: 'Liquidez', texto: 'Obrigações financeiras frente ao caixa disponível' },
] as const

/** Painel fiscal da página inicial: vitrine (CAPAG) e controle (limites da LRF), com dados oficiais. */
export function PainelFiscal() {
  const c = ultimaCapag
  const noticia = noticiaPorTrecho('excelencia-na-gestao-fiscal')
  return (
    <section aria-labelledby="painel-fiscal" className="on-dark mt-14 bg-navy text-on-navy md:mt-20">
      <div className="mx-auto max-w-page px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h2 id="painel-fiscal" className="max-w-2xl text-headline !text-on-navy">Painel fiscal</h2>
            <span className="accent-bar" aria-hidden="true" />
            <p className="mt-4 max-w-2xl text-lead opacity-95">
              Indicadores oficiais do Espírito Santo, do Siconfi e do Tesouro Nacional, com a fonte e o relatório de cada número.
            </p>
          </div>
          <Link href="/indicadores" className="inline-flex min-h-11 items-center gap-2 text-body font-semibold underline underline-offset-4">
            Ver séries históricas e metodologia <IconArrow className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-12">
          {/* Vitrine: CAPAG */}
          <article aria-labelledby="capag-titulo" className="rounded-brand bg-paper p-6 text-ink md:p-8 lg:col-span-5">
            <h3 id="capag-titulo" className="!font-sans text-label font-semibold uppercase !text-ink-soft">Capacidade de pagamento (CAPAG)</h3>
            <div className="mt-3 flex items-end gap-5">
              <p className="font-serif text-numeral font-semibold text-navy" aria-label={`Nota ${c.classificacao?.replace('+', ' mais')}`}>{c.classificacao}</p>
              <p className="pb-2 text-small text-ink-soft">Edição {c.ano}<br />Tesouro Nacional</p>
            </div>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {NOTAS.map((n) => (
                <li key={n.chave} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-body font-semibold">{n.nome}</p>
                    <p className="text-small text-ink-soft">{n.texto}</p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block text-title font-semibold text-navy">{pct(c[n.chave])}</span>
                    <span className="text-small text-ink-soft">nota {c[n.nota]}</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-small text-ink-soft">
              Nota {c.qualidadeInformacao} em qualidade da informação contábil e fiscal no Siconfi.
              {noticia && (
                <> Em 2026, o Estado manteve a nota A+ pelo terceiro ano consecutivo.{' '}
                  <a href={noticia.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline underline-offset-4">Leia a notícia<span className="sr-only"> (abre em nova aba)</span></a>.</>
              )}
            </p>
            <p className="mt-4 text-label font-semibold uppercase text-ink-soft">Histórico</p>
            <ol className="mt-2 flex flex-wrap gap-2" aria-label="Classificação da CAPAG por edição">
              {serieCapag.map((e) => (
                <li key={e.ano} className="rounded-brand border border-line px-2.5 py-1 text-center">
                  <span className="block text-label text-ink-soft">{e.ano}</span>
                  <span className="block text-body font-semibold">{e.classificacao}</span>
                </li>
              ))}
            </ol>
          </article>

          {/* Controle: limites da LRF */}
          <article aria-labelledby="lrf-titulo" className="rounded-brand bg-paper p-6 text-ink md:p-8 lg:col-span-7">
            <h3 id="lrf-titulo" className="!font-sans text-label font-semibold uppercase !text-ink-soft">Limites da Lei de Responsabilidade Fiscal</h3>
            <p className="mt-2 text-lead font-semibold">{rotuloPeriodo(ultimoLrf)}</p>
            <p className="text-small text-ink-soft">
              Poder Executivo · % da receita corrente líquida (RCL) ajustada
              {ultimoLrf.entregaEm && <> · RGF entregue ao Siconfi em {formatarData(ultimoLrf.entregaEm)}</>}
            </p>
            <div className="mt-6 space-y-7">
              {ORDEM_LRF.map((k) => <Medidor key={k} chave={k} periodo={ultimoLrf} />)}
            </div>
            <p className="mt-6 border-t border-line pt-4 text-small text-ink-soft">
              A barra vai de zero ao limite legal; as marcas indicam o limite de alerta (90%) e o prudencial (95%, na despesa com pessoal).
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
