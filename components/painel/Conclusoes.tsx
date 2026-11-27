'use client'

import { Fragment } from 'react'
import { milhoes } from '@/lib/formato'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'
import { arredonda50 } from './AvisoAjustes'
import { NOTA_DISCRETA } from './Estrutura'

export type Destino = { aba: 'receita' | 'despesa' | 'resultado'; sub?: string; rotulo: string }

/** Cada tópico reúne seus destaques e a fundamentação em um único parágrafo. */
type Trecho = { topico: string; resto: string }
type Item = { n: number; trechos: Trecho[]; destinos?: Destino[] }

/**
 * Considerações gerais do painel (aba de abertura; o identificador e o arquivo mantêm o nome antigo, `conclusoes`, para não quebrar endereços já compartilhados): seis tópicos, cada um com links para os dados em que se apoia. O texto é redigido (não calculado)
 * e reflete os dados coletados em 19/11/2026, com arrecadação e despesa empenhada até outubro; deve ser revisto quando os dados forem atualizados.
 * Os valores dos ajustes da votação vêm do cálculo do aviso, arredondados.
 */
export function Conclusoes({ ajustes, onIr }: { ajustes: AjustesVotacao; onIr?: (d: Destino) => void }) {
  const emendas = milhoes(arredonda50(ajustes.emendas), 0)
  const poderes = milhoes(arredonda50(ajustes.poderes), 0)
  const itens: Item[] = [
    { n: 1, trechos: [{
      topico: 'O painel compara a proposta de lei orçamentária de 2027 com a projeção de fechamento de 2026.',
      resto: 'A projeção da equipe de transição parte da arrecadação e da despesa empenhada de janeiro a outubro de 2026, registradas no Portal de Dados Abertos do Estado. A participação desses meses nos totais anuais de 2022 a 2025 orienta a estimativa. Os valores de receita de 2025 foram conferidos com os quadros da Mensagem nº 189/2026. O painel detalha a receita por natureza e a despesa por grupo e por órgão.',
    }] },
    { n: 2, destinos: [{ aba: 'resultado', sub: 'resultado', rotulo: 'Resultado' }], trechos: [{
      topico: 'Em valores correntes, a proposta para 2027 mantém a receita praticamente estável e reduz a despesa executável.',
      resto: 'A receita líquida de deduções é de R$ 35,4 bilhões, 0,4% abaixo da projeção de 2026. A despesa executável, que exclui as reservas de RPPS e de contingência, soma R$ 34,0 bilhões, com redução de 2,1%. Tanto a receita quanto a despesa executável diminuem em termos reais. A estimativa oficial para 2026, apresentada na Mensagem, é inferior à da equipe de transição e foi elaborada com menos meses de execução disponíveis.',
    }] },
    { n: 3, destinos: [{ aba: 'receita', rotulo: 'Receita' }], trechos: [
      { topico: 'Cerca de dois terços da receita bruta vêm do ICMS, do Fundo de Participação dos Estados e do petróleo.',
        resto: 'O ICMS responde por mais da metade da receita bruta.' },
      { topico: 'O ICMS é o principal risco de frustração.',
        resto: 'A proposta prevê R$ 26,6 bilhões, 7,8% acima da projeção de 2026. Na comparação com os mesmos períodos de 2025, a arrecadação cresceu 10,6% no primeiro semestre e 8,4% de julho a outubro. Em outubro, caiu 2,7%. Cada ponto percentual a menos no crescimento do ICMS equivale a cerca de R$ 250 milhões.' },
      { topico: 'A previsão de receita do petróleo para 2027 é de cerca de R$ 1 bilhão.',
        resto: 'A projeção para 2026 supera R$ 3 bilhões. A receita do petróleo varia com o preço internacional e o câmbio.' },
    ] },
    { n: 4, destinos: [{ aba: 'despesa', sub: 'resumo', rotulo: 'Despesa' }, { aba: 'despesa', sub: 'orgao', rotulo: 'Por órgão' }], trechos: [
      { topico: 'A redução da despesa se concentra no custeio e no investimento.',
        resto: 'Em relação à projeção de 2026, as outras despesas correntes caem cerca de 9% e os investimentos, 7%. A despesa com pessoal cresce abaixo da inflação, e a despesa com juros aumenta 37%.' },
      { topico: 'Dois ajustes ainda dependem da votação do orçamento.',
        resto: `As emendas impositivas exigem anulação de cerca de R$ ${emendas} milhões em outras dotações, além da reserva já prevista (LDO, art. 23, I). Por serem de execução obrigatória, aumentam a rigidez do orçamento. A recomposição das dotações dos Poderes até os limites da LDO, de cerca de R$ ${poderes} milhões, exige anulação de dotações ou reestimativa da receita.` },
    ] },
    { n: 5, destinos: [{ aba: 'resultado', sub: 'orcado', rotulo: 'Orçado × executado' }], trechos: [{
      topico: 'De 2022 a 2025, a receita realizada e a despesa empenhada superaram os valores da LOA.',
      resto: 'A arrecadação ficou, em média, 15% acima da previsão inicial, e a despesa empenhada, 11% acima da dotação inicial. A projeção de 2026 aponta o mesmo comportamento. Entre 2019 e 2021, o valor empenhado ficou próximo ou abaixo da dotação inicial.',
    }] },
    { n: 6, destinos: [{ aba: 'resultado', sub: 'lrf', rotulo: 'LRF' }, { aba: 'resultado', sub: 'capag', rotulo: 'CAPAG' }], trechos: [
      { topico: 'Os indicadores estimados com a PLOA ficam abaixo dos limites da LRF.',
        resto: 'A despesa com pessoal do Executivo equivale a cerca de 37% da receita corrente líquida, ante o limite de 49%. As operações de crédito e a dívida consolidada líquida também ficam abaixo dos respectivos limites.' },
      { topico: 'Na CAPAG, a poupança corrente é o indicador estimado mais próximo da faixa B.',
        resto: 'O Estado recebeu nota A+ na edição de 2026. Para a edição de 2028, a poupança corrente é estimada em cerca de 80%, e a faixa B começa em 85%. A transição tributária pode reduzir a arrecadação de ICMS até 2033. Se a receita corrente ajustada cair e a despesa corrente se mantiver, o indicador sobe, aproximando-se da faixa B.' },
    ] },
  ]

  return (
    <div>
      <ol role="list" className="grid gap-x-8 gap-y-5 md:grid-cols-2 print:grid-cols-3 print:gap-x-5 print:gap-y-2">
        {itens.map((it) => (
          <li key={it.n} className="flex gap-3 print:break-inside-avoid">
            <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-label font-semibold text-on-navy">{it.n}</span>
            <div className="min-w-0 space-y-2 print:space-y-1">
              <p className="text-small leading-relaxed text-ink print:text-[0.75rem] print:leading-snug">
                {it.trechos.map(({ topico, resto }, i) => (
                  <Fragment key={topico}>
                    {i > 0 && ' '}<strong className="font-semibold">{topico}</strong> {resto}
                  </Fragment>
                ))}
              </p>
              {it.destinos && (
                <p className={`flex flex-wrap gap-x-4 text-small ${onIr ? 'print:hidden' : 'print:text-label'}`}>
                  {it.destinos.map((d) => onIr ? (
                    <button key={d.rotulo} type="button" onClick={() => onIr(d)} className="min-h-10 text-left font-semibold text-navy underline decoration-navy/40 underline-offset-2 hover:decoration-navy">
                      Ver {d.rotulo} →
                    </button>
                  ) : (
                    <a key={d.rotulo} href={`#${d.aba}${d.sub ? `-${d.sub}` : ''}`} className="font-semibold text-navy underline underline-offset-2">
                      Ver {d.rotulo} →
                    </a>
                  ))}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className={`mt-4 ${NOTA_DISCRETA} print:mt-2`}>
        Dados coletados em 19/11/2026. Arrecadação e despesa empenhada até outubro de 2026. Valores arredondados.
      </p>
    </div>
  )
}
