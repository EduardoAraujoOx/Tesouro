'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { fmtPct } from './GraficosMacro'
import { analisaFontes, implicitoPetroleo, mesesCorte, projecaoItens, type AnaliseFonte, type DadosReceita } from './projecao'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mi = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : milhoes(x === 0 ? 0 : x, 0))
const dMi = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${milhoes(Math.abs(x), 0)}`

/** Cor de fundo de uma variação: azul para aumento, rosa para queda, com intensidade até ±30%. */
function fundo(v: number | null): string | undefined {
  if (v === null) return undefined
  const a = Math.min(Math.abs(v) / 30, 1) * 0.28
  return v >= 0 ? `rgb(var(--serie3) / ${a.toFixed(2)})` : `rgb(var(--serie2) / ${a.toFixed(2)})`
}

/**
 * Os três maiores motores da receita bruta: ICMS, cota-parte do FPE e compensação pela produção de petróleo.
 * Mostra o ritmo mês a mês contra o mesmo mês do ano anterior (para ver aceleração ou desaceleração), o fechamento de 2026 por fonte
 * e o que a PLOA precisa supor para 2027.
 */
export function PrincipaisFontes({ dados, receita, ipca, pib }: { dados: DadosReceita; receita: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number> }) {
  const analise = useMemo(() => analisaFontes(dados), [dados])
  const { ultimo } = useMemo(() => mesesCorte(dados), [dados])
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const icms = analise.find((a) => a.id === 'icms')!
  const soma = analise.reduce((s, a) => s + a.participacao, 0)
  const g27 = (1 + ipca['2027']) * (1 + pib['2027']) - 1
  const impl = useMemo(() => implicitoPetroleo(dados, analise, R.transf_corr_uniao[5], g27), [dados, analise, R, g27])
  const topDownUniao = useMemo(() => projecaoItens(dados).tuniao.central, [dados])
  const nomeCorte = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][ultimo - 1]

  const cenariosIcms = [
    { chave: 'ploa', rotulo: 'PLOA 2027 (o que a proposta supõe)', g: R.icms[5] / icms.central - 1 },
    { chave: 'g3m', rotulo: 'Ritmo dos três últimos meses mantido', g: icms.g3m ?? 0 },
    { chave: 'focus', rotulo: 'Inflação + PIB (Focus): economia crescendo como esperado', g: g27 },
    { chave: 'ano', rotulo: 'Ritmo do acumulado do ano mantido', g: icms.gAno ?? 0 },
  ].map((c) => ({ ...c, valor: icms.central * (1 + c.g) }))

  const linhaFonte = (a: AnaliseFonte) => ({ ...a, chave: a.id })
  return (
    <div className="space-y-3">
      <Cartao titulo="ICMS, FPE e petróleo: o ritmo de 2026 mês a mês">
        <p className="max-w-3xl text-small text-ink-soft">
          As três fontes somam {numero(soma * 100, 0)}% da receita bruta de 2025. Cada célula mostra o quanto a arrecadação do mês cresceu sobre o mesmo mês de 2025: a leitura mês a mês separa tendência de sazonalidade e deixa ver se o crescimento está acelerando ou perdendo fôlego.
        </p>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={analise.map(linhaFonte)} legenda="Crescimento da arrecadação de cada mês sobre o mesmo mês de 2025, em %" colunas={[
            { rotulo: 'Fonte', valor: (a) => <span className="font-semibold">{a.rotulo}</span> },
            ...MESES.slice(0, ultimo).map((m, i) => ({
              rotulo: m,
              secundaria: i < ultimo - 3,
              valor: (a: AnaliseFonte) => <span className="block rounded px-1 py-0.5 text-center tabular-nums" style={{ background: fundo(a.yoy[i]) }}>{a.yoy[i] === null ? '–' : `${a.yoy[i]! > 0 ? '+' : a.yoy[i]! < 0 ? '−' : ''}${numero(Math.abs(a.yoy[i]!), 0)}%`}</span>,
            })),
            { rotulo: '3 últ. meses', valor: (a) => <span className="font-semibold">{fmtPct(a.g3m === undefined ? undefined : a.g3m * 100)}</span> },
            { rotulo: `Jan–${MESES[ultimo - 1]}`, valor: (a) => <span className="font-semibold">{fmtPct(a.gAno === undefined ? undefined : a.gAno * 100)}</span> },
          ]} />
          <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
            Azul: acima do mesmo mês de 2025; rosa: abaixo (intensidade até ±30%). O petróleo chega em parcelas trimestrais (fevereiro, maio, agosto e novembro concentram a participação especial), por isso oscila muito. Fonte: Portal de Dados Abertos do ES; ICMS e FPE conferem com o RREO (Anexo 03).
          </p>
        </div>
      </Cartao>

      <Cartao titulo="Fechamento de 2026 por fonte">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>Para cada fonte, a projeção usa o método que menos errou quando aplicado aos anos passados (ver o teste em Método e fontes): ICMS pelo ritmo dos três últimos meses, FPE pelo ritmo dos doze últimos. A faixa vai do menor ao maior resultado entre os métodos. No petróleo não há história mensal longa para testar; o ritmo recente é a melhor referência, e a faixa é só indicativa.</p>
        </div>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={analise.map(linhaFonte)} legenda="Fechamento de 2026 por fonte, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (a) => <><span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[3.5rem] md:text-small">{a.cod}</span><span className="font-semibold">{a.rotulo}</span></> },
            { rotulo: '% da receita bruta 25', valor: (a) => `${numero(a.participacao * 100, 1)}%`, secundaria: true },
            { rotulo: 'Realizado 2025', valor: (a) => mi(a.fechou2025), secundaria: true },
            { rotulo: `Jan–${MESES[ultimo - 1]} 26`, valor: (a) => mi(a.acum26), secundaria: true },
            { rotulo: 'Método', valor: (a) => <span className="text-ink-soft">{({ sazonal: 'sazonal', ritmo3m: 'ritmo 3 meses', ritmoAno: 'ritmo do ano', ritmo12m: 'ritmo 12 meses' } as const)[a.escolhido]}</span>, secundaria: true },
            { rotulo: 'Fechamento 2026', valor: (a) => <span className="font-semibold">{mi(a.central)}</span> },
            { rotulo: 'Δ% sobre 2025', valor: (a) => fmtPct((a.central / a.fechou2025 - 1) * 100) },
            { rotulo: 'Faixa', valor: (a) => `${mi(a.min)} a ${mi(a.max)}`, secundaria: true },
          ]} />
        </div>
      </Cartao>

      <Cartao titulo="ICMS em 2027: o que a PLOA supõe">
        <p className="max-w-3xl text-small text-ink-soft">A PLOA prevê ICMS de {bilhoes(R.icms[5])} em 2027. Sobre o fechamento projetado de 2026 ({bilhoes(icms.central)}), isso é um crescimento nominal de {fmtPct((R.icms[5] / icms.central - 1) * 100)}. A tabela compara com o que cada hipótese de crescimento daria.</p>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={cenariosIcms} legenda="ICMS de 2027 sob hipóteses de crescimento, em R$ milhões" colunas={[
            { rotulo: 'Hipótese', valor: (c) => <span className={c.chave === 'ploa' ? 'font-semibold' : ''}>{c.rotulo}</span> },
            { rotulo: 'Crescimento 2027', valor: (c) => fmtPct(c.g * 100) },
            { rotulo: 'ICMS 2027', valor: (c) => <span className={c.chave === 'ploa' ? 'font-semibold' : ''}>{mi(c.valor)}</span> },
            { rotulo: 'PLOA menos hipótese', valor: (c) => (c.chave === 'ploa' ? '–' : dMi(R.icms[5] - c.valor)) },
          ]} />
          <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">Crescimento da hipótese aplicado ao fechamento projetado de 2026. Inflação e PIB do Focus: IPCA {numero(ipca['2027'] * 100, 2)}% e PIB {numero(pib['2027'] * 100, 2)}%. Valores brutos, antes das deduções (municípios e Fundeb).</p>
        </div>
      </Cartao>

      <Cartao titulo="Transferências da União: o que a PLOA precisa supor para o petróleo">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>A PLOA traz as transferências da União numa linha só ({bilhoes(R.transf_corr_uniao[5])} em 2027). Tirando dela o FPE e as demais transferências crescendo como a economia esperada pelo Focus, sobra o que a proposta precisa supor para o petróleo.</p>
        </div>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={[
            { chave: 'a', rotulo: 'Transferências da União na PLOA 2027', v: R.transf_corr_uniao[5], forte: true },
            { chave: 'b', rotulo: '(−) FPE 2027: fechamento de 2026 projetado, mais o crescimento do Focus', v: -impl.fpe27, forte: false },
            { chave: 'c', rotulo: '(−) Demais transferências da União 2027: idem', v: -impl.outras27, forte: false },
            { chave: 'd', rotulo: '= Petróleo que a PLOA precisa supor para 2027', v: impl.implicito, forte: true },
            { chave: 'e', rotulo: 'Para comparar: petróleo realizado em 2025', v: impl.petroleo25, forte: false },
            { chave: 'f', rotulo: 'Para comparar: petróleo projetado para 2026', v: impl.petroleo26, forte: false },
          ]} legenda="Petróleo implícito na PLOA 2027, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.forte ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'Valor', valor: (x) => <span className={x.forte ? 'font-semibold' : ''}>{x.v < 0 ? `−${mi(-x.v)}` : mi(x.v)}</span> },
          ]} />
          <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
            O resultado indica que a PLOA supõe petróleo em {bilhoes(impl.implicito)}, {fmtPct((impl.implicito / impl.petroleo26 - 1) * 100)} sobre o fechamento projetado de 2026 e {fmtPct((impl.implicito / impl.petroleo25 - 1) * 100)} sobre 2025. É uma dedução, não um número publicado: a PLOA não detalha a linha. Para comparar com a leitura pela sazonalidade do grupo, a projeção top-down das transferências da União é {bilhoes(topDownUniao)} em 2026, contra {bilhoes(impl.fpe27 / (1 + g27) + impl.outras26 + impl.petroleo26)} somando as três partes pelo ritmo recente.
          </p>
        </div>
      </Cartao>
    </div>
  )
}
