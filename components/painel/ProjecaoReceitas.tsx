'use client'

import { milhoes, numero } from '@/lib/formato'
import type { ProjecaoReceitas as Dados, LinhaProjecao } from '@/lib/projecao-receitas'
import { Cartao, TabelaItens } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'
import { Lista } from './Emendas'

const mi = (x: number) => milhoes(x, 0)
const bi = (x: number) => numero(x / 1e9, 2)
const dif = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${milhoes(Math.abs(x), 0)}`

/**
 * Subitem de Receita: as três maiores fontes (ICMS, FPE e petróleo) na PLOA 2027 e na estimativa da equipe, com o método numa nota recolhida.
 * A diferença é a estimativa menos a PLOA: positiva quando a PLOA está abaixo do que a equipe considera mais provável.
 */
export function ProjecaoReceitas({ dados }: { dados: Dados }) {
  const { linhas, g27, ipca27, pib27, brent, cambio, producao, edicaoEia, ldo, ajusteIcmsPetroleo } = dados
  const d = (l: LinhaProjecao) => (l.ploa === null ? null : l.estimativa - l.ploa)
  const p = (l: LinhaProjecao) => (l.ploa === null || !l.ploa ? null : (l.estimativa / l.ploa - 1) * 100)
  const nome = (l: LinhaProjecao) => <span className={l.sub ? 'pl-3 text-ink-soft' : l.chave === 'total' ? 'font-semibold' : ''}>{l.sub ? '↳ ' : ''}{l.rotulo}</span>
  const col = [
    { rotulo: 'R$ milhões', valor: (l: LinhaProjecao) => nome(l) },
    { rotulo: 'PLOA 2027', valor: (l: LinhaProjecao) => (l.ploa === null ? '' : mi(l.ploa)) },
    { rotulo: 'Estimativa', valor: (l: LinhaProjecao) => <span className="font-semibold">{mi(l.estimativa)}</span> },
    { rotulo: 'Diferença', valor: (l: LinhaProjecao) => (d(l) === null ? '' : dif(d(l)!)) },
    { rotulo: '%', secundaria: true, valor: (l: LinhaProjecao) => (p(l) === null ? '' : fmtPct(p(l)!)) },
  ]
  const itens = linhas.map((l) => ({ chave: l.chave, rotulo: nome(l), campos: [
    { r: 'PLOA 2027', v: l.ploa === null ? '' : mi(l.ploa) }, { r: 'Estimativa', v: <span className="font-semibold">{mi(l.estimativa)}</span> },
    { r: 'Diferença', v: d(l) === null ? '' : `${dif(d(l)!)} (${fmtPct(p(l)!)})` },
  ] }))
  return (
    <div className="space-y-3">
      <Cartao titulo="Maiores fontes: PLOA 2027 e estimativa da equipe">
        <div className="hidden md:block print:block">
          <TabelaItens compacta altura="livre" itens={linhas} colunas={col} legenda="ICMS, FPE e petróleo em 2027: PLOA, estimativa da equipe e diferença, em R$ milhões" />
        </div>
        <Lista itens={itens} legenda="ICMS, FPE e petróleo em 2027: PLOA, estimativa da equipe e diferença, em R$ milhões" />
        <p className={`mt-2 ${NOTA_DISCRETA}`}>Diferença: estimativa menos PLOA. Petróleo: a PLOA não informa o valor; é o que resta das transferências da União depois do FPE e das demais transferências.</p>
        <Nota titulo="Como foi estimado" larga>
          <div className="space-y-2">
            <p>
              ICMS e FPE: o fechamento de 2026 é projetado pelo acumulado até outubro e pela participação que esse período teve no ano de 2022 a 2025, e é atualizado pelo crescimento nominal da atividade em 2027, de {fmtPct(g27 * 100, 1).replace('+', '')} (IPCA de {numero(ipca27 * 100, 1)}% e PIB de {numero(pib27 * 100, 1)}%, Focus). A estimativa de ICMS não desconta a queda esperada do ICMS do petróleo com o Brent menor em 2027; se descontada, ficaria R$ {mi(ajusteIcmsPetroleo)} milhões abaixo.
            </p>
            <p>
              Petróleo: modelo estimado sobre a série mensal de 2019 a 2026, que relaciona royalties e participação especial ao Brent, ao câmbio e à produção. Parâmetros de 2027: Brent médio de US$ {brent} (EIA, edição de {edicaoEia}), câmbio de R$ {numero(cambio, 2)} (Focus) e produção de {producao} mil barris por dia (média de 2026). No cenário da LDO (Brent a US$ {ldo.brent}, câmbio de R$ {numero(ldo.cambio, 2)} e {numero(ldo.producao, 1)} mil barris por dia), a LDO prevê R$ {bi(ldo.previsto)} bilhões e o mesmo modelo dá R$ {bi(ldo.modelo)} bilhões. É a fonte mais volátil e a de maior incerteza: a estimativa depende do preço do petróleo, que o Estado não controla.
            </p>
          </div>
        </Nota>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026, Quadro VI e Evolução da Receita); Portal de Dados Abertos do ES; SEFAZ-ES; ANP; EIA (STEO); Focus (BCB); LDO 2027 (Anexo de Riscos Fiscais).</p>
    </div>
  )
}
