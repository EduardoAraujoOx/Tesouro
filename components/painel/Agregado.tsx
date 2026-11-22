'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR, TabelaItens } from './Graficos'
import { ColunasAnuais, fmtPct, type ColunaAnual } from './GraficosMacro'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { titulo } from './dados'
import { COD_DESPESA, COD_GRUPO } from './codigos'
import { elementosDespesa, fatorPrecos, ipcaAnual, projecaoItens, projetaDespesa2026, projetaReceita2026, type DadosReceita, type ItemProjetado } from './projecao'

/** RCL oficial (LRF, art. 2º, IV) e o indicador de pessoal do RGF, preparados no servidor */
export type RclOficial = {
  /** RCL dos 12 meses até dezembro (RGF/RREO), por ano */
  historico: Record<string, number>
  /** Quadro VI da Mensagem nº 189/2026: RCL da PLOA 2027, as receitas correntes de que parte e as deduções previdenciárias */
  ploa27: { rcl: number; correntes: number; previdenciarias: number }
  /** pessoal líquido do Poder Executivo, % da RCL, por quadrimestre (RGF), com o limite e o limite prudencial */
  rgfPessoal: { ano: number; quad: number; valor: number; limite: number; prudencial: number }[]
  /** pessoal e encargos (GND 1) do Executivo na PLOA 2027, bruto */
  pessoalExecutivoPloa: number
}

/** LRF e CAPAG: séries do Tesouro Nacional (RGF do Executivo, por quadrimestre; CAPAG, uma edição por ano) */
export type IndicadoresFiscais = {
  capag: { ano: number; classificacao: string | null; endividamento: number | null; poupanca: number | null; liquidez: number | null }[]
  lrf: { ano: number; quad: number; pessoal: { valor: number; montante: number }; divida: { valor: number; dc: number; rcl_ajustada: number | null }; garantias: { valor: number }; credito: { valor: number } }[]
  /** pessoal e encargos do Executivo empenhado em 2025 (Portal), bruto */
  pessoalExecutivoEmpenhado2025: number
}

export type Vista = 'receita' | 'despesa' | 'resultado'
const ANOS = ['2023', '2024', '2025', 'Provável 26 (PLOA)', '2027'] as const
/** posição de cada coluna acima nos seis valores dos quadros da PLOA: 2023, 2024, 2025, orçamento 2026, provável 2026, 2027 */
const COL = [0, 1, 2, 4, 5]

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const neg = (x: number) => (x === 0 ? 0 : -x)
const dMi = (x: number) => (Math.abs(x) < 0.5e6 ? '0' : `${sinal(x)}${milhoes(Math.abs(x), 0)}`)

type Linha = { chave: string; rotulo: string; nivel: number; negrito?: boolean; v: number[]; proj?: ItemProjetado; pai?: string }
/** variação (em %) a partir da qual a PLOA é dita acima ou abaixo da projeção de 2026 */
const DIF_MIN = 3
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const corDif = (d: number) => (Math.abs(d) < DIF_MIN ? '' : d > 0 ? 'text-serie3' : 'text-serie2')

