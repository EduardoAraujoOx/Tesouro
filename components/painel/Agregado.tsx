'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR, TabelaItens } from './Graficos'
import { ColunasAnuais, fmtPct, variacoes, type ColunaAnual } from './GraficosMacro'
import { Faixa } from './Faixa'
import { COD_DESPESA, COD_GRUPO } from './codigos'
import { analisaFontes, fatorPrecos, implicitoPetroleo, ipcaAnual, projecaoItens, projetaDespesa2026, projetaReceita2026, type DadosReceita, type ItemProjetado } from './projecao'

type Vista = 'receita' | 'despesa' | 'resultado'
const VISTAS: { id: Vista; rotulo: string }[] = [
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa' },
  { id: 'resultado', rotulo: 'Resultado' },
]
const ANOS = ['2023', '2024', '2025', 'Prov. 26', '2027'] as const
/** posição de cada coluna acima nos seis valores dos quadros da PLOA: 2023, 2024, 2025, orçamento 2026, provável 2026, 2027 */
const COL = [0, 1, 2, 4, 5]

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const neg = (x: number) => (x === 0 ? 0 : -x)
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x), 0)}`
/** crescimento médio anual composto entre duas colunas distantes `n` anos */
const aa = (de: number, para: number, n: number) => (de > 0 && para > 0 ? (Math.pow(para / de, 1 / n) - 1) * 100 : undefined)

type Linha = { chave: string; rotulo: string; nivel: number; negrito?: boolean; v: number[]; proj?: ItemProjetado }
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function VisaoGeral({ receita, despesa, ipca: ipcaParams, pib, fonteIpca, dados, irParaMetodo }: {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; fonteIpca: string; dados: DadosReceita; irParaMetodo: () => void
}) {
  const [vista, setVista] = useState<Vista>('receita')
  const [base, setBase] = useState<'nominal' | 'real'>('nominal')
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const ipca = useMemo(() => ipcaAnual(Object.fromEntries(Object.entries(ipcaParams).map(([a, v]) => [a, v]))), [ipcaParams])
  const i27 = ipca[2027]
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const itensProj = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])
  const pick = (m: Record<string, number[]>, ...ch: string[]) => COL.map((c) => ch.reduce((s, k) => s + m[k][c], 0))
  const soma = (...a: number[][]) => COL.map((_, j) => a.reduce((s, x) => s + x[j], 0))

  /* receita corrente líquida aproximada (correntes + intra − deduções), base dos indicadores */
  const rcl = soma(pick(R, 'receitas_correntes'), pick(R, 'intra'), pick(R, 'deducoes'))

  /* ---------- quadro de grandes grupos ---------- */
  const linhasReceita: Linha[] = [
    { chave: 'imp', rotulo: 'Impostos', nivel: 0, v: pick(R, 'impostos') },
    { chave: 'icms', rotulo: 'ICMS', nivel: 1, v: pick(R, 'icms') },
    { chave: 'ipva', rotulo: 'IPVA', nivel: 1, v: pick(R, 'ipva') },
    { chave: 'irrf', rotulo: 'IRRF', nivel: 1, v: pick(R, 'irrf') },
    { chave: 'itcd', rotulo: 'ITCD', nivel: 1, v: pick(R, 'itcd') },
    { chave: 'taxas', rotulo: 'Taxas', nivel: 0, v: pick(R, 'taxas', 'contrib_melhoria') },
    { chave: 'contrib', rotulo: 'Contribuições', nivel: 0, v: pick(R, 'contribuicoes') },
    { chave: 'patrim', rotulo: 'Receita patrimonial', nivel: 0, v: pick(R, 'patrimonial') },
    { chave: 'transf', rotulo: 'Transferências correntes', nivel: 0, v: pick(R, 'transf_correntes') },
    { chave: 'tuniao', rotulo: 'da União', nivel: 1, v: pick(R, 'transf_corr_uniao') },
    { chave: 'toutras', rotulo: 'de outras origens', nivel: 1, v: pick(R, 'transf_corr_outras') },
    { chave: 'demais', rotulo: 'Demais receitas correntes', nivel: 0, v: pick(R, 'agropecuaria', 'industrial', 'servicos', 'outras_correntes') },
    { chave: 'intra', rotulo: 'Correntes intraorçamentárias', nivel: 0, v: pick(R, 'intra') },
    { chave: 'cap', rotulo: 'Receitas de capital', nivel: 0, v: pick(R, 'receitas_capital') },
    { chave: 'cred', rotulo: 'Operações de crédito', nivel: 1, v: pick(R, 'operacoes_credito') },
    { chave: 'capout', rotulo: 'Demais de capital', nivel: 1, v: pick(R, 'alienacao', 'amortizacao_emprestimos', 'transf_capital', 'outras_capital') },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', nivel: 0, v: pick(R, 'deducoes') },
    { chave: 'liq', rotulo: '= Receita líquida', nivel: 0, negrito: true, v: pick(R, 'total') },
  ]
  const linhasDespesa: Linha[] = [
    { chave: 'pessoal', rotulo: 'Pessoal e encargos sociais', nivel: 0, v: pick(D, 'pessoal') },
    { chave: 'juros', rotulo: 'Juros e encargos da dívida', nivel: 0, v: pick(D, 'juros') },
    { chave: 'outras', rotulo: 'Outras despesas correntes', nivel: 0, v: pick(D, 'outras_correntes') },
    { chave: 'corr', rotulo: '= Despesas correntes', nivel: 0, negrito: true, v: pick(D, 'despesas_correntes') },
    { chave: 'inv', rotulo: 'Investimentos', nivel: 0, v: pick(D, 'investimento') },
    { chave: 'invf', rotulo: 'Inversões financeiras', nivel: 0, v: pick(D, 'inversoes') },
    { chave: 'amort', rotulo: 'Amortização da dívida', nivel: 0, v: pick(D, 'amortizacao') },
    { chave: 'capd', rotulo: '= Despesas de capital', nivel: 0, negrito: true, v: pick(D, 'despesas_capital') },
    { chave: 'res', rotulo: 'Reservas (RPPS e contingência)', nivel: 0, v: pick(D, 'reserva_rpps', 'reserva_contingencia') },
    { chave: 'tot', rotulo: '= Despesa total', nivel: 0, negrito: true, v: pick(D, 'total') },
  ]
  const lista = vista === 'receita' ? linhasReceita.map((l) => ({ ...l, proj: itensProj[l.chave] })) : linhasDespesa.map((l) => ({ ...l, proj: projD.itens[l.chave] }))
  const total = lista[lista.length - 1]
  const comProj = true
  /* base de 2026 para medir o quanto 2027 se afasta: no ritmo (projeção) quando há, no provável da PLOA nos demais casos */
  const base26 = (l: Linha) => (comProj && l.proj ? l.proj.central : l.v[3])
  const dTotal = variacoes(base26(total), total.v[4], i27).nominal as number
  /* o que destoa: variação 2027 sobre o provável de 2026 ao menos 5 pontos percentuais distante da do total, em item de pelo menos R$ 100 milhões de variação */
  const destoa = (l: Linha) => {
    if (l === total || l.negrito) return 0
    const d = variacoes(base26(l), l.v[4], i27).nominal
    const valor = Math.abs(l.v[4] - base26(l))
    if (d === undefined || d === null || valor < 1e8) return 0
    return d - dTotal >= 5 ? 1 : dTotal - d >= 5 ? -1 : 0
  }

  /* ---------- em resumo: onde a proposta de 2027 se afasta do ritmo de 2026 ---------- */
  const analiseFontes = useMemo(() => analisaFontes(dados), [dados])
  const g27 = (1 + ipca[2027]) * (1 + (pib['2027'] ?? 0)) - 1
  const petr = useMemo(() => implicitoPetroleo(dados, analiseFontes, R.transf_corr_uniao[5], g27), [dados, analiseFontes, R, g27])
  const reservas27 = D.reserva_rpps[5] + D.reserva_contingencia[5]
  const leitura = (d: number, tipo: 'receita' | 'despesa') =>
    Math.abs(d) < 3 ? 'em linha com o ritmo' : d > 0 ? (tipo === 'receita' ? 'acima do ritmo: pede mais do que o realizado' : 'acima do ritmo de execução') : (tipo === 'receita' ? 'abaixo do ritmo: conservadora' : 'abaixo do ritmo: aperto')
  const resumo = [
    { chave: 'rec', rotulo: 'Receita líquida total', tipo: 'receita' as const, p: R.total[5], a: proj.central },
    { chave: 'icms', rotulo: 'ICMS', tipo: 'receita' as const, p: R.icms[5], a: itensProj.icms.central },
    { chave: 'pet', rotulo: 'Petróleo (implícito na PLOA, dedução)', tipo: 'receita' as const, p: petr.implicito, a: petr.petroleo26 },
    { chave: 'des', rotulo: 'Despesa executável (sem reservas)', tipo: 'despesa' as const, p: D.total[5] - reservas27, a: projD.itens.tot.central },
    { chave: 'pes', rotulo: 'Pessoal e encargos', tipo: 'despesa' as const, p: D.pessoal[5], a: projD.itens.pessoal.central },
    { chave: 'out', rotulo: 'Outras despesas correntes', tipo: 'despesa' as const, p: D.outras_correntes[5], a: projD.itens.outras.central },
  ].map((l) => ({ ...l, d: (l.p / l.a - 1) * 100 }))

  /* ---------- gráfico anual ---------- */
  const serieTotal = vista === 'despesa' ? D.total : R.total
  const anosNum = [2023, 2024, 2025, 2026, 2027]
  const colunasBrutas: ColunaAnual[] = [
    { rotulo: '2023', v: serieTotal[0], tipo: 'real' },
    { rotulo: '2024', v: serieTotal[1], tipo: 'real' },
    { rotulo: '2025', v: serieTotal[2], tipo: 'real' },
    vista === 'despesa'
      ? { rotulo: '2026 projeção', v: projD.itens.tot.central, tipo: 'estim', faixa: [projD.itens.tot.min as number, projD.itens.tot.max as number], marca: { v: D.total[4], rotulo: 'Provável 2026 na PLOA' } }
      : { rotulo: '2026 projeção', v: proj.central, tipo: 'estim', faixa: [proj.min, proj.max], marca: { v: R.total[4], rotulo: 'Provável 2026 na PLOA' } },
    { rotulo: '2027 PLOA', v: serieTotal[5], tipo: 'ploa' },
  ]
  const colunas = colunasBrutas.map((c, k) => {
    if (base === 'nominal') return c
    const f = fatorPrecos(ipca, anosNum[k], 2027)
    return { ...c, v: c.v * f, faixa: c.faixa && ([c.faixa[0] * f, c.faixa[1] * f] as [number, number]), marca: c.marca && { ...c.marca, v: c.marca.v * f } }
  })
  const proj26 = colunasBrutas[3].v
  const nomeCorteDesp = MESES_NOME[projD.bimestre * 2 - 1]
  const nomeCorte = MESES_NOME[proj.meses - 1]

  /* ---------- faixa de números ---------- */
  const v27 = serieTotal[5]
  const sobreProj = variacoes(proj26, v27, i27)
  const ritmo1 = aa(serieTotal[0], serieTotal[2], 2)
  const ritmo2 = aa(serieTotal[2], v27, 2)
  const pessoalRcl = pick(D, 'pessoal').map((x, j) => (x / rcl[j]) * 100)
  const correntesRcl = pick(D, 'despesas_correntes').map((x, j) => (x / rcl[j]) * 100)
  const supCorrente = rcl.map((x, j) => x - pick(D, 'despesas_correntes')[j])
  const resultadoOrc = COL.map((_, j) => R.total[COL[j]] - D.total[COL[j]])
  const reservas = pick(D, 'reserva_rpps', 'reserva_contingencia')

  let faixa: { r: string; v: string; s?: string; destaque?: boolean }[]
  if (vista === 'receita') {
    faixa = [
      { r: 'Projeção de fechamento de 2026', v: bilhoes(proj.central), s: `faixa ${numero(proj.min / 1e9, 1)} a ${numero(proj.max / 1e9, 1)} bi; a PLOA estima ${bilhoes(R.total[4])}`, destaque: true },
      { r: 'PLOA 2027 sobre a projeção de 2026', v: fmtPct(sobreProj.nominal), s: `real ${fmtPct(sobreProj.real)}; receita de ${bilhoes(v27)}` },
      { r: `Arrecadado de janeiro a ${nomeCorte} de 2026`, v: bilhoes(proj.acumulado), s: `${fmtPct((proj.acumulado / proj.acumulado25 - 1) * 100)} sobre o mesmo período de 2025` },
      { r: 'Ritmo de crescimento ao ano', v: `${fmtPct(ritmo2)}`, s: `2025 a 2027; de 2023 a 2025 foi ${fmtPct(ritmo1)}` },
    ]
  } else if (vista === 'despesa') {
    faixa = [
      { r: 'Projeção de fechamento de 2026', v: bilhoes(proj26), s: `faixa ${numero((projD.itens.tot.min as number) / 1e9, 1)} a ${numero((projD.itens.tot.max as number) / 1e9, 1)} bi; a PLOA estima ${bilhoes(serieTotal[4])}`, destaque: true },
      { r: 'PLOA 2027 sobre a projeção de 2026', v: fmtPct(sobreProj.nominal), s: `real ${fmtPct(sobreProj.real)}; despesa de ${bilhoes(v27)}` },
      { r: 'Despesa executável 2027 (sem reservas)', v: bilhoes(v27 - reservas[4]), s: `${fmtPct(((v27 - reservas[4]) / proj26 - 1) * 100)} sobre a projeção de 2026; reservas de ${bilhoes(reservas[4])}` },
      { r: 'Pessoal sobre a receita corrente líquida', v: `${numero(pessoalRcl[4], 1)}%`, s: `2025: ${numero(pessoalRcl[2], 1)}%; indicador aproximado` },
    ]
  } else {
    faixa = [
      { r: 'Superávit corrente 2027', v: bilhoes(supCorrente[4]), s: `provável 2026: ${bilhoes(supCorrente[3])}`, destaque: true },
      { r: 'Despesa corrente sobre a receita corrente líquida', v: `${numero(correntesRcl[4], 1)}%`, s: `2025: ${numero(correntesRcl[2], 1)}%` },
      { r: 'Reservas na proposta', v: bilhoes(reservas[4]), s: `${numero((reservas[4] / D.total[5]) * 100, 1)}% da despesa` },
      { r: 'Resultado orçamentário 2027', v: Math.abs(resultadoOrc[4]) < 1e6 ? 'equilíbrio' : bilhoes(resultadoOrc[4]), s: 'receita total menos despesa total' },
    ]
  }

  /* ---------- tabelas ---------- */
  const codigoDe = (l: Linha) => (vista === 'receita' ? COD_GRUPO[l.chave] : vista === 'despesa' ? COD_DESPESA[l.chave] : '') ?? ''
  /* só os grupos principais levam o código na vista; os itens abaixo aparecem recuados, com um filete à esquerda, e o código fica no texto para leitores de tela e na dica */
  const celulaLinha = (l: Linha): ReactNode => {
    const c = codigoDe(l)
    if (l.nivel === 0) {
      return (
        <span className={l.negrito ? 'font-semibold' : ''}>
          {c && <span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[6.5rem] md:text-small">{c}</span>}{l.rotulo}
        </span>
      )
    }
    return (
      <span title={c ? `Código ${c}` : undefined} className="ml-1 block border-l-2 border-line pl-2.5 text-ink-soft" style={{ marginLeft: `${0.25 + (l.nivel - 1) * 0.9}rem` }}>
        {c && <span className="sr-only">{c} </span>}{l.rotulo}
      </span>
    )
  }
  const itensTabela = lista.map((l) => ({ ...l, chave: l.chave }))
  const colunasTabela = [
    { rotulo: vista === 'receita' ? 'R$ milhões · natureza' : 'R$ milhões · GND', valor: celulaLinha },
    { rotulo: 'Destaque', valor: (l: Linha) => { const d = destoa(l); return d === 0 ? '' : <span title={d > 0 ? 'Cresce bem mais que o total' : 'Cresce bem menos que o total'} className={d > 0 ? 'text-serie3' : 'text-serie2'}>{d > 0 ? '▲' : '▼'}<span className="sr-only">{d > 0 ? ' cresce bem mais que o total' : ' cresce bem menos que o total'}</span></span> } },
    ...ANOS.flatMap((a, j) => {
      const col = { rotulo: a, valor: (l: Linha) => <span className={l.negrito || j === 4 ? 'font-semibold' : ''}>{mi(l.v[j])}</span> }
      return j === 3 && comProj
        ? [col, { rotulo: `Proj. 26`, valor: (l: Linha) => (l.proj ? <span title={l.proj.base === 'resíduo' ? 'Resultado: receita líquida projetada menos a soma das linhas' : l.proj.base === '2025' ? 'Sazonalidade só de 2025' : undefined}>{mi(l.proj.central)}{l.proj.base === '2025' ? '*' : ''}</span> : '–') }]
        : [col]
    }),
    { rotulo: comProj ? 'Δ% 27/proj.' : 'Δ% 27/26', valor: (l: Linha) => fmtPct(variacoes(base26(l), l.v[4], i27).nominal) },
    { rotulo: 'Real', valor: (l: Linha) => fmtPct(variacoes(base26(l), l.v[4], i27).real) },
    { rotulo: 'a.a. 23–25', valor: (l: Linha) => fmtPct(aa(l.v[0], l.v[2], 2)) },
    { rotulo: 'a.a. 25–27', valor: (l: Linha) => fmtPct(aa(l.v[2], l.v[4], 2)) },
  ]

  const indicadores = [
    { chave: 'pessoal', rotulo: 'Pessoal e encargos ÷ receita corrente líquida', v: pessoalRcl },
    { chave: 'correntes', rotulo: 'Despesas correntes ÷ receita corrente líquida', v: correntesRcl },
    { chave: 'inv', rotulo: 'Investimentos ÷ receita corrente líquida', v: pick(D, 'investimento').map((x, j) => (x / rcl[j]) * 100) },
    { chave: 'sup', rotulo: 'Superávit corrente ÷ receita corrente líquida', v: supCorrente.map((x, j) => (x / rcl[j]) * 100) },
  ]
  const linhasResultado: Linha[] = [
    { chave: 'rc', rotulo: 'Receitas correntes (brutas)', nivel: 0, v: pick(R, 'receitas_correntes') },
    { chave: 'intra', rotulo: '(+) Intraorçamentárias', nivel: 0, v: pick(R, 'intra') },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', nivel: 0, v: pick(R, 'deducoes') },
    { chave: 'rcl', rotulo: '= Receita corrente líquida', nivel: 0, negrito: true, v: rcl },
    { chave: 'dc', rotulo: '(−) Despesas correntes', nivel: 0, v: pick(D, 'despesas_correntes').map(neg) },
    { chave: 'sup', rotulo: '= Superávit corrente', nivel: 0, negrito: true, v: supCorrente },
    { chave: 'rk', rotulo: '(+) Receitas de capital', nivel: 0, v: pick(R, 'receitas_capital') },
    { chave: 'dk', rotulo: '(−) Despesas de capital', nivel: 0, v: pick(D, 'despesas_capital').map(neg) },
    { chave: 'res', rotulo: '(−) Reservas (RPPS e contingência)', nivel: 0, v: reservas.map(neg) },
    { chave: 'saldo', rotulo: '= Resultado orçamentário', nivel: 0, negrito: true, v: COL.map((_, j) => supCorrente[j] + pick(R, 'receitas_capital')[j] - pick(D, 'despesas_capital')[j] - reservas[j]) },
  ]

  const tituloGrafico = vista === 'despesa' ? 'Despesa total, ano a ano' : 'Receita líquida, ano a ano'
  const legendaGrafico = vista === 'despesa'
    ? [{ cor: COR.empenhado, rotulo: 'Executado (PLOA, quadro de evolução)' }, { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Projeção de 2026 (linha preta: faixa)' }, { cor: COR.ploa, rotulo: 'Proposta 2027' }]
    : [{ cor: COR.empenhado, rotulo: 'Arrecadado' }, { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Projeção de 2026 (linha preta: faixa)' }, { cor: COR.ploa, rotulo: 'PLOA 2027' }]

  return (
    <div>
      <Cartao titulo="Em resumo: onde a proposta de 2027 se afasta do ritmo de 2026" className="mb-3">
        <TabelaItens altura="livre" itens={resumo} legenda="PLOA 2027 contra o fechamento projetado de 2026, em R$ milhões" colunas={[
          { rotulo: 'R$ milhões', valor: (l) => <span className="font-semibold">{l.rotulo}</span> },
          { rotulo: 'PLOA 2027', valor: (l) => <span className="font-semibold">{mi(l.p)}</span> },
          { rotulo: 'Projeção 2026', secundaria: true, valor: (l) => mi(l.a) },
          { rotulo: 'Diferença', valor: (l) => <span className={`font-semibold ${Math.abs(l.d) < 3 ? '' : l.d > 0 ? 'text-serie3' : 'text-serie2'}`}>{fmtPct(l.d)}</span> },
          { rotulo: 'Leitura', secundaria: true, valor: (l) => <span className={`font-normal ${Math.abs(l.d) < 3 ? 'text-ink-soft' : l.d > 0 ? 'text-serie3' : 'text-serie2'}`}>{leitura(l.d, l.tipo)}</span> },
        ]} />
        <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
          Projeção de 2026 pelo ritmo de arrecadação e de execução até o último dado publicado; despesa de 2026 na base empenhada. Diferença em valores correntes, sem deflacionar. Detalhes, faixas e testes na aba Método e fontes.
        </p>
      </Cartao>
      <div role="group" aria-label="O que ver" className="inline-flex overflow-hidden rounded-brand border border-line text-small print:hidden">
        {VISTAS.map((v) => (
          <button key={v.id} type="button" aria-pressed={vista === v.id} onClick={() => setVista(v.id)}
            className={`px-4 py-1.5 ${vista === v.id ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink hover:bg-surface'}`}>{v.rotulo}</button>
        ))}
      </div>
      <Faixa itens={faixa} nota={`Valores correntes; real = deflacionado pelo IPCA (2027: ${numero(i27 * 100, 2)}%, Focus). Tabelas em R$ milhões, arredondadas.`} />

      {vista !== 'resultado' && (
        <div className="mt-3 space-y-3">
          <Cartao titulo={tituloGrafico} legenda={<Legenda itens={legendaGrafico} />}
            direita={
              <div role="group" aria-label="Valores" className="inline-flex overflow-hidden rounded-brand border border-line text-small">
                {([['nominal', 'Nominal'], ['real', 'Real (R$ de 2027)']] as const).map(([k, r]) => (
                  <button key={k} type="button" aria-pressed={base === k} onClick={() => setBase(k)} className={`px-3 py-1 ${base === k ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{r}</button>
                ))}
              </div>
            }>
            <ColunasAnuais colunas={colunas} descricao={`${tituloGrafico}, em R$ bilhões, ${base === 'real' ? 'a preços de 2027' : 'valores correntes'}: ${colunas.map((c) => `${c.rotulo} ${numero(c.v / 1e9, 1)}`).join('; ')}`} />
            <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
              R$ bilhões; sob cada ano, a variação sobre a coluna anterior{base === 'real' ? ' em termos reais' : ''}.
              {vista === 'receita' ? ' Traço rosa: arrecadação provável de 2026 informada na PLOA.' : ' Traço rosa: despesa provável de 2026 informada na PLOA.'}
            </p>
          </Cartao>

          <Cartao titulo={vista === 'receita' ? 'Receita por grupo: o que o orçamento de 2027 supõe' : 'Despesa por grupo: o que o orçamento de 2027 supõe'}>
            <TabelaItens altura="livre" itens={itensTabela} colunas={colunasTabela} legenda={`${vista === 'receita' ? 'Receita' : 'Despesa'} por grupo, em R$ milhões`} />
            <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
              {vista === 'despesa' ? `Proj. 26: despesa empenhada projetada pelo ritmo de execução até ${nomeCorteDesp} (RREO), na base dos quadros da PLOA; Δ% e Real: 2027 sobre essa projeção. ` : comProj ? 'Proj. 26: fechamento projetado pelo ritmo de arrecadação (ver o método abaixo); Δ% e Real: 2027 sobre essa projeção. * só há mês a mês de 2025 para essa linha. ' : 'Δ% e Real: 2027 sobre o provável de 2026. '}a.a.: crescimento médio anual composto. ▲ ▼ marcam itens cuja variação difere em 5 pontos percentuais ou mais da do total (e de ao menos R$ 100 milhões), para indicar onde olhar primeiro.
            </p>
          </Cartao>

          <p className="text-small text-ink-soft print:hidden">
            A projeção de 2026 usa o ritmo de {vista === 'receita' ? 'arrecadação de cada tipo de receita' : 'execução de cada grupo de despesa'}. <button type="button" onClick={irParaMetodo} className="font-semibold text-navy underline underline-offset-4">Como é feita, quão boa é e se as fontes batem</button>.
          </p>
        </div>
      )}

      {vista === 'resultado' && (
        <div className="mt-3 space-y-3">
          <Cartao titulo="Resultado orçamentário, ano a ano">
            <TabelaItens altura="livre" itens={linhasResultado} legenda="Resultado orçamentário, em R$ milhões" colunas={[
              { rotulo: 'R$ milhões', valor: celulaLinha },
              ...ANOS.map((a, j) => ({ rotulo: a, valor: (l: Linha) => <span className={l.negrito || j === 4 ? 'font-semibold' : ''}>{mi(l.v[j])}</span> })),
            ]} />
          </Cartao>
          <Cartao titulo="Indicadores sobre a receita corrente líquida (aproximada)">
            <TabelaItens altura="livre" itens={indicadores} legenda="Indicadores, em % da receita corrente líquida" colunas={[
              { rotulo: 'Indicador', valor: (x) => x.rotulo },
              ...ANOS.map((a, j) => ({ rotulo: a, valor: (x: (typeof indicadores)[number]) => `${numero(x.v[j], 1)}%` })),
            ]} />
            <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">Receita corrente líquida aproximada = receitas correntes + intraorçamentárias − deduções do quadro da PLOA; não é a RCL da LRF, que tem regras próprias de apuração.</p>
          </Cartao>
        </div>
      )}
      <p className="mt-3 text-small text-ink-soft">Fonte: PLOA 2027, Mensagem nº 189/2026, quadros Evolução da Receita (p. 97) e Evolução da Despesa (p. 130); arrecadação mensal do Portal de Dados Abertos do ES; IPCA: {fonteIpca}</p>
    </div>
  )
}
