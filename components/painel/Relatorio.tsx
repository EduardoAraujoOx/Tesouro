import type { DadosPainel } from '@/lib/dados-painel'
import { bilhoes, pct } from '@/lib/formato'
import { IDENTIDADE } from '@/lib/identidade-painel'
import type { LinhaMacro } from '@/lib/macro'
import { Conclusoes } from './Conclusoes'
import { SecaoDados } from './SecaoDados'
import { projecaoItens, projetaDespesa2026, projetaReceita2026 } from './projecao'

const secoes = [
  { id: 'conclusoes', titulo: 'Considerações gerais' },
  { id: 'receita', titulo: 'Receita' },
  { id: 'despesa', titulo: 'Despesa' },
  { id: 'resultado', titulo: 'Resultado orçamentário' },
] as const

// A última coluna dos quadros da Mensagem contém a PLOA de 2027.
function valorPloa(linhas: LinhaMacro[], chave: string) {
  return linhas.find((linha) => linha.chave === chave)!.valores[5]
}

function comparacao(valor: number, projecao: number) {
  if (projecao <= 0) return 'Projeção de 2026 indisponível'
  const variacao = (valor / projecao - 1) * 100
  return `${variacao > 0 ? '+' : ''}${pct(variacao)} sobre a projeção de 2026`
}

export function Relatorio({ dados }: { dados: DadosPainel }) {
  const { macro, receitaMes, fiscais } = dados
  const receita = valorPloa(macro.receita, 'total')
  const despesa = valorPloa(macro.despesa, 'total') - valorPloa(macro.despesa, 'reserva_rpps') - valorPloa(macro.despesa, 'reserva_contingencia')
  const icms = valorPloa(macro.receita, 'icms')
  const capag = [...fiscais.capag].sort((a, b) => b.ano - a.ano)[0]
  const numeros = [
    { rotulo: 'Receita líquida', valor: bilhoes(receita), referencia: comparacao(receita, projetaReceita2026(receitaMes).central) },
    { rotulo: 'Despesa executável', valor: bilhoes(despesa), referencia: comparacao(despesa, projetaDespesa2026().itens.tot.central) },
    { rotulo: 'ICMS', valor: bilhoes(icms), referencia: comparacao(icms, projecaoItens(receitaMes).icms.central) },
    { rotulo: 'CAPAG oficial', valor: capag?.classificacao ?? 'Sem dado', referencia: capag ? `Edição de ${capag.ano} · ano-base ${capag.ano - 1}` : 'Edição indisponível' },
  ]

  return (
    <article data-relatorio-painel className="painel relatorio-painel mx-auto max-w-[1200px] bg-paper p-4 md:p-8 print:p-0">
      <div className="relatorio-capa">
        <header className="rounded-xl bg-navy-deep p-5 text-on-navy md:p-8">
          <p className="text-small font-medium">{IDENTIDADE.faixa}</p>
          <h1 className="mt-2 text-display !text-on-navy">Relatório orçamentário 2027</h1>
          <p className="mt-2 text-lead">PLOA 2027 e projeção de fechamento de 2026</p>
        </header>
        <h2 className="mt-6 text-section">Resumo executivo</h2>
        <p className="mt-2 max-w-4xl text-body">
          A proposta orçamentária de 2027 é comparada à projeção da equipe de transição para o fechamento de 2026. Os valores da proposta estão em termos nominais. A receita é líquida de deduções e a despesa executável exclui as reservas de RPPS e de contingência.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          {numeros.map(({ rotulo, valor, referencia }) => (
            <div key={rotulo} className="rounded-brand border border-line bg-surface p-3">
              <dt className="text-small font-medium text-ink-soft">{rotulo}</dt>
              <dd className="mt-1 text-title font-semibold tabular-nums text-navy">{valor}</dd>
              <dd className="mt-1 text-small leading-snug text-ink-soft">{referencia}</dd>
            </div>
          ))}
        </dl>
        <nav aria-label="Sumário" className="mt-6 border-t border-line pt-3">
          <h2 className="text-title">Sumário</h2>
          <ol className="mt-2 grid gap-2 text-small sm:grid-cols-2 print:grid-cols-2">
            {secoes.map(({ id, titulo }, i) => (
              <li key={id}><a href={`#${id}`} className="font-semibold text-navy underline underline-offset-4">{i + 1}. {titulo}</a></li>
            ))}
          </ol>
        </nav>
        <p className="mt-5 text-small text-ink-soft print:hidden">{IDENTIDADE.aviso}</p>
      </div>
      {secoes.map(({ id, titulo }) => (
        <div key={id} id={id} className="relatorio-capitulo mt-8 border-t border-line pt-4 print:mt-0 print:border-0 print:pt-0">
          <h2 className="mb-3 text-section print:mb-2 print:text-title">{titulo}</h2>
          {id === 'conclusoes'
            ? <Conclusoes ajustes={dados.ajustes} />
            : <SecaoDados vista={id} dados={dados} relatorio />}
        </div>
      ))}
    </article>
  )
}
