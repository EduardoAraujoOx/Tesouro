import type { Metadata } from 'next'
import Link from 'next/link'
import { IconExternal } from '@/components/Icons'
import { GraficoSerie } from '@/components/GraficoSerie'
import { Medidor } from '@/components/Medidor'
import { PageHeader } from '@/components/PageHeader'
import { formatarData, maisRecente } from '@/lib/acervo'
import {
  bilhoes, capagAtualizadaEm, degrauHaveres, fontes, INDICADORES_LRF, ORDEM_LRF, pct, rotuloCurto, rotuloPeriodo,
  serieCapag, serieLrf, ultimoLrf,
} from '@/lib/indicadores'

export const metadata: Metadata = {
  title: 'Painel fiscal',
  description: 'Indicadores fiscais oficiais do Espírito Santo: nota da CAPAG e limites da Lei de Responsabilidade Fiscal, com séries históricas, metodologia e dados abertos.',
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)

export default function Indicadores() {
  const rgf = maisRecente({ tipos: ['rgf'] })
  const degrau = degrauHaveres()

  return (
    <>
      <PageHeader titulo="Painel fiscal" trilha="Painel fiscal">
        Indicadores oficiais do Estado do Espírito Santo, extraídos do Siconfi e do Tesouro Nacional, com séries históricas, a explicação de cada número e os dados em formato aberto.
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-10 md:px-8 md:py-14">
        {/* ---------- Limites da LRF ---------- */}
        <section aria-labelledby="lrf">
          <h2 id="lrf" className="text-section">Limites da Lei de Responsabilidade Fiscal</h2>
          <span className="accent-bar" aria-hidden="true" />
          <p className="mt-4 max-w-3xl text-lead text-ink-soft">
            Quatro limites legais que o Estado precisa respeitar. Os valores são os do Relatório de Gestão Fiscal (RGF) do Poder Executivo, entregue ao Siconfi a cada quadrimestre. Último período: <strong className="text-ink">{rotuloPeriodo(ultimoLrf)}</strong>.
          </p>

          <div className="mt-10 space-y-14">
            {ORDEM_LRF.map((k) => {
              const def = INDICADORES_LRF[k]
              const ref = ultimoLrf[k]
              const pontos = serieLrf.map((p) => ({ rotulo: rotuloCurto(p), ano: p.ano, quad: p.quad, valor: p[k].valor }))
              const linhas = [
                { valor: ref.limite, rotulo: 'Limite', estilo: 'limite' as const },
                { valor: ref.prudencial ?? null, rotulo: 'Prudencial', estilo: 'prudencial' as const },
                { valor: ref.alerta, rotulo: 'Alerta', estilo: 'alerta' as const },
              ].filter((l) => l.valor !== null)
              return (
                <article key={k} aria-labelledby={`ind-${k}`} className="grid gap-8 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-5">
                    <h3 id={`ind-${k}`} className="text-title">{def.nome}</h3>
                    <p className="mt-3 text-body text-ink-soft">{def.oQue}</p>
                    <div className="mt-6 rounded-brand border border-line p-5"><Medidor chave={k} periodo={ultimoLrf} /></div>
                    <p className="mt-3 text-small text-ink-soft">Fonte: {def.anexo}, Siconfi. Base legal: {def.base}.</p>
                  </div>
                  <div className="lg:col-span-7">
                    <GraficoSerie
                      id={`graf-${k}`}
                      titulo={`${def.nome}, em % da receita corrente líquida, por quadrimestre`}
                      subtitulo={k === 'credito' ? 'Em % da RCL ajustada, acumulado no exercício (volta a zero a cada janeiro).' : 'Em % da RCL ajustada, ao fim de cada quadrimestre.'}
                      reiniciaPorAno={k === 'credito'}
                      pontos={pontos}
                      linhas={linhas}
                      anotacao={k === 'divida' && degrau ? { ano: degrau.em.ano, quad: degrau.em.quad, texto: 'Nota abaixo' } : undefined}
                    />
                    {k === 'divida' && degrau && (
                      <p className="mt-3 rounded-brand bg-surface p-4 text-small text-ink-soft">
                        <strong className="text-ink">Nota sobre a série.</strong> No {rotuloPeriodo(degrau.em)}, o item “demais haveres financeiros”, que reduz a dívida líquida, passou de {bilhoes(degrau.de)} para {bilhoes(degrau.para)}, enquanto a dívida bruta permaneceu estável. Por isso a série apresenta um degrau nesse ponto.
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* ---------- CAPAG ---------- */}
        <section aria-labelledby="capag" className="mt-20 border-t border-line pt-14">
          <h2 id="capag" className="text-section">Capacidade de pagamento (CAPAG)</h2>
          <span className="accent-bar" aria-hidden="true" />
          <p className="mt-4 max-w-3xl text-lead text-ink-soft">
            O Tesouro Nacional avalia, todo ano, a situação fiscal dos estados por três indicadores: endividamento, poupança corrente e liquidez. Cada um recebe uma nota (A, B ou C) e a combinação resulta na nota final. A partir de 2024, as classificações A+ e B+ também consideram a qualidade da informação contábil e fiscal enviada ao Siconfi.
          </p>
          <div className="mt-8 overflow-x-auto rounded-brand border border-line" role="region" aria-label="Tabela da CAPAG por edição (role horizontalmente em telas pequenas)" tabIndex={0}>
            <table className="w-full min-w-[40rem] text-left text-body">
              <caption className="sr-only">Notas e indicadores da CAPAG do Espírito Santo por edição</caption>
              <thead className="bg-surface text-small">
                <tr>
                  <th scope="col" className="px-4 py-3">Edição</th>
                  <th scope="col" className="px-4 py-3">Nota CAPAG</th>
                  <th scope="col" className="px-4 py-3 text-right">Endividamento</th>
                  <th scope="col" className="px-4 py-3 text-right">Poupança corrente</th>
                  <th scope="col" className="px-4 py-3 text-right">Liquidez</th>
                  <th scope="col" className="px-4 py-3">Informação contábil e fiscal</th>
                </tr>
              </thead>
              <tbody>
                {[...serieCapag].reverse().map((e) => (
                  <tr key={e.ano} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 font-semibold">{e.ano}</th>
                    <td className="px-4 py-3 font-semibold text-navy">{e.classificacao}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pct(e.endividamento)}{e.notaEndividamento && <span className="text-ink-soft"> ({e.notaEndividamento})</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pct(e.poupanca)}{e.notaPoupanca && <span className="text-ink-soft"> ({e.notaPoupanca})</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pct(e.liquidez)}{e.notaLiquidez && <span className="text-ink-soft"> ({e.notaLiquidez})</span>}</td>
                    <td className="px-4 py-3">{e.qualidadeInformacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-3xl text-small text-ink-soft">
            Fonte: {ext(fontes.capag, 'Capacidade de Pagamento dos Estados e do DF, Tesouro Transparente')}, conjunto atualizado em {formatarData(capagAtualizadaEm)}. Notas entre parênteses são as notas de cada indicador (disponíveis a partir da edição 2019). <strong className="text-ink">Ressalva do Tesouro Nacional:</strong> o resultado apurado para a CAPAG não vincula a posição do Tesouro Nacional; o cálculo definitivo é feito quando se verifica o cumprimento dos limites e condições para contratar operações de crédito com garantia da União.
          </p>
        </section>

        {/* ---------- Metodologia ---------- */}
        <section aria-labelledby="metodo" className="mt-20 border-t border-line pt-14">
          <h2 id="metodo" className="text-section">Como os números chegam aqui</h2>
          <span className="accent-bar" aria-hidden="true" />
          <div className="mt-6 grid max-w-4xl gap-6 text-body text-ink-soft">
            <p>
              <strong className="text-ink">Origem.</strong> Os limites da LRF vêm do Relatório de Gestão Fiscal do Poder Executivo, lido na {ext(fontes.siconfi, 'API de dados abertos do Siconfi')} (Tesouro Nacional). A nota da CAPAG vem do conjunto de dados abertos do Tesouro Transparente. O portal não altera esses valores: apenas converte, quando o relatório informa o limite em reais, em percentual da receita corrente líquida ajustada.
            </p>
            <p>
              <strong className="text-ink">Atualização.</strong> O RGF é entregue a cada quadrimestre e a CAPAG, uma vez por ano. Este painel é atualizado com a rotina de coleta do portal. Último período: {rotuloPeriodo(ultimoLrf)}{ultimoLrf.entregaEm && <>, entregue em {formatarData(ultimoLrf.entregaEm)}</>}.
            </p>
            <p>
              <strong className="text-ink">Limites antes de 2024.</strong> Nos relatórios anteriores a 2024, o limite da dívida (200%) e o das garantias (22%) não constam em reais; o painel usa o valor fixado pelo Senado Federal, o mesmo que consta dos relatórios recentes.
            </p>
            <p>
              <strong className="text-ink">Documento oficial.</strong> O que vale como publicação é o relatório divulgado pela SEFAZ: {rgf ? ext(rgf.url, rgf.titulo) : 'RGF'} e as demais edições no <Link href="/tesouro/rgf" className="font-semibold text-navy underline underline-offset-4">acervo do RGF</Link>.
            </p>
          </div>
          <h3 className="mt-10 text-title">Dados abertos</h3>
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-body">
            <li><a href="/dados/limites-lrf-es.csv" download className="font-semibold text-navy underline underline-offset-4">Limites da LRF por quadrimestre (CSV)</a></li>
            <li><a href="/dados/capag-es.csv" download className="font-semibold text-navy underline underline-offset-4">CAPAG por edição (CSV)</a></li>
          </ul>
        </section>
      </div>
    </>
  )
}
