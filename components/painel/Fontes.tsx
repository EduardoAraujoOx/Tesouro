'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { Nota } from './Estrutura'
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
        <p className="max-w-3xl text-small text-ink-soft">As três fontes somam {numero(soma * 100, 0)}% da receita bruta de 2025. Cada célula: crescimento da arrecadação do mês sobre o mesmo mês de 2025.</p>
        <Nota titulo="Como ler"><p>A leitura mês a mês separa tendência de sazonalidade e deixa ver se o crescimento está acelerando ou perdendo fôlego. Azul: acima do mesmo mês de 2025; rosa: abaixo (intensidade até ±30%). O petróleo chega em parcelas trimestrais (fevereiro, maio, agosto e novembro concentram a participação especial), por isso oscila muito. Fonte: Portal de Dados Abertos do ES; ICMS e FPE conferem com o RREO (Anexo 03).</p></Nota>
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
        </div>
      </Cartao>

      <Cartao titulo="Fechamento de 2026 por fonte">
        <p className="max-w-3xl text-small text-ink-soft">Pelo método de menor erro no teste retroativo (ICMS: ritmo dos 3 últimos meses; FPE: dos 12 últimos); a faixa vai do menor ao maior resultado entre os métodos.</p>
        <Nota titulo="Método e faixa">
          <p>Para cada fonte, a projeção usa o método que menos errou quando aplicado aos anos passados (ver o teste em Método e fontes): ICMS pelo ritmo dos três últimos meses, FPE pelo ritmo dos doze últimos. A faixa vai do menor ao maior resultado entre os métodos. No petróleo não há história mensal longa para testar; o ritmo recente é a melhor referência, e a faixa é só indicativa.</p>
        </Nota>
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
          <Nota titulo="Como ler">          <p>
            O resultado indica que a PLOA supõe petróleo em {bilhoes(impl.implicito)}, {fmtPct((impl.implicito / impl.petroleo26 - 1) * 100)} sobre o fechamento projetado de 2026 e {fmtPct((impl.implicito / impl.petroleo25 - 1) * 100)} sobre 2025. É uma dedução, não um número publicado: a PLOA não detalha a linha. Para comparar com a leitura pela sazonalidade do grupo, a projeção top-down das transferências da União é {bilhoes(topDownUniao)} em 2026, contra {bilhoes(impl.fpe27 / (1 + g27) + impl.outras26 + impl.petroleo26)} somando as três partes pelo ritmo recente.
          </p></Nota>
        </div>
      </Cartao>

      <Cartao titulo="Petróleo: as premissas da própria LDO 2027">
        <p className="max-w-3xl text-small text-ink-soft">Cenário base da LDO para 2027: Brent a US$ 60, câmbio de R$ 5,40 e 224,5 mil barris por dia, o que dá R$ 1,24 bi, cerca de 60% abaixo do ritmo de 2026 ({bilhoes(impl.petroleo26)}).</p>
        <Nota titulo="Comparação com 2026 e limites da leitura">
          <p>
            O Anexo de Riscos Fiscais da LDO 2027 (Lei nº 12.967/2026, p. 52, fonte Nupetro/Subser/Sefaz) traz o cenário base do Estado para as receitas de petróleo e gás em 2027: produção de 224,5 mil barris por dia, Brent a US$ 60 e câmbio de R$ 5,40, o que dá R$ 1.240,8 milhões (royalties R$ 693,8 mi, participação especial R$ 527,2 mi e Fundo do Petróleo R$ 19,8 mi). A dedução feita acima a partir da PLOA (cerca de {bilhoes(impl.implicito)}) é da mesma ordem de grandeza dessa base, o que sugere que a proposta usa o cenário de Brent a US$ 60 para 2027; a PLOA não detalha a linha, então isso continua sendo indício.
          </p>
          <p>
            Compare com 2026: a compensação pela produção de petróleo (R$ {numero(impl.petroleo25 / 1e9, 2)} bi em 2025) caminha para cerca de {bilhoes(impl.petroleo26)} em 2026. O cenário de 2027 supõe, portanto, uma queda de cerca de 60% sobre o ritmo atual. Se a diferença vier de preço e câmbio, ela é um risco conhecido, e a LDO a reconhece no sentido contrário (frustração de R$ 623,4 mi: Brent a US$ 54, câmbio a R$ 5,20 e produção de 162,3 mil barris). Para saber se a base de 2027 é prudente ou apenas baixa, falta comparar com o Brent, o câmbio e a produção realizados em 2026, que ainda não estão no painel.
          </p>
        </Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={[
            { chave: 'base', rotulo: 'Cenário base 2027', prod: '224,5', brent: '60,0', cambio: '5,40', roy: 693.8, pe: 527.2, fundo: 19.8, total: 1240.8 },
            { chave: 'frust', rotulo: 'Cenário de frustração (risco fiscal)', prod: '162,3', brent: '54,0', cambio: '5,20', roy: 433.9, pe: 166.1, fundo: 17.4, total: 617.4 },
            { chave: 'red', rotulo: 'Redistribuição dos royalties (Lei 12.734/2012, ADI): perda', prod: '–', brent: '–', cambio: '–', roy: -154.8, pe: -263.6, fundo: -19.8, total: -438.1 },
          ]} legenda="Premissas e valores de petróleo e gás na LDO 2027, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.chave === 'base' ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'Produção (mil bbl/d)', valor: (x) => x.prod },
            { rotulo: 'Brent (US$)', valor: (x) => x.brent },
            { rotulo: 'Câmbio (R$/US$)', valor: (x) => x.cambio },
            { rotulo: 'Royalties', valor: (x) => (x.roy < 0 ? `−${numero(-x.roy, 1)}` : numero(x.roy, 1)) },
            { rotulo: 'Particip. especial', valor: (x) => (x.pe < 0 ? `−${numero(-x.pe, 1)}` : numero(x.pe, 1)) },
            { rotulo: 'Fundo do Petróleo', valor: (x) => (x.fundo < 0 ? `−${numero(-x.fundo, 1)}` : numero(x.fundo, 1)) },
            { rotulo: 'Total', valor: (x) => <span className="font-semibold">{x.total < 0 ? `−${numero(-x.total, 1)}` : numero(x.total, 1)}</span> },
          ]} />
          <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">Valores transcritos da LDO 2027 (texto guardado em painel-es/fontes/ldo). A frustração de R$ 623,4 mi do quadro de riscos fiscais é a diferença entre o cenário base e o de frustração (1.240,8 − 617,4). Câmbio: Relatório Focus de 06/02/2026. Os valores de Brent seguem estudos de agências de energia, fundos e contratos futuros, segundo a LDO.</p>
        </div>
      </Cartao>
    </div>
  )
}