export function VisaoGeral({ vista, elementosPloa, receita, despesa, ipca: ipcaParams, dados }: {
  vista: Vista; elementosPloa: Record<string, Record<string, number>>; receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; dados: DadosReceita
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set(['corr', 'capd']))
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

  const reservas = pick(D, 'reserva_rpps', 'reserva_contingencia')

  /* ---------- quadro de grandes grupos: poucos grupos, detalhe sob demanda ---------- */
  const linhasReceita: Linha[] = [
    { chave: 'imp', rotulo: 'Impostos', nivel: 0, v: pick(R, 'impostos') },
    { chave: 'icms', rotulo: 'ICMS', nivel: 1, pai: 'imp', v: pick(R, 'icms') },
    { chave: 'ipva', rotulo: 'IPVA', nivel: 1, pai: 'imp', v: pick(R, 'ipva') },
    { chave: 'irrf', rotulo: 'IRRF', nivel: 1, pai: 'imp', v: pick(R, 'irrf') },
    { chave: 'itcd', rotulo: 'ITCD', nivel: 1, pai: 'imp', v: pick(R, 'itcd') },
    { chave: 'taxas', rotulo: 'Taxas', nivel: 0, v: pick(R, 'taxas', 'contrib_melhoria') },
    { chave: 'contrib', rotulo: 'Contribuições', nivel: 0, v: pick(R, 'contribuicoes') },
    { chave: 'patrim', rotulo: 'Receita patrimonial', nivel: 0, v: pick(R, 'patrimonial') },
    { chave: 'transf', rotulo: 'Transferências correntes', nivel: 0, v: pick(R, 'transf_correntes') },
    { chave: 'tuniao', rotulo: 'da União', nivel: 1, pai: 'transf', v: pick(R, 'transf_corr_uniao') },
    { chave: 'toutras', rotulo: 'de outras origens', nivel: 1, pai: 'transf', v: pick(R, 'transf_corr_outras') },
    { chave: 'demais', rotulo: 'Demais receitas correntes', nivel: 0, v: pick(R, 'agropecuaria', 'industrial', 'servicos', 'outras_correntes') },
    { chave: 'intra', rotulo: 'Correntes intra­orçamentárias', nivel: 0, v: pick(R, 'intra') },
    { chave: 'cap', rotulo: 'Receitas de capital', nivel: 0, v: pick(R, 'receitas_capital') },
    { chave: 'cred', rotulo: 'Operações de crédito', nivel: 1, pai: 'cap', v: pick(R, 'operacoes_credito') },
    { chave: 'capout', rotulo: 'Demais de capital', nivel: 1, pai: 'cap', v: pick(R, 'alienacao', 'amortizacao_emprestimos', 'transf_capital', 'outras_capital') },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', nivel: 0, v: pick(R, 'deducoes') },
    { chave: 'liq', rotulo: 'Receita total (líquida de deduções)', nivel: 0, negrito: true, v: pick(R, 'total') },
  ]
  const linhasDespesa: Linha[] = [
    { chave: 'corr', rotulo: 'Despesas correntes', nivel: 0, v: pick(D, 'despesas_correntes') },
    { chave: 'pessoal', rotulo: 'Pessoal e encargos sociais', nivel: 1, pai: 'corr', v: pick(D, 'pessoal') },
    { chave: 'juros', rotulo: 'Juros e encargos da dívida', nivel: 1, pai: 'corr', v: pick(D, 'juros') },
    { chave: 'outras', rotulo: 'Outras despesas correntes', nivel: 1, pai: 'corr', v: pick(D, 'outras_correntes') },
    { chave: 'capd', rotulo: 'Despesas de capital', nivel: 0, v: pick(D, 'despesas_capital') },
    { chave: 'inv', rotulo: 'Investimentos', nivel: 1, pai: 'capd', v: pick(D, 'investimento') },
    { chave: 'invf', rotulo: 'Inversões financeiras', nivel: 1, pai: 'capd', v: pick(D, 'inversoes') },
    { chave: 'amort', rotulo: 'Amortização da dívida', nivel: 1, pai: 'capd', v: pick(D, 'amortizacao') },
    { chave: 'exec', rotulo: 'Despesa executável (sem reservas)', nivel: 0, negrito: true, v: pick(D, 'total').map((x, j) => x - reservas[j]) },
    { chave: 'res', rotulo: 'Reservas (RPPS e contingência)', nivel: 0, v: reservas },
  ]
  const projDe = (chave: string) => (chave === 'exec' ? projD.itens.tot : projD.itens[chave])
  /* elementos de despesa sob cada grupo de natureza: nível a mais, aberto ao clicar no grupo */
  const elementos = useMemo(() => elementosDespesa(elementosPloa), [elementosPloa])
  const linhasDespesaDetalhe: Linha[] = linhasDespesa.flatMap((l) => [
    l,
    ...(elementos[l.chave] ?? []).map((e): Linha => ({
      chave: `${l.chave}-${e.cod}`, rotulo: `${titulo(e.nome)}`, nivel: 2, pai: l.chave,
      v: [0, 0, e.v25, 0, e.ploa27], proj: { central: e.p26, base: 'mensal' },
    })),
  ])
  const comProj: Linha[] = vista === 'receita'
    ? linhasReceita.map((l) => ({ ...l, proj: itensProj[l.chave] }))
    : linhasDespesaDetalhe.map((l) => ({ ...l, proj: l.proj ?? projDe(l.chave) }))

  /* variação da PLOA 2027 sobre a projeção de 2026, nominal e real (descontada pelo IPCA de 2027) */
  const proj26De = (l: Linha): number | null => (l.proj && l.chave !== 'res' ? l.proj.central : null)
  const varNominal = (l: Linha) => { const p = proj26De(l); return p === null || Math.abs(p) < 1e6 ? null : (l.v[4] / p - 1) * 100 }
  const varReal = (l: Linha) => { const n = varNominal(l); return n === null ? null : ((1 + n / 100) / (1 + i27) - 1) * 100 }
  const porChave = new Map(comProj.map((l) => [l.chave, l]))
  const visivel = (l: Linha): boolean => !l.pai || (abertos.has(l.pai) && visivel(porChave.get(l.pai)!))
  const visiveis = comProj.filter(visivel)
  const alterna = (c: string) => setAbertos((a) => { const n = new Set(a); if (n.has(c)) n.delete(c); else n.add(c); return n })

  const reservas27 = reservas[4]

  /* ---------- gráfico anual ---------- */
  const serieTotal = vista === 'despesa' ? D.total : R.total
  const anosNum = [2023, 2024, 2025, 2026, 2027]
  /* na despesa, a barra da PLOA é a executável (sem reservas), como as demais: as reservas não são executadas */
  const ploa27 = vista === 'despesa' ? D.total[5] - reservas27 : serieTotal[5]

  const desp = vista === 'despesa'
  const mesRec = MESES_NOME[proj.meses - 1]
  const mesDesp = MESES_NOME[projD.mesCorte - 1]
  const expReal = desp
    ? 'Despesa empenhada no ano, incluídas as intraorçamentárias (Portal de Dados Abertos do ES).'
    : 'Receita total arrecadada no ano, líquida das deduções para municípios e Fundeb (quadro de evolução da receita da PLOA 2027 e Portal de Dados Abertos).'
  const exp26 = desp
    ? `A despesa de 2026 foi projetada com base no realizado até ${mesDesp} (Portal de Dados Abertos). Os meses restantes seguem o comportamento de anos anteriores (média de 2022–2025), apurado por grupo de despesa.`
    : `A receita de 2026 foi projetada com base no realizado até ${mesRec} (Portal de Dados Abertos). Os meses restantes seguem o comportamento de anos anteriores (média de 2022–2025), apurado por linha de receita.`
  const expPloa = desp
    ? 'Despesa fixada na proposta de lei orçamentária (Mensagem nº 189/2026), sem as reservas de RPPS, contingência e Fundo Soberano, que não são executadas. O traço tracejado marca a projeção de 2026 e o percentual é a variação da PLOA sobre ela, nominal ou real conforme o botão.'
    : 'Receita estimada na proposta de lei orçamentária (Mensagem nº 189/2026), líquida das deduções para municípios e Fundeb. O traço tracejado marca a projeção de 2026 e o percentual é a variação da PLOA sobre ela, nominal ou real conforme o botão.'
  const colunasBrutas: ColunaAnual[] = [
    { rotulo: '2023', v: serieTotal[0], tipo: 'real', explicacao: expReal },
    { rotulo: '2024', v: serieTotal[1], tipo: 'real', explicacao: expReal },
    { rotulo: '2025', v: serieTotal[2], tipo: 'real', explicacao: expReal },
    vista === 'despesa'
      ? { rotulo: '2026', sub: 'projeção', v: projD.itens.tot.central, tipo: 'estim', faixa: [projD.itens.tot.min as number, projD.itens.tot.max as number], explicacao: exp26 }
      : { rotulo: '2026', sub: 'projeção', v: proj.central, tipo: 'estim', faixa: [proj.min, proj.max], explicacao: exp26 },
    { rotulo: '2027', sub: 'PLOA', v: ploa27, tipo: 'ploa', explicacao: expPloa },
  ]
  /* a base real leva cada ano aos preços de 2027 (o traço de comparação e a faixa acompanham) */
  const aplicaBase = (cols: ColunaAnual[]) => cols.map((c, k) => {
    if (base === 'nominal') return c
    const f = fatorPrecos(ipca, anosNum[k], 2027)
    return { ...c, v: c.v * f, faixa: c.faixa && ([c.faixa[0] * f, c.faixa[1] * f] as [number, number]), marca: c.marca && { ...c.marca, v: c.marca.v * f }, compara: c.compara && { ...c.compara, v: c.compara.v * f } }
  })
  /* o traço de comparação da PLOA é a projeção de 2026, já na base escolhida: a variação mostrada é nominal ou real conforme o botão */
  const comTracoProj26 = (cols: ColunaAnual[], modo?: 'valor'): ColunaAnual[] => cols.map((c, k) => (k === 4 ? { ...c, compara: { v: cols[3].v, rotulo: 'Projeção 2026', modo } } : c))
  const colunas = comTracoProj26(aplicaBase(colunasBrutas))
  const nomeCorteDesp = MESES_NOME[projD.mesCorte - 1]
  const nomeCorte = MESES_NOME[proj.meses - 1]

  /* ---------- faixa de números ---------- */
  const v27 = serieTotal[5]
  const resultadoOrc = COL.map((_, j) => R.total[COL[j]] - D.total[COL[j]])
  const execPloa = D.total[5] - reservas27

  /* ---------- tabelas ---------- */
  const codigoDe = (l: Linha) => (vista === 'receita' ? COD_GRUPO[l.chave] : vista === 'despesa' ? COD_DESPESA[l.chave] : '') ?? ''
  /* sem coluna de códigos: o código fica na dica e no texto para leitores de tela; os grupos abrem o detalhe sob demanda */
  const celulaGrupo = (l: Linha): ReactNode => {
    const c = codigoDe(l)
    const filhos = comProj.some((x) => x.pai === l.chave)
    const aberto = abertos.has(l.chave)
    if (l.nivel === 2) return <span className="block pl-6 text-ink-soft md:pl-10">{l.rotulo}</span>
    if (l.nivel === 1 && !filhos) return <span title={c ? `Código ${c}` : undefined} className="block pl-4 text-ink-soft md:pl-5">{c && <span className="sr-only">{c} </span>}{l.rotulo}</span>
    if (!filhos) return <span title={c ? `Código ${c}` : undefined} className={`block pl-4 md:pl-5 ${l.negrito ? 'font-semibold' : 'font-medium'}`}>{c && <span className="sr-only">{c} </span>}{l.rotulo}</span>
    return (
      <button type="button" aria-expanded={aberto} onClick={() => alterna(l.chave)} title={c ? `Código ${c}` : undefined} className={`inline-flex items-center gap-1.5 text-left ${l.nivel === 1 ? 'ml-4 text-ink-soft md:ml-5' : 'font-medium text-ink'}`}>
        <span aria-hidden="true" className="inline-block w-3.5 text-ink-soft">{aberto ? '▾' : '▸'}</span>{l.rotulo}
        <span className="sr-only">{c ? ` (código ${c}); ` : ' '}{aberto ? 'recolher detalhe' : 'mostrar detalhe'}</span>
      </button>
    )
  }
  const celulaLinha = (l: Linha): ReactNode => <span className={l.negrito ? 'font-semibold' : l.nivel === 1 ? 'text-ink-soft' : ''}>{l.rotulo}</span>
  const colunasTabela = [
    { rotulo: 'R$ milhões', valor: celulaGrupo },
    { rotulo: '2025', secundaria: true, valor: (l: Linha) => (l.chave === 'res' && l.v[2] === 0 ? '–' : mi(l.v[2])) },
    { rotulo: 'Proj. 26', valor: (l: Linha) => (l.proj && l.chave !== 'res' ? <span title={l.proj.pontual ? 'Inclui a receita pontual de 2026 (indenizações, restituições e ressarcimentos), que não deve se repetir' : l.proj.base === 'resíduo' ? 'Resultado: receita líquida projetada menos a soma das linhas' : undefined}>{mi(l.proj.central)}{l.proj.pontual ? '†' : ''}</span> : '–') },
    { rotulo: 'PLOA 27', valor: (l: Linha) => <span className="font-semibold">{mi(l.v[4])}</span> },
    { rotulo: 'Var. R$ mi', secundaria: true, valor: (l: Linha) => { const p = proj26De(l); return p === null ? '–' : dMi(l.v[4] - p) } },
    { rotulo: 'Var. %', valor: (l: Linha) => { const d = varNominal(l); return d === null ? '–' : <span className={`font-semibold ${corDif(d)}`}>{fmtPct(d)}</span> } },
    { rotulo: 'Var. real %', secundaria: true, valor: (l: Linha) => { const d = varReal(l); return d === null ? '–' : <span className={corDif(d)}>{fmtPct(d)}</span> } },
  ]

  /* resultado orçamentário em cinco colunas: 2023–2025, Proj. 26 e PLOA 27 (sem reservas nas projeções, que não são executadas) */
  const cinco = (v: number[], proj26: number) => [v[0], v[1], v[2], proj26, v[4]]
  const somaRec = (chaves: string[]) => chaves.reduce((t, c) => t + itensProj[c].central, 0)
  const CORRENTES = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais']
  const rcBruta = cinco(pick(R, 'receitas_correntes'), somaRec(CORRENTES))
  const intra6 = cinco(pick(R, 'intra'), somaRec(['intra']))
  const ded6 = cinco(pick(R, 'deducoes'), somaRec(['ded']))
  const rcap6 = cinco(pick(R, 'receitas_capital'), somaRec(['cap']))
  const rt6 = rcBruta.map((x, j) => x + intra6[j] + ded6[j] + rcap6[j])
  const dcorr6 = cinco(pick(D, 'despesas_correntes'), projD.itens.corr.central)
  const dcap6 = cinco(pick(D, 'despesas_capital'), projD.itens.capd.central)
  const res6 = cinco(reservas, 0)
  const antesRes6 = rt6.map((x, j) => x - dcorr6[j] - dcap6[j])
  /* operações de crédito: 2023–2025 e PLOA pelo quadro da Mensagem; Proj. 26 pela projeção da receita */
  const cred6 = cinco(pick(R, 'operacoes_credito'), itensProj.cred.central)
  const ANOS5 = ['2023', '2024', '2025', 'Proj. 26', 'PLOA 27']
  const linhasResultado: Linha[] = [
    { chave: 'rc', rotulo: 'Receitas correntes (brutas)', nivel: 0, v: rcBruta },
    { chave: 'intra', rotulo: '(+) Intraorçamentárias', nivel: 0, v: intra6 },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', nivel: 0, v: ded6 },
    { chave: 'rk', rotulo: '(+) Receitas de capital', nivel: 0, v: rcap6 },
    { chave: 'rt', rotulo: '= Receita total (líquida de deduções)', nivel: 0, negrito: true, v: rt6 },
    { chave: 'dc', rotulo: '(−) Despesas correntes', nivel: 0, v: dcorr6.map(neg) },
    { chave: 'dk', rotulo: '(−) Despesas de capital', nivel: 0, v: dcap6.map(neg) },
    { chave: 'antes', rotulo: '= Resultado antes das reservas', nivel: 0, negrito: true, v: antesRes6 },
    { chave: 'res', rotulo: '(−) Reservas (RPPS e contingência)', nivel: 0, v: res6.map(neg) },
    { chave: 'saldo', rotulo: '= Resultado orçamentário', nivel: 0, negrito: true, v: antesRes6.map((x, j) => x - res6[j]) },
    { chave: 'cred', rotulo: 'Operações de crédito (incluídas nas receitas de capital)', nivel: 1, v: cred6 },
    { chave: 'semcred', rotulo: 'Resultado antes das reservas, sem operações de crédito', nivel: 1, v: antesRes6.map((x, j) => x - cred6[j]) },
  ]
  /* gráfico do resultado: antes das reservas, que só existem no orçamento (na PLOA fecham o resultado em zero) e não são executadas */
  const colunasResultado = comTracoProj26(aplicaBase([
    { rotulo: '2023', v: antesRes6[0], tipo: 'real', explicacao: 'Receita total, líquida de deduções, menos a despesa empenhada no ano.' },
    { rotulo: '2024', v: antesRes6[1], tipo: 'real', explicacao: 'Receita total, líquida de deduções, menos a despesa empenhada no ano.' },
    { rotulo: '2025', v: antesRes6[2], tipo: 'real', explicacao: 'Receita total, líquida de deduções, menos a despesa empenhada no ano.' },
    { rotulo: '2026', sub: 'projeção', v: antesRes6[3], tipo: 'estim', explicacao: 'Receita projetada menos despesa projetada de 2026, pelos mesmos métodos das seções Receita e Despesa.' },
    { rotulo: '2027', sub: 'PLOA', v: antesRes6[4], tipo: 'ploa', explicacao: 'Receita estimada menos despesa fixada na proposta, sem as reservas de RPPS e contingência, que fecham o resultado em zero. O traço tracejado marca a projeção de 2026 e o texto, a diferença da PLOA para ela, em R$ milhões.' },
  ]), 'valor')

  const tituloGrafico = vista === 'despesa' ? 'Despesa total' : 'Receita total, líquida de deduções'
  const legendaGrafico = [
    { cor: COR.empenhado, rotulo: vista === 'despesa' ? 'Executado' : 'Arrecadado' },
    { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Projeção 2026' },
    { cor: COR.ploa, rotulo: 'PLOA 2027' },
  ]
  const notaReferencia = (
    <Nota titulo="Metodologia">
      <p>
        Proj. 26: acumulado até {nomeCorte} (receita) ou {nomeCorteDesp} (despesa) dividido pela fração média do ano já realizada na mesma data em 2022–2025; faixa pelas frações extremas (traço preto no gráfico). Var.: PLOA 2027 sobre a Proj. 26; a variação real desconta o IPCA de 2027 (+{numero(i27 * 100, 1)}%, Focus/BCB); azul acima, rosa abaixo (≥ {DIF_MIN}%). A PLOA é orçamento inicial e a Proj. 26, execução provável: por construção o orçamento inicial fica abaixo do executado, que os créditos adicionais completam ao longo do ano.
      </p>
    </Nota>
  )

  return (
    <div>
      {(vista === 'receita' || vista === 'despesa') && (
        <div className="mt-3 space-y-3">
          <Cartao titulo={tituloGrafico} legenda={<Legenda itens={legendaGrafico} />}
            direita={
              <div role="group" aria-label="Valores" className="inline-flex overflow-hidden rounded-brand border border-line text-small">
                {([['nominal', 'Nominal'], ['real', 'Real (R$ de 2027)']] as const).map(([k, r]) => (
                  <button key={k} type="button" aria-pressed={base === k} onClick={() => setBase(k)} className={`px-3 py-1 ${base === k ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{r}</button>
                ))}
              </div>
            }>
            <ColunasAnuais colunas={colunas} descricao={`${tituloGrafico}, em R$ bilhões, ${base === 'real' ? 'a preços de 2027' : 'valores correntes'}: ${colunas.map((c) => `${c.rotulo}${c.sub ? ' ' + c.sub : ''} ${numero(c.v / 1e9, 1)}`).join('; ')}`} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              R$ bilhões, valores correntes{base === 'real' ? ' (reais de 2027)' : ''}. Linha preta: faixa; traço tracejado na barra da PLOA{vista === 'despesa' ? ' (sem reservas)' : ''}: projeção de 2026, e o percentual é a variação da PLOA sobre ela ({base === 'real' ? 'real' : 'nominal'}).
            </p>
          </Cartao>

          <Cartao longa titulo={vista === 'receita' ? 'Receita por categoria: PLOA 2027 sobre a projeção de 2026' : 'Despesa por grupo de natureza: PLOA 2027 sobre a projeção de 2026'}>
            <TabelaItens altura="livre" compacta itens={visiveis.map((l) => ({ ...l, chave: l.chave }))} colunas={colunasTabela} legenda={`${vista === 'receita' ? 'Receita por categoria' : 'Despesa por grupo de natureza'}, em R$ milhões`} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              Proj. 26: fechamento projetado ({vista === 'receita' ? `arrecadação até ${nomeCorte}` : `despesa empenhada até ${nomeCorteDesp}`}, completado pela sazonalidade média de 2022–2025). Var.: PLOA 2027 sobre a Proj. 26, em R$ milhões e em % nominal; Var. real %: descontado o IPCA de 2027.{vista === 'despesa' ? ` Elementos de despesa (clique no grupo): 2025 e Proj. 26 pelo empenhado do Portal, com a Proj. 26 de cada elemento distribuída na proporção do empenhado até ${nomeCorteDesp}; PLOA 2027 pelo detalhamento por elemento da proposta (PL 525/2026).` : ''}{vista === 'receita' ? ` † A Proj. 26 inclui receita pontual (indenizações, restituições e ressarcimentos: R$ ${mi(comProj.find((x) => x.chave === 'demais')?.proj?.pontual ?? 0)} mi até ${nomeCorte}), que não deve se repetir em 2027.` : ''}
            </p>
            {notaReferencia}
          </Cartao>

        </div>
      )}

      {vista === 'resultado' && (
        <div className="mt-3 space-y-3">
          <Cartao titulo="Resultado antes das reservas" legenda={<Legenda itens={[
            { cor: COR.empenhado, rotulo: 'Apurado' },
            { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Projeção 2026' },
            { cor: COR.ploa, rotulo: 'PLOA 2027' },
          ]} />}
            direita={
              <div role="group" aria-label="Valores" className="inline-flex overflow-hidden rounded-brand border border-line text-small">
                {([['nominal', 'Nominal'], ['real', 'Real (R$ de 2027)']] as const).map(([k, r]) => (
                  <button key={k} type="button" aria-pressed={base === k} onClick={() => setBase(k)} className={`px-3 py-1 ${base === k ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{r}</button>
                ))}
              </div>
            }>
            <ColunasAnuais colunas={colunasResultado} casas={2} descricao={`Resultado antes das reservas, em R$ bilhões, ${base === 'real' ? 'a preços de 2027' : 'valores correntes'}: ${colunasResultado.map((c) => `${c.rotulo}${c.sub ? ' ' + c.sub : ''} ${numero(c.v / 1e9, 2)}`).join('; ')}`} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              R$ bilhões, valores correntes{base === 'real' ? ' (reais de 2027)' : ''}. Receita total menos despesa, antes das reservas; traço tracejado na barra da PLOA: projeção de 2026, e o texto é a diferença da PLOA para ela, em R$ milhões.
            </p>
          </Cartao>
          <Cartao titulo="Resultado orçamentário">
            <TabelaItens altura="livre" itens={linhasResultado} legenda="Resultado orçamentário, em R$ milhões" colunas={[
              { rotulo: 'R$ milhões', valor: celulaLinha },
              ...ANOS5.map((a, j) => ({ rotulo: a, valor: (l: Linha) => <span className={l.negrito || j === 4 ? 'font-semibold' : ''}>{mi(l.v[j])}</span> })),
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              Resultado do Balanço Orçamentário (receita total menos despesa empenhada); não é resultado primário nem nominal, pois inclui o crédito como receita e a amortização como despesa. As reservas de RPPS e de contingência só existem no orçamento: nos anos executados são zero e, na PLOA, fecham o resultado em zero. 2023–2025: realizado, pelos quadros da Mensagem nº 189/2026. Proj. 26: projeção da equipe, sem reservas e com a receita pontual de 2026. PLOA 27: receita estimada menos despesa fixada.
            </p>
          </Cartao>
        </div>
      )}
      <p className={`mt-3 ${NOTA_DISCRETA}`}>
        Fontes: PLOA 2027 (Mensagem nº 189/2026{vista === 'receita' ? ', evolução da receita' : vista === 'despesa' ? ', evolução da despesa' : ', evolução da receita e da despesa'}); Portal de Dados Abertos do ES{vista === 'resultado' ? '' : '; IPCA: Focus (BCB), mediana'}.
      </p>
    </div>
  )
}
