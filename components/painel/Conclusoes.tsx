'use client'

import { milhoes } from '@/lib/formato'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'
import { arredonda50 } from './AvisoAjustes'
import { NOTA_DISCRETA } from './Estrutura'
import { Abertura } from './Abertura'
import type { PropsFiscais } from './IndicadoresFiscais'

export type Destino = { aba: 'receita' | 'despesa' | 'resultado'; sub?: string; rotulo: string }

/** Parágrafo com a ideia central na primeira frase (em destaque), para a leitura rápida, e o desenvolvimento em seguida. */
type Paragrafo = { topico: string; resto?: string }
type Item = { n: number; paragrafos: Paragrafo[]; destinos?: Destino[] }

/**
 * Considerações gerais do painel (aba de abertura; o identificador e o arquivo mantêm o nome antigo, `conclusoes`, para não quebrar endereços já compartilhados): seis tópicos, cada um com links para os dados em que se apoia. O texto é redigido (não calculado)
 * e reflete os dados coletados em 19/11/2026, com arrecadação e despesa empenhada até outubro; deve ser revisto quando os dados forem atualizados.
 * Os valores dos ajustes da votação vêm do cálculo do aviso, arredondados.
 */
export function Conclusoes({ ajustes, onIr, ...fiscais }: PropsFiscais & { ajustes: AjustesVotacao; onIr: (d: Destino) => void }) {
  const emendas = milhoes(arredonda50(ajustes.emendas), 0)
  const poderes = milhoes(arredonda50(ajustes.poderes), 0)
  const itens: Item[] = [
        { n: 1, destinos: [{ aba: 'resultado', sub: 'resultado', rotulo: 'Resultado' }], paragrafos: [{
      topico: 'A proposta para 2027 repete, em valores correntes, o fechamento projetado de 2026.',
      resto: 'Em relação à nossa projeção, a receita fica praticamente estável (R$ 35,4 bilhões) e a despesa executável, que exclui as reservas de RPPS e de contingência, é cerca de 2% menor (R$ 34,0 bilhões). Em termos reais, o orçamento é menor. A estimativa do Governo para 2026, que consta da Mensagem, é inferior à nossa, mas foi elaborada antes, com menos meses de execução conhecidos.',
    }] },
    { n: 2, destinos: [{ aba: 'receita', rotulo: 'Receita' }], paragrafos: [
      { topico: 'A receita depende de poucas fontes, e é nelas que se concentram os riscos da projeção.',
        resto: 'ICMS, Fundo de Participação dos Estados e petróleo respondem por cerca de dois terços da receita, e o ICMS sozinho, por mais da metade.' },
      { topico: 'O ICMS é o principal risco de frustração.',
        resto: 'A proposta prevê R$ 26,6 bilhões, 7,8% acima da projeção para 2026, em um momento em que a arrecadação perdeu ritmo: cresceu 10,6% no primeiro semestre, 8,4% de julho a outubro e caiu 2,7% em outubro. Cada ponto percentual de crescimento a menos equivale a cerca de R$ 250 milhões.' },
      { topico: 'O petróleo, ao contrário, parece tratado com cautela.',
        resto: 'A proposta embute receita de cerca de R$ 1 bilhão em 2027, contra mais de R$ 3 bilhões projetados para 2026. Como depende do preço do petróleo e do câmbio, essa receita é volátil e foge ao controle do Estado.' },
    ] },
    { n: 3, destinos: [{ aba: 'despesa', sub: 'resumo', rotulo: 'Despesa' }, { aba: 'despesa', sub: 'orgao', rotulo: 'Por órgão' }], paragrafos: [
      { topico: 'A despesa da proposta é menor que a projetada para 2026 e concentra o ajuste em custeio e investimento.',
        resto: 'As outras despesas correntes caem cerca de 9% e os investimentos, 7%, enquanto o pessoal cresce abaixo da inflação e os juros da dívida sobem de forma expressiva.' },
      { topico: 'A proposta não contempla duas pressões da votação.',
        resto: `As emendas impositivas, cerca de R$ ${emendas} milhões além da reserva já prevista, só podem ser financiadas por anulação de outras dotações (LDO, art. 23, I) e aumentam a rigidez do orçamento, porque sua execução é obrigatória. A recomposição das dotações dos Poderes até os limites da LDO, cerca de R$ ${poderes} milhões, também exige anulações ou reestimativa da receita. Esses ajustes ainda não estão neste trabalho.` },
    ] },
    { n: 4, destinos: [{ aba: 'resultado', sub: 'orcado', rotulo: 'Orçado × executado' }], paragrafos: [{
      topico: 'Receita e despesa costumam ser orçadas abaixo do que se realiza, e a nossa projeção indica que 2026 repetirá o padrão.',
      resto: 'De 2022 a 2025, a receita realizada superou o orçamento inicial em média em 15% e a despesa empenhada, em 11%. Antes disso, a despesa ficou próxima ou abaixo do orçado. O histórico não permite estimar a execução de 2027, mas é informação relevante para quem avalia a proposta.',
    }] },
    { n: 5, destinos: [{ aba: 'resultado', sub: 'lrf', rotulo: 'LRF' }, { aba: 'resultado', sub: 'capag', rotulo: 'CAPAG' }], paragrafos: [
      { topico: 'Os indicadores da LRF apontam tranquilidade para 2027, e a atenção na CAPAG recai sobre a poupança corrente.',
        resto: 'O gasto com pessoal deve ficar em cerca de 37% da receita corrente líquida, para um limite de 49%, e as operações de crédito e a dívida estão bem abaixo dos seus limites. A nota A+ se mantém, mas a poupança corrente, estimada em cerca de 80% (a nota A exige menos de 85%), é o indicador de menor margem.' },
      { topico: 'Melhorar o resultado de 2027 é a forma de ampliar essa proteção, e o esforço deve começar já.',
        resto: 'Estudos complementares indicam que a reforma tributária poderá reduzir a arrecadação do ICMS ao longo da transição, concluída em 2033, o que pressionará a poupança corrente nas próximas edições.' },
    ] },
  ]

  return (
    <div>
      <Abertura onIr={onIr} {...fiscais} />
      <ol className="gap-x-8 md:columns-2 print:columns-3 print:gap-x-5">
        {itens.map((it) => (
          <li key={it.n} className="mb-5 flex gap-3 break-inside-avoid print:mb-2">
            <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-label font-semibold text-on-navy">{it.n}</span>
            <div className="min-w-0 space-y-2 print:space-y-1">
              {it.paragrafos.map((p) => (
                <p key={p.topico} className="text-small leading-relaxed text-ink print:text-[0.75rem] print:leading-snug">
                  <span className="font-semibold">{p.topico}</span>{p.resto ? ` ${p.resto}` : ''}
                </p>
              ))}
              {it.destinos && (
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-small print:hidden">
                  {it.destinos.map((d) => (
                    <button key={d.rotulo} type="button" onClick={() => onIr(d)} className="font-semibold text-navy underline decoration-navy/40 underline-offset-2 hover:decoration-navy">
                      Ver {d.rotulo} →
                    </button>
                  ))}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <section aria-label="Sobre esta análise" className="mt-5 border-t border-line pt-3 print:mt-1 print:pt-1">
        <h2 className="text-small font-semibold text-ink">Sobre esta análise</h2>
        <p className="mt-1 text-small leading-relaxed text-ink-soft print:text-[0.75rem] print:leading-snug">
          <span className="font-semibold text-ink">Este painel reúne a proposta de lei orçamentária para 2027, enviada à Assembleia Legislativa em 30 de setembro de 2026 (Mensagem nº 189/2026), e a compara com uma projeção própria da execução de 2026.</span> A projeção parte da arrecadação e da despesa empenhada acumuladas até outubro, extraídas do Portal de Dados Abertos do Estado, e as leva ao fechamento do ano pela participação que esse período teve no total de 2022 a 2025. Os valores do Portal foram conferidos com os quadros da própria Mensagem, o que assegura a comparabilidade. A comparação é feita por natureza da receita e por grupo de despesa e, na despesa, também por órgão.
        </p>
      </section>

      <p className={`mt-4 ${NOTA_DISCRETA} print:mt-1`}>
        Texto redigido com os dados coletados em 19/11/2026: arrecadação e despesa empenhada até outubro. Os números são ordens de grandeza e devem ser revistos quando os dados forem atualizados.
      </p>
    </div>
  )
}
