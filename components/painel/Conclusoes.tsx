'use client'

import { milhoes } from '@/lib/formato'
import type { AjustesVotacao } from '@/lib/ajustes-ploa'
import { arredonda50 } from './AvisoAjustes'
import { Nota, NOTA_DISCRETA } from './Estrutura'

export type Destino = { aba: 'receita' | 'despesa' | 'resultado'; sub?: string; rotulo: string }

/** Parágrafo com a ideia central na primeira frase (em destaque), para a leitura rápida, e o desenvolvimento em seguida. */
type Paragrafo = { topico: string; resto?: string }
type Item = { titulo: string; paragrafos: Paragrafo[]; metodo?: string; destinos?: Destino[] }

/**
 * Considerações gerais do painel (aba de abertura; o identificador e o arquivo mantêm o nome antigo, `conclusoes`, para não quebrar endereços já compartilhados): seis tópicos, cada um com links para os dados em que se apoia. O texto é redigido (não calculado)
 * e reflete os dados coletados em 19/11/2026, com arrecadação e despesa empenhada até outubro; deve ser revisto quando os dados forem atualizados.
 * Os valores dos ajustes da votação vêm do cálculo do aviso, arredondados.
 */
export function Conclusoes({ ajustes, onIr }: { ajustes: AjustesVotacao; onIr: (d: Destino) => void }) {
  const emendas = milhoes(arredonda50(ajustes.emendas), 0)
  const poderes = milhoes(arredonda50(ajustes.poderes), 0)
  const itens: Item[] = [
    { titulo: 'Base da comparação', paragrafos: [{
      topico: 'A projeção de fechamento de 2026 parte da arrecadação e da despesa empenhada até outubro.',
      resto: 'A equipe estima o total do ano com base no padrão sazonal observado de 2022 a 2025.',
    }], metodo: 'A proposta foi enviada à Assembleia Legislativa em 30 de setembro de 2026 (Mensagem nº 189/2026). Os valores do Portal de Dados Abertos do Estado foram conferidos com os quadros da Mensagem. A comparação é feita por natureza da receita, por grupo de despesa e, no caso da despesa, também por órgão.' },
    { titulo: 'Orçamento de 2027', destinos: [{ aba: 'resultado', sub: 'resultado', rotulo: 'Resultado' }], paragrafos: [{
      topico: 'A proposta mantém a receita praticamente estável e reduz a despesa executável.',
      resto: 'A receita prevista é de R$ 35,4 bilhões. A despesa executável, excluídas as reservas de RPPS e de contingência, é de R$ 34,0 bilhões, cerca de 2% abaixo da projeção de fechamento de 2026. Em termos reais, ambos os valores recuam. A estimativa de 2026 publicada na Mensagem é inferior à da equipe e foi elaborada com menos meses de execução conhecidos.',
    }] },
    { titulo: 'Receita', destinos: [{ aba: 'receita', rotulo: 'Receita' }], paragrafos: [
      { topico: 'O ICMS responde por mais da metade da receita.',
        resto: 'Somado ao Fundo de Participação dos Estados e à receita do petróleo, responde por cerca de dois terços.' },
      { topico: 'A arrecadação do ICMS perdeu ritmo em 2026.',
        resto: 'O crescimento foi de 10,6% no primeiro semestre e de 8,4% de julho a outubro, com queda de 2,7% em outubro. A proposta prevê R$ 26,6 bilhões em 2027, 7,8% acima da projeção para 2026. Cada ponto percentual a menos de crescimento equivale a cerca de R$ 250 milhões de receita.' },
      { topico: 'A proposta estima uma receita menor com o petróleo.',
        resto: 'A previsão para 2027 é de cerca de R$ 1 bilhão, ante mais de R$ 3 bilhões projetados para 2026. O preço do petróleo e o câmbio estão entre os fatores que explicam a volatilidade dessa receita.' },
    ] },
    { titulo: 'Despesa', destinos: [{ aba: 'despesa', sub: 'resumo', rotulo: 'Despesa' }, { aba: 'despesa', sub: 'orgao', rotulo: 'Por órgão' }], paragrafos: [
      { topico: 'A redução da despesa se concentra em custeio e investimento.',
        resto: 'Em relação à projeção de 2026, as outras despesas correntes caem cerca de 9% e os investimentos, 7%. O gasto com pessoal cresce abaixo da inflação, e os juros da dívida sobem de forma expressiva.' },
      { topico: 'A comparação considera a proposta enviada à Assembleia, antes dos ajustes da votação.',
        resto: `As emendas impositivas somam cerca de R$ ${emendas} milhões além da reserva prevista. O financiamento exige a anulação de outras dotações (LDO, art. 23, I), e a execução obrigatória reduz a margem para remanejamento. A recomposição das dotações dos Poderes até os limites da LDO, de cerca de R$ ${poderes} milhões, exige anulação de despesas ou reestimativa da receita.` },
    ] },
    { titulo: 'Histórico de execução', destinos: [{ aba: 'resultado', sub: 'orcado', rotulo: 'Orçado × executado' }], paragrafos: [{
      topico: 'Receita e despesa superaram o orçamento inicial de 2022 a 2025.',
      resto: 'No período, a receita realizada ficou em média 15% acima do previsto e a despesa empenhada, 11% acima. De 2019 a 2021, a despesa ficou próxima ou abaixo da dotação inicial. A projeção para 2026 indica nova execução acima do orçamento nas duas contas.',
    }] },
    { titulo: 'Indicadores fiscais', destinos: [{ aba: 'resultado', sub: 'lrf', rotulo: 'LRF' }, { aba: 'resultado', sub: 'capag', rotulo: 'CAPAG' }], paragrafos: [
      { topico: 'A despesa com pessoal do Executivo fica abaixo do limite da LRF na proposta.',
        resto: 'A estimativa é de cerca de 37% da receita corrente líquida, para um limite de 49%. As operações de crédito previstas e a dívida apurada também ficam abaixo dos respectivos limites.' },
      { topico: 'A edição de 2026 da CAPAG atribuiu nota A+ ao Estado.',
        resto: 'Para a edição de 2028, a poupança corrente é estimada em cerca de 80%. É o indicador estimado mais próximo da faixa B, que começa em 85%. A liquidez depende dos dados de caixa.' },
      { topico: 'A transição tributária pode reduzir a arrecadação de ICMS até 2033.',
        resto: 'Se a receita corrente ajustada diminuir e a despesa corrente se mantiver, a relação entre as duas sobe, reduzindo a margem da poupança corrente para a faixa A.' },
    ] },
  ]

  return (
    <div>
      <ol role="list" className="grid gap-3 md:grid-cols-2 md:gap-4 print:grid-cols-3 print:gap-x-5 print:gap-y-2">
        {itens.map((it) => (
          <li key={it.titulo} className="flex min-w-0 flex-col rounded-xl border border-line bg-paper p-4 sm:p-5 print:break-inside-avoid print:rounded-none print:border-0 print:p-0">
            <h3 className="mb-2 text-title print:mb-1 print:text-small">{it.titulo}</h3>
            <div className="space-y-2 print:space-y-1">
              {it.paragrafos.map((p) => (
                <p key={p.topico} className="text-small leading-relaxed text-ink print:text-[0.75rem] print:leading-snug">
                  <span className="font-semibold">{p.topico}</span>{p.resto ? ` ${p.resto}` : ''}
                </p>
              ))}
            </div>
            {it.metodo && <Nota titulo="Metodologia e fontes">{it.metodo}</Nota>}
            {it.destinos && (
              <p className="mt-auto flex flex-wrap gap-2 pt-4 text-small print:hidden">
                {it.destinos.map((d) => (
                  <button key={d.rotulo} type="button" onClick={() => onIr(d)} className="min-h-10 rounded-brand bg-surface px-3 py-1.5 text-left font-semibold text-navy hover:underline">
                    Ver {d.rotulo} →
                  </button>
                ))}
              </p>
            )}
          </li>
        ))}
      </ol>

      <p className={`mt-4 ${NOTA_DISCRETA} print:mt-2`}>
        Dados coletados em 19/11/2026. Arrecadação e despesa empenhada até outubro de 2026. Valores arredondados.
      </p>
    </div>
  )
}
