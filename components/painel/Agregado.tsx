'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR, TabelaItens } from './Graficos'
import { ColunasAnuais, fmtPct, type ColunaAnual } from './GraficosMacro'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import minimosRaw from '@/data/minimos.json'
import { titulo } from './dados'
import { COD_DESPESA, COD_GRUPO } from './codigos'
import { BRENT_CENTRAL, CAMBIO_CENTRAL, EDICAO_EIA, PRODUCAO_CENTRAL, receitaPetroleo } from './petroleo'
import { analisaFontes, elementosDespesa, fatorPrecos, ipcaAnual, pibArrecadacao, projecaoItens, projetaDespesa2026, projetaReceita2026, tendenciaPessoal, type DadosReceita, type ItemProjetado } from './projecao'

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

type Vista = 'receita' | 'despesa' | 'resultado' | 'fiscais'
const VISTAS: { id: Vista; rotulo: string }[] = [
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa' },
  { id: 'resultado', rotulo: 'Resultado' },
  { id: 'fiscais', rotulo: 'LRF e CAPAG' },
]
const ANOS = ['2023', '2024', '2025', 'Provável 26 (PLOA)', '2027'] as const
/** posição de cada coluna acima nos seis valores dos quadros da PLOA: 2023, 2024, 2025, orçamento 2026, provável 2026, 2027 */
const COL = [0, 1, 2, 4, 5]

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const neg = (x: number) => (x === 0 ? 0 : -x)
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x), 0)}`

type Linha = { chave: string; rotulo: string; nivel: number; negrito?: boolean; v: number[]; proj?: ItemProjetado; pai?: string }
/** linhas cuja referência de 2027 não cresce com a economia: dependem de contratação e de decisões pontuais */
const SEM_CRESCIMENTO = new Set(['cap', 'cred', 'capout'])
/** diferença (em %) a partir da qual a PLOA é dita acima ou abaixo da referência */
const DIF_MIN = 3
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const corDif = (d: number) => (Math.abs(d) < DIF_MIN ? '' : d > 0 ? 'text-serie3' : 'text-serie2')

export function VisaoGeral({ funcoes, contingencia, elementosPloa, rclOficial, fiscais, receita, despesa, ipca: ipcaParams, pib, fonteIpca, dados, irParaMetodo }: {
  funcoes: Record<string, { emp25: number; ini26: number; atu26: number; emp26: number; ploa27: number }>; contingencia: number; elementosPloa: Record<string, Record<string, number>>; rclOficial: RclOficial; fiscais: IndicadoresFiscais; receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; fonteIpca: string; dados: DadosReceita; irParaMetodo: () => void
}) {
  const [vista, setVista] = useState<Vista>('receita')
  const [abertos, setAbertos] = useState<Set<string>>(new Set(['corr', 'capd']))
  const [base, setBase] = useState<'nominal' | 'real'>('nominal')
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const ipca = useMemo(() => ipcaAnual(Object.fromEntries(Object.entries(ipcaParams).map(([a, v]) => [a, v]))), [ipcaParams])
  const i27 = ipca[2027]
  const g27 = (1 + i27) * (1 + (pib['2027'] ?? 0)) - 1
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const itensProj = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])
  const pibA = useMemo(() => pibArrecadacao(), [])
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

  /* referência de 2027, independente da PLOA: o fechamento projetado de 2026 corrigido pela inflação e pelo PIB real (receita) ou só pela inflação (despesa) */
  /* petróleo: em vez de manter o patamar de 2026 corrigido, a receita de 2027 vem da relação com a cotação (Brent da EIA, câmbio do Focus, produção de 2026) */
  const petroleo26 = useMemo(() => analisaFontes(dados).find((a) => a.id === 'petroleo')!.central, [dados])
  const ajustePetroleo = receitaPetroleo(BRENT_CENTRAL, CAMBIO_CENTRAL, PRODUCAO_CENTRAL).transferencias - petroleo26 * (1 + g27)
  const refReceita = (l: Linha) => {
    if (!l.proj) return null
    const base = (l.proj.central - (l.proj.pontual ?? 0)) * (SEM_CRESCIMENTO.has(l.chave) ? 1 : 1 + g27)
    return l.chave === 'tuniao' || l.chave === 'transf' ? base + ajustePetroleo : base
  }
  const refDe = (l: Linha): number | null => {
    if (vista === 'receita') {
      if (l.chave === 'liq') return comProj.filter((x) => x.nivel === 0 && x.chave !== 'liq').reduce((s, x) => s + (refReceita(x) ?? 0), 0)
      return refReceita(l)
    }
    if (vista === 'despesa') return l.proj && l.chave !== 'res' ? l.proj.central * (1 + i27) : null
    return null
  }
  const difPct = (l: Linha) => { const r = refDe(l); return r === null || Math.abs(r) < 1e6 ? null : (l.v[4] / r - 1) * 100 }
  const porChave = new Map(comProj.map((l) => [l.chave, l]))
  const visivel = (l: Linha): boolean => !l.pai || (abertos.has(l.pai) && visivel(porChave.get(l.pai)!))
  const visiveis = comProj.filter(visivel)
  const alterna = (c: string) => setAbertos((a) => { const n = new Set(a); if (n.has(c)) n.delete(c); else n.add(c); return n })

  /* ---------- totais de referência para a faixa de números ---------- */
  const reservas27 = reservas[4]
  const refReceitaTotal = linhasReceita.filter((x) => x.nivel === 0 && x.chave !== 'liq').reduce((s, x) => s + (refReceita({ ...x, proj: itensProj[x.chave] }) ?? 0), 0)
  const refDespesa = projD.itens.tot.central * (1 + i27)
  /* faixa da referência: na receita, entre os dois cenários (petróleo e crédito); na despesa, a faixa sazonal da projeção corrigida pela inflação */
  const faixaRefReceita: [number, number] = [refReceitaTotal - (pibA.difDesvio / 100) * proj.central, refReceitaTotal + (pibA.difDesvio / 100) * proj.central]
  const faixaRefDespesa: [number, number] = [(projD.itens.tot.min as number) * (1 + i27), (projD.itens.tot.max as number) * (1 + i27)]

  /* ---------- gráfico anual ---------- */
  const serieTotal = vista === 'despesa' ? D.total : R.total
  const anosNum = [2023, 2024, 2025, 2026, 2027, 2027]
  /* na despesa, a barra da PLOA é a executável (sem reservas), como as demais: as reservas não são executadas */
  const ploa27 = vista === 'despesa' ? D.total[5] - reservas27 : serieTotal[5]

  /* referências alternativas para a despesa de 2027: limite pela receita e pessoal pela tendência da folha */
  const resultadoMedio = [0, 1, 2].reduce((t, c) => t + (R.total[c] - D.total[c]), 0) / 3
  const limiteReceita = refReceitaTotal - resultadoMedio
  const tendPessoal = useMemo(() => tendenciaPessoal(), [])
  const pessoalInercial = projD.itens.pessoal.central * (1 + i27)
  const pessoalTendencia = projD.itens.pessoal.central * (1 + tendPessoal.media)
  const comPessoalTendencia = refDespesa - pessoalInercial + pessoalTendencia
  const compressao = comPessoalTendencia - limiteReceita
  const refsDespesa = [
    { chave: 'inercial', rotulo: 'Inercial', sub: 'Proj. 26 corrigida pelo IPCA', v: refDespesa },
    { chave: 'receita', rotulo: 'Limite pela receita', sub: `Referência de receita menos o resultado médio de 2023–25 (R$ ${numero(resultadoMedio / 1e9, 2)} bi)`, v: limiteReceita },
    { chave: 'pessoal', rotulo: 'Pessoal pela tendência', sub: `Folha +${numero(tendPessoal.media * 100, 1)}% a.a. (média de 2024–26); demais despesas inerciais`, v: comPessoalTendencia },
  ].map((x) => ({ ...x, d: ploa27 - x.v, pct: (ploa27 / x.v - 1) * 100 }))
  const desp = vista === 'despesa'
  const mesRec = MESES_NOME[proj.meses - 1]
  const mesDesp = MESES_NOME[projD.mesCorte - 1]
  const expReal = desp
    ? 'Despesa empenhada no ano, incluídas as intraorçamentárias (Portal de Dados Abertos do ES).'
    : 'Receita total arrecadada no ano, líquida das deduções para municípios e Fundeb (quadro de evolução da receita da PLOA 2027 e Portal de Dados Abertos).'
  const exp26 = desp
    ? `Fechamento projetado de 2026: despesa acumulada até ${mesDesp} dividida pela fração do ano que a mesma data representou em 2022–2025 (folha, juros e amortização pela liquidação; demais, média de empenhada e liquidada). O traço preto é a faixa pelas frações extremas.`
    : `Fechamento projetado de 2026: arrecadação acumulada até ${mesRec} dividida pela fração do ano que o mesmo período costuma representar (média de 2022–2025), por linha de receita. O traço preto é a faixa pelas frações extremas.`
  const expPloa = desp
    ? 'Despesa fixada na proposta de lei orçamentária (Mensagem nº 189/2026), sem as reservas de RPPS, contingência e Fundo Soberano, que não são executadas. O traço tracejado é a projeção da equipe e o percentual mostra quanto a PLOA está acima ou abaixo dela.'
    : 'Receita estimada na proposta de lei orçamentária (Mensagem nº 189/2026), líquida das deduções para municípios e Fundeb. O traço tracejado é a projeção da equipe e o percentual mostra quanto a PLOA está acima ou abaixo dela.'
  const expEquipe = desp
    ? `Referência independente da PLOA: o fechamento projetado de 2026 corrigido só pelo IPCA (+${numero(i27 * 100, 1)}%), sem crescimento real, e por isso funciona como piso. A faixa vem das frações sazonais extremas de 2026.`
    : `Referência independente da PLOA: o fechamento projetado de 2026, sem a receita pontual, corrigido por IPCA e PIB real (+${numero(g27 * 100, 1)}%); o petróleo segue o Brent (US$ ${numero(BRENT_CENTRAL, 0)}) e o câmbio (R$ ${numero(CAMBIO_CENTRAL, 2)}) do Focus. A faixa é ± o desvio entre o crescimento dos impostos do ES e o do PIB nominal.`
  const colunasBrutas: ColunaAnual[] = [
    { rotulo: '2023', v: serieTotal[0], tipo: 'real', explicacao: expReal },
    { rotulo: '2024', v: serieTotal[1], tipo: 'real', explicacao: expReal },
    { rotulo: '2025', v: serieTotal[2], tipo: 'real', explicacao: expReal },
    vista === 'despesa'
      ? { rotulo: '2026', sub: 'projeção', v: projD.itens.tot.central, tipo: 'estim', faixa: [projD.itens.tot.min as number, projD.itens.tot.max as number], explicacao: exp26 }
      : { rotulo: '2026', sub: 'projeção', v: proj.central, tipo: 'estim', faixa: [proj.min, proj.max], explicacao: exp26 },
    vista === 'despesa'
      ? { rotulo: '2027', sub: 'equipe', v: refDespesa, tipo: 'ref', faixa: faixaRefDespesa, explicacao: expEquipe }
      : { rotulo: '2027', sub: 'equipe', v: refReceitaTotal, tipo: 'ref', faixa: faixaRefReceita, explicacao: expEquipe },
    { rotulo: '2027', sub: 'PLOA', v: ploa27, tipo: 'ploa', compara: { v: vista === 'despesa' ? refDespesa : refReceitaTotal, rotulo: 'Projeção 2027 (equipe)' }, explicacao: expPloa },
  ]
  const colunas = colunasBrutas.map((c, k) => {
    if (base === 'nominal') return c
    const f = fatorPrecos(ipca, anosNum[k], 2027)
    return { ...c, v: c.v * f, faixa: c.faixa && ([c.faixa[0] * f, c.faixa[1] * f] as [number, number]), marca: c.marca && { ...c.marca, v: c.marca.v * f }, compara: c.compara && { ...c.compara, v: c.compara.v * f } }
  })
  const proj26 = colunasBrutas[3].v
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
    if (l.nivel === 2) return <span className="block pl-10 text-ink-soft">{l.rotulo}</span>
    if (l.nivel === 1 && !filhos) return <span title={c ? `Código ${c}` : undefined} className="block pl-5 text-ink-soft">{c && <span className="sr-only">{c} </span>}{l.rotulo}</span>
    if (!filhos) return <span title={c ? `Código ${c}` : undefined} className={`block pl-5 ${l.negrito ? 'font-semibold' : 'font-medium'}`}>{c && <span className="sr-only">{c} </span>}{l.rotulo}</span>
    return (
      <button type="button" aria-expanded={aberto} onClick={() => alterna(l.chave)} title={c ? `Código ${c}` : undefined} className={`inline-flex items-center gap-1.5 text-left ${l.nivel === 1 ? 'ml-5 text-ink-soft' : 'font-medium text-ink'}`}>
        <span aria-hidden="true" className="inline-block w-3.5 text-ink-soft">{aberto ? '▾' : '▸'}</span>{l.rotulo}
        <span className="sr-only">{c ? ` (código ${c}); ` : ' '}{aberto ? 'recolher detalhe' : 'mostrar detalhe'}</span>
      </button>
    )
  }
  const celulaLinha = (l: Linha): ReactNode => <span className={l.negrito ? 'font-semibold' : ''}>{l.rotulo}</span>
  const colunasTabela = [
    { rotulo: 'R$ milhões', valor: celulaGrupo },
    { rotulo: '2025', secundaria: true, valor: (l: Linha) => (l.chave === 'res' && l.v[2] === 0 ? '–' : mi(l.v[2])) },
    { rotulo: 'Proj. 26', secundaria: true, valor: (l: Linha) => (l.proj && l.chave !== 'res' ? <span title={l.proj.base === 'resíduo' ? 'Resultado: receita líquida projetada menos a soma das linhas' : undefined}>{mi(l.proj.central)}</span> : '–') },
    { rotulo: 'Proj. 27', valor: (l: Linha) => { const r = refDe(l); return r === null ? '–' : <span title={l.proj?.pontual ? 'Sem a receita pontual de 2026 (indenizações, restituições e ressarcimentos), que não se repete' : undefined}>{mi(r)}{l.proj?.pontual ? '†' : ''}</span> } },
    { rotulo: 'PLOA 27', valor: (l: Linha) => <span className="font-semibold">{mi(l.v[4])}</span> },
    { rotulo: 'Dif. R$ mi', secundaria: true, valor: (l: Linha) => { const r = refDe(l); return r === null ? '–' : dMi(l.v[4] - r) } },
    { rotulo: 'Dif. %', valor: (l: Linha) => { const d = difPct(l); return d === null ? '–' : <span className={`font-semibold ${corDif(d)}`}>{fmtPct(d)}</span> } },
  ]

  /* resultado orçamentário em seis colunas: 2023–2025, Proj. 26, PLOA 27 e Proj. 27 (referência da equipe, sem reservas, que não são executadas) */
  const seis = (v: number[], proj26: number, ref27: number) => [v[0], v[1], v[2], proj26, v[4], ref27]
  const lr = (chave: string) => linhasReceita.find((x) => x.chave === chave)!
  const somaRec = (chaves: string[], ref: boolean) => chaves.reduce((t, c) => t + (ref ? (refReceita({ ...lr(c), proj: itensProj[c] }) ?? 0) : itensProj[c].central), 0)
  const CORRENTES = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais']
  const rcBruta = seis(pick(R, 'receitas_correntes'), somaRec(CORRENTES, false), somaRec(CORRENTES, true))
  const intra6 = seis(pick(R, 'intra'), somaRec(['intra'], false), somaRec(['intra'], true))
  const ded6 = seis(pick(R, 'deducoes'), somaRec(['ded'], false), somaRec(['ded'], true))
  /* RCL conforme a LRF (art. 2º, IV): receitas correntes, sem as intraorçamentárias, menos municípios e Fundeb e menos as deduções previdenciárias
     (contribuição do servidor, compensação previdenciária e rendimentos de recursos previdenciários). 2023–2025: RCL do RGF; PLOA 2027: Quadro VI
     da Mensagem; Proj. 26 e Proj. 27: as deduções previdenciárias na proporção média de 2023–25 das receitas correntes. */
  const rclH = ['2023', '2024', '2025'].map((a) => rclOficial.historico[a])
  const previdH = [0, 1, 2].map((j) => rcBruta[j] + ded6[j] - rclH[j])
  const propPrevid = previdH.reduce((t, x, j) => t + x / rcBruta[j], 0) / 3
  const previd6 = [previdH[0], previdH[1], previdH[2], propPrevid * rcBruta[3], rclOficial.ploa27.previdenciarias, propPrevid * rcBruta[5]]
  const rcl6 = rcBruta.map((x, j) => x + ded6[j] - previd6[j])
  const rcap6 = seis(pick(R, 'receitas_capital'), somaRec(['cap'], false), somaRec(['cap'], true))
  const rt6 = rcBruta.map((x, j) => x + intra6[j] + ded6[j] + rcap6[j])
  const dcorr6 = seis(pick(D, 'despesas_correntes'), projD.itens.corr.central, projD.itens.corr.central * (1 + i27))
  const dcap6 = seis(pick(D, 'despesas_capital'), projD.itens.capd.central, projD.itens.capd.central * (1 + i27))
  const res6 = seis(reservas, 0, 0)
  const antesRes6 = rt6.map((x, j) => x - dcorr6[j] - dcap6[j])
  const ANOS6 = ['2023', '2024', '2025', 'Proj. 26', 'PLOA 27', 'Proj. 27']
  /* ordem de exibição: a projeção da equipe antes da PLOA, para ler de pronto se a PLOA está acima ou abaixo (os vetores seguem [.., PLOA, Proj. 27]) */
  const ORDEM6 = [0, 1, 2, 3, 5, 4]
  const pessoal6 = seis(pick(D, 'pessoal'), projD.itens.pessoal.central, projD.itens.pessoal.central * (1 + i27))
  const rgf3q = (ano: number) => rclOficial.rgfPessoal.find((x) => x.ano === ano && x.quad === 3)?.valor ?? NaN
  const rgfUltimo = rclOficial.rgfPessoal[rclOficial.rgfPessoal.length - 1]
  const indicadores = [
    { chave: 'pessoal', rotulo: 'Pessoal e encargos, bruto ÷ RCL', v: pessoal6.map((x, j) => (x / rcl6[j]) * 100) },
    { chave: 'correntes', rotulo: 'Despesas correntes ÷ RCL', v: dcorr6.map((x, j) => (x / rcl6[j]) * 100) },
    { chave: 'inv', rotulo: 'Investimentos ÷ RCL', v: seis(pick(D, 'investimento'), projD.itens.inv.central, projD.itens.inv.central * (1 + i27)).map((x, j) => (x / rcl6[j]) * 100) },
    { chave: 'rgf', rotulo: 'Pessoal líquido do Executivo, RGF (3º quadrimestre)', v: [rgf3q(2023), rgf3q(2024), rgf3q(2025), NaN, NaN, NaN] },
  ]
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
  ]
  /* ponte da receita total à RCL */
  const linhasRcl: Linha[] = [
    { chave: 'rt', rotulo: 'Receita total (líquida de deduções)', nivel: 0, v: rt6 },
    { chave: 'rk', rotulo: '(−) Receitas de capital', nivel: 0, v: rcap6.map(neg) },
    { chave: 'intra', rotulo: '(−) Receitas intraorçamentárias', nivel: 0, v: intra6.map(neg) },
    { chave: 'prev', rotulo: '(−) Deduções previdenciárias (servidor, compensação e rendimentos)', nivel: 0, v: previd6.map(neg) },
    { chave: 'rcl', rotulo: '= RCL (LRF, art. 2º, IV)', nivel: 0, negrito: true, v: rcl6 },
  ]

  /* LRF e CAPAG: projeção de 2027 sobre a RCL da PLOA (rcl6[4]) e sobre a nossa (rcl6[5]) */
  const lrfUlt = fiscais.lrf[fiscais.lrf.length - 1]
  const lrf3q25 = fiscais.lrf.find((x) => x.ano === 2025 && x.quad === 3) ?? lrfUlt
  const razaoLiqBruto = lrf3q25.pessoal.montante / fiscais.pessoalExecutivoEmpenhado2025 // pessoal líquido do RGF sobre o bruto empenhado, 2025
  const parteExecutivo = rclOficial.pessoalExecutivoPloa / D.pessoal[5]
  const pessoalExec27 = [rclOficial.pessoalExecutivoPloa, projD.itens.pessoal.central * (1 + i27) * parteExecutivo]
  const pessoalLiq27 = pessoalExec27.map((x, k) => ((razaoLiqBruto * x) / rcl6[k === 0 ? 4 : 5]) * 100)
  const dc26 = lrfUlt.divida.rcl_ajustada ? (lrfUlt.divida.dc / 100) * lrfUlt.divida.rcl_ajustada : NaN // dívida consolidada, 2º quadrimestre de 2026
  const dc27 = dc26 + R.operacoes_credito[5] - D.amortizacao[5] // mais a captação e menos a amortização da PLOA
  const dcRcl27 = [(dc27 / rcl6[4]) * 100, (dc27 / rcl6[5]) * 100]
  const credito27 = [(R.operacoes_credito[5] / rcl6[4]) * 100, (itensProj.cred.central / rcl6[5]) * 100]
  /* poupança corrente (CAPAG): despesas correntes ÷ receitas correntes ajustadas. Proxy: receitas correntes menos municípios e Fundeb, calibrada em 2023–25 */
  const poupProxy = dcorr6.map((x, j) => (x / (rcBruta[j] + ded6[j])) * 100)
  const capagPoup = fiscais.capag.filter((x) => x.ano >= 2023 && x.ano <= 2025).map((x) => x.poupanca ?? NaN)
  const calibra = capagPoup.map((v, j) => v / poupProxy[j])
  const calibraMed = calibra.reduce((t, x) => t + x, 0) / calibra.length
  const calibraErro = Math.max(...calibra.map((x) => Math.abs(x - calibraMed))) * poupProxy[4]
  const poup27 = [poupProxy[4] * calibraMed, poupProxy[5] * calibraMed]
  const capagAno = (a: number) => fiscais.capag.find((x) => x.ano === a)
  const pcN = (x: number | null | undefined, c = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : `${numero(x, c)}%`)
  const aprox = (x: number, c = 1) => `≈ ${numero(x, c)}%`
  const linhasLrf = [
    { chave: 'pessoal', rotulo: 'Pessoal líquido do Executivo ÷ RCL', base: 'Limite 49%, prudencial 46,55%', v25: pcN(lrf3q25.pessoal.valor), v26: pcN(lrfUlt.pessoal.valor), ploa: aprox(pessoalLiq27[0]), proj: aprox(pessoalLiq27[1]) },
    { chave: 'dc', rotulo: 'Dívida consolidada ÷ RCL', base: 'Informativo: o limite de 200% é da dívida líquida', v25: pcN(lrf3q25.divida.dc), v26: pcN(lrfUlt.divida.dc), ploa: aprox(dcRcl27[0]), proj: aprox(dcRcl27[1]) },
    { chave: 'dcl', rotulo: 'Dívida consolidada líquida ÷ RCL', base: 'Limite 200%, alerta 180%', v25: pcN(lrf3q25.divida.valor), v26: pcN(lrfUlt.divida.valor), ploa: '–', proj: '–' },
    { chave: 'credito', rotulo: 'Operações de crédito ÷ RCL', base: 'Limite 16%, alerta 14,4%', v25: pcN(lrf3q25.credito.valor), v26: pcN(lrfUlt.credito.valor), ploa: aprox(credito27[0]), proj: aprox(credito27[1]) },
    { chave: 'garantias', rotulo: 'Garantias ÷ RCL', base: 'Limite 22%, alerta 19,8%', v25: pcN(lrf3q25.garantias.valor), v26: pcN(lrfUlt.garantias.valor), ploa: '–', proj: '–' },
  ]
  const linhasCapag = [
    { chave: 'endiv', rotulo: 'Endividamento (dívida consolidada ÷ RCL)', base: 'Nota A: abaixo de 60%', v: [2023, 2024, 2025].map((a) => pcN(capagAno(a)?.endividamento)), ploa: aprox(dcRcl27[0]), proj: aprox(dcRcl27[1]) },
    { chave: 'poup', rotulo: 'Poupança corrente (despesas ÷ receitas correntes ajustadas)', base: 'Nota A: abaixo de 85%; B: de 85% a 95%', v: [2023, 2024, 2025].map((a) => pcN(capagAno(a)?.poupanca)), ploa: aprox(poup27[0]), proj: aprox(poup27[1]) },
    { chave: 'liq', rotulo: 'Liquidez relativa (caixa líquida ÷ RCL)', base: 'Nota A: a partir de 5%', v: [2023, 2024, 2025].map((a) => pcN(capagAno(a)?.liquidez)), ploa: '–', proj: '–' },
    { chave: 'nota', rotulo: 'Classificação geral', base: 'Combinação das três notas', v: [2023, 2024, 2025].map((a) => capagAno(a)?.classificacao ?? '–'), ploa: '–', proj: '–' },
  ]

  /* limites e mínimos: regras fiscais e constitucionais contra a PLOA 2027 */
  const RCL_LDO = 30126.1e6 // RCL de julho de 2025 a junho de 2026, base dos limites da LDO 2027
  const difDespesaProj27 = Math.max(refDespesa - (D.total[5] - reservas27), 0) // PLOA executável (sem reservas) abaixo da Proj. 27
  const LIMITE_SUPLEMENTAR = 10627969219.2 // PLOA 2027, art. 6º: créditos suplementares aos Orçamentos Fiscal e da Seguridade, 30% da receita (LDO 2027, art. 24, § 3º, I)
  const m25 = (minimosRaw as unknown as { serie: { ano: number; ensino: number; saude: number }[] }).serie.find((x) => x.ano === 2025)!
  const pc = (x: number, c = 1) => `${numero(x, c)}%`
  const pp = (x: number, c = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${numero(Math.abs(x), c)} p.p.`
  const limites = [
    { chave: 'conting', rotulo: 'Contingência ÷ RCL', base: 'LDO art. 9º: mínimo de 2%', v25: '–', v27: pc(contingencia / RCL_LDO * 100, 2), folga: `${dMi(contingencia - 0.02 * RCL_LDO)} mi` },
    { chave: 'suplem', rotulo: 'Créditos suplementares autorizados', base: 'PLOA art. 6º: até 30% da receita', v25: '–', v27: `${numero(LIMITE_SUPLEMENTAR / 1e9, 2)} bi`, folga: `${mi(LIMITE_SUPLEMENTAR - difDespesaProj27)} mi` },
    { chave: 'ouro', rotulo: 'Crédito ÷ capital líquido', base: 'CF art. 167, III: até 100%', v25: pc((R.operacoes_credito[2] / (D.despesas_capital[2] - D.amortizacao[2])) * 100), v27: pc((R.operacoes_credito[5] / (D.despesas_capital[5] - D.amortizacao[5])) * 100), folga: `${mi(D.despesas_capital[5] - D.amortizacao[5] - R.operacoes_credito[5])} mi` },
    { chave: 'ensino', rotulo: 'Ensino (MDE)', base: 'CF art. 212: mínimo de 25%', v25: pc(m25.ensino, 2), v27: '–', folga: pp(m25.ensino - 25, 2) },
    { chave: 'saude', rotulo: 'Saúde (ASPS)', base: 'LC 141 art. 6º: mínimo de 12%', v25: pc(m25.saude, 2), v27: '–', folga: pp(m25.saude - 12, 2) },
  ]
  const impostosProj26 = itensProj.imp.central
  const funcoesMinimo = [
    { chave: 'edu', rotulo: 'Despesa na função Educação', v26: funcoes['12']?.atu26 ?? 0, v27: funcoes['12']?.ploa27 ?? 0 },
    { chave: 'sau', rotulo: 'Despesa na função Saúde', v26: funcoes['10']?.atu26 ?? 0, v27: funcoes['10']?.ploa27 ?? 0 },
    { chave: 'imp', rotulo: 'Receita de impostos (base dos mínimos)', v26: impostosProj26, v27: R.impostos[5] },
  ].map((f) => ({ ...f, d: (f.v27 / f.v26 - 1) * 100 }))

  const tituloGrafico = vista === 'despesa' ? 'Despesa total' : 'Receita total, líquida de deduções'
  const legendaGrafico = [
    { cor: COR.empenhado, rotulo: vista === 'despesa' ? 'Executado' : 'Arrecadado' },
    { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Projeção 2026' },
    { cor: COR.referencia, rotulo: 'Projeção 2027 (equipe)' },
    { cor: COR.ploa, rotulo: 'PLOA 2027' },
  ]
  const notaReferencia = (
    <Nota titulo="Metodologia">
      <p>
        Proj. 26: acumulado até {nomeCorte} (receita) ou {nomeCorteDesp} (despesa) dividido pela fração média do ano já realizada na mesma data em 2022–2025; faixa pelas frações extremas. Proj. 27: Proj. 26 corrigida pela variação nominal do PIB na receita (IPCA e PIB real, Focus: +{numero(g27 * 100, 1)}%) e pelo IPCA na despesa (+{numero(i27 * 100, 1)}%); operações de crédito e demais receitas de capital mantidas no nível de 2026; reservas excluídas da despesa. Petróleo: receita das transferências modelada pela cotação (Brent: média de 2027 da previsão da EIA de {EDICAO_EIA}, US$ {numero(BRENT_CENTRAL, 0)}; câmbio: mediana do Focus, R$ {numero(CAMBIO_CENTRAL, 2)}; produção: média de 2026). Não incorpora hipóteses sobre alíquotas, crédito a contratar ou ampliação real da despesa.
      </p>
      <p>
        Faixa de Proj. 27: na receita, ± o desvio da diferença entre o crescimento dos impostos do ES e o do PIB nominal desde {pibA.linhas[0].ano} ({numero(pibA.difDesvio, 1)} p.p.); na despesa, as participações sazonais extremas. Dif.: PLOA menos Proj. 27; azul acima, rosa abaixo (≥ {DIF_MIN}%). IPCA: {fonteIpca}{' '}
        <button type="button" onClick={irParaMetodo} className="font-semibold text-navy underline underline-offset-4">Testes e fontes</button>.
      </p>
    </Nota>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
        <div role="group" aria-label="O que ver" className="inline-flex max-w-full flex-wrap overflow-hidden rounded-brand border border-line text-small print:hidden">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" aria-pressed={vista === v.id} onClick={() => setVista(v.id)}
              className={`px-4 py-1.5 ${vista === v.id ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink hover:bg-surface'}`}>{v.rotulo}</button>
          ))}
        </div>
      </div>


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
              R$ bilhões, valores correntes{base === 'real' ? ' (reais de 2027)' : ''}. Linha preta: faixa; traço tracejado na barra da PLOA{vista === 'despesa' ? ' (sem reservas)' : ''}: projeção 2027 da equipe, e o percentual é a PLOA sobre a projeção.
            </p>
          </Cartao>

          <Cartao longa titulo={vista === 'receita' ? 'Receita por categoria: PLOA 2027 e projeção' : 'Despesa por grupo de natureza: PLOA 2027 e projeção'}>
            <TabelaItens altura="livre" compacta itens={visiveis.map((l) => ({ ...l, chave: l.chave }))} colunas={colunasTabela} legenda={`${vista === 'receita' ? 'Receita por categoria' : 'Despesa por grupo de natureza'}, em R$ milhões`} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              Proj. 26: fechamento projetado ({vista === 'receita' ? `arrecadação até ${nomeCorte}` : `despesa empenhada até ${nomeCorteDesp}`}). Dif.: PLOA 2027 menos Proj. 27.{vista === 'despesa' ? ` Elementos de despesa (clique no grupo): 2025 e Proj. 26 pelo empenhado do Portal, com a Proj. 26 de cada elemento distribuída na proporção do empenhado até ${nomeCorteDesp}; PLOA 2027 pelo detalhamento por elemento da proposta (PL 525/2026).` : ''}{vista === 'receita' ? ` † Exclui receita pontual de 2026 (indenizações, restituições e ressarcimentos: R$ ${mi(comProj.find((x) => x.chave === 'demais')?.proj?.pontual ?? 0)} mi até ${nomeCorte}).` : ''}
            </p>
            {notaReferencia}
          </Cartao>

          {vista === 'despesa' && (
            <Cartao titulo="Despesa de 2027: referências alternativas">
              <TabelaItens altura="livre" compacta itens={refsDespesa} legenda="Referências para a despesa executável de 2027 e a PLOA, em R$ milhões" colunas={[
                { rotulo: 'R$ milhões', valor: (x) => <><span className="font-medium text-ink">{x.rotulo}</span><span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{x.sub}</span></> },
                { rotulo: 'Proj. 27', valor: (x) => mi(x.v) },
                { rotulo: 'PLOA 27', valor: () => mi(ploa27) },
                { rotulo: 'Dif. R$ mi', valor: (x) => <span className="font-semibold">{dMi(x.d)}</span> },
                { rotulo: 'Dif. %', secundaria: true, valor: (x) => fmtPct(x.pct) },
              ]} />
              <p className={`mt-2 ${NOTA_DISCRETA}`}>
                Despesa executável, sem reservas. O resultado orçamentário (receita líquida menos despesa empenhada) foi positivo em 2023, 2024 e 2025: a despesa ficou abaixo da receita, e o limite pela receita supõe que isso se repita. Com a folha na tendência recente e o total no limite da receita, as demais despesas teriam de ficar R$ {mi(compressao)} milhões ({numero((compressao / (refDespesa - pessoalInercial)) * 100, 1)}%) abaixo da trajetória inercial. A PLOA é o orçamento inicial, que historicamente fecha abaixo do executado e é complementado por créditos adicionais ao longo do ano.
              </p>
            </Cartao>
          )}

        </div>
      )}

      {vista === 'resultado' && (
        <div className="mt-3 space-y-3">
          <Cartao titulo="Resultado orçamentário">
            <TabelaItens altura="livre" itens={linhasResultado} legenda="Resultado orçamentário, em R$ milhões" colunas={[
              { rotulo: 'R$ milhões', valor: celulaLinha },
              ...ORDEM6.map((j) => ({ rotulo: ANOS6[j], valor: (l: Linha) => <span className={l.negrito || j === 4 ? 'font-semibold' : ''}>{mi(l.v[j])}</span> })),
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>Proj. 26 e Proj. 27: referência da equipe, sem reservas (não são executadas), de modo que o resultado projetado é a receita menos a despesa executada; na PLOA as reservas fecham o resultado em zero.</p>
          </Cartao>
          <Cartao titulo="Da receita total à RCL (LRF, art. 2º, IV)">
            <TabelaItens altura="livre" itens={linhasRcl} legenda="Da receita total à receita corrente líquida, em R$ milhões" colunas={[
              { rotulo: 'R$ milhões', valor: celulaLinha },
              ...ORDEM6.map((j) => ({ rotulo: ANOS6[j], valor: (l: Linha) => <span className={l.negrito || j === 4 ? 'font-semibold' : ''}>{mi(l.v[j])}</span> })),
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>2023–2025: RCL dos 12 meses até dezembro (RGF/RREO); as deduções previdenciárias vêm por diferença. PLOA 27: Quadro VI da Mensagem nº 189/2026 (R$ {numero(rclOficial.ploa27.rcl / 1e9, 2)} bi); o título do quadro diz 2026, mas os valores são os de 2027. Proj. 26 e Proj. 27: as deduções previdenciárias na proporção média de 2023–25 das receitas correntes ({numero(propPrevid * 100, 1)}%). A RCL é a base dos limites da LRF e da LDO; a receita total é a que a lei orçamentária fixa e iguala à despesa.</p>
          </Cartao>
          <Cartao titulo="Indicadores (% da RCL)">
            <TabelaItens altura="livre" itens={indicadores} legenda="Indicadores, em % da RCL (LRF, art. 2º, IV)" colunas={[
              { rotulo: 'Indicador', valor: (x) => x.rotulo },
              ...ORDEM6.map((j) => ({ rotulo: ANOS6[j], valor: (x: (typeof indicadores)[number]) => (Number.isFinite(x.v[j]) ? `${numero(x.v[j], 1)}%` : '–') })),
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>Despesa bruta da PLOA e das projeções sobre a RCL acima. O pessoal líquido do RGF é o do Poder Executivo, com as exclusões da LRF (inativos pagos com recursos vinculados, indenizações e outras), e por isso não é comparável com o pessoal bruto de todos os Poderes; no 2º quadrimestre de 2026 era de {numero(rgfUltimo.valor, 1)}%.</p>
          </Cartao>

          <Cartao titulo="Limites e mínimos: LRF, LDO e Constituição">
            <TabelaItens altura="livre" compacta itens={limites} legenda="Limites e mínimos fiscais e constitucionais contra a PLOA 2027" colunas={[
              { rotulo: 'Regra', valor: (l) => <><span className="font-medium text-ink">{l.rotulo}</span><span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{l.base}</span></> },
              { rotulo: '2025', secundaria: true, valor: (l) => l.v25 },
              { rotulo: 'PLOA 2027', valor: (l) => l.v27 },
              { rotulo: 'Folga', valor: (l) => <span className="font-semibold">{l.folga}</span> },
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>Pessoal sobre a RCL do Quadro VI da PLOA, em valor bruto (sem as exclusões da LRF); o limite de 60% é o consolidado do Estado e o de 49%, o do Poder Executivo. Contingência: ação 9999 (sem as reservas do RPPS e do Fundo Soberano) contra 2% da RCL de julho de 2025 a junho de 2026 (R$ {numero(RCL_LDO / 1e9, 1)} bi). Créditos suplementares: limite do art. 6º do projeto de lei (anulação de dotações, excesso de arrecadação, superávit financeiro, operações de crédito ou reserva de contingência); a folga desconta a diferença entre a PLOA e a Proj. 27 (R$ {mi(difDespesaProj27)} milhões), que seria coberta por esses créditos. Crédito contra despesas de capital líquidas de amortizações. Ensino e saúde: percentual apurado no RREO de 2025, sobre a receita de impostos líquida de transferências constitucionais; a folga é a de 2025, pois o valor aplicado em 2027 só se conhece na execução.</p>
          </Cartao>
          <Cartao titulo="Funções com mínimo constitucional: dotação de 2026 e PLOA 2027">
            <TabelaItens altura="livre" compacta itens={funcoesMinimo} legenda="Despesa nas funções Educação e Saúde e receita de impostos, 2026 e PLOA 2027, em R$ milhões" colunas={[
              { rotulo: 'R$ milhões', valor: (f) => <span className="font-medium">{f.rotulo}</span> },
              { rotulo: '2026', valor: (f) => mi(f.v26) },
              { rotulo: 'PLOA 27', valor: (f) => <span className="font-semibold">{mi(f.v27)}</span> },
              { rotulo: 'Dif. %', valor: (f) => <span className={`font-semibold ${corDif(f.d)}`}>{fmtPct(f.d)}</span> },
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>2026: dotação atualizada das funções (Portal de Dados Abertos) e Proj. 26 dos impostos. A função inclui despesas fora do cômputo do mínimo (por exemplo, parte da previdência e transferências), de modo que a comparação é de ordem de grandeza, não de apuração.</p>
          </Cartao>
        </div>
      )}
      {vista === 'fiscais' && (
        <div className="mt-3 space-y-3">
          <Cartao titulo="LRF: limites e projeção para 2027">
            <TabelaItens altura="livre" compacta itens={linhasLrf} legenda="Indicadores da Lei de Responsabilidade Fiscal, em % da RCL" colunas={[
              { rotulo: 'Indicador', valor: (l) => <><span className="font-medium text-ink">{l.rotulo}</span><span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{l.base}</span></> },
              { rotulo: `${lrf3q25.ano} (${lrf3q25.quad}º quad.)`, secundaria: true, valor: (l) => l.v25 },
              { rotulo: `${lrfUlt.ano} (${lrfUlt.quad}º quad.)`, valor: (l) => l.v26 },
              { rotulo: 'Proj. 27', valor: (l) => l.proj },
              { rotulo: 'PLOA 27', valor: (l) => <span className="font-semibold">{l.ploa}</span> },
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>2025 e 2026: RGF do Poder Executivo (Tesouro Nacional). Projeções (≈): pessoal líquido = pessoal bruto do Executivo (PLOA ou referência) vezes a razão entre o líquido do RGF e o bruto empenhado em 2025 ({numero(razaoLiqBruto * 100, 0)}%), sobre a RCL da PLOA (R$ {numero(rcl6[4] / 1e9, 2)} bi) ou a nossa (R$ {numero(rcl6[5] / 1e9, 2)} bi); dívida consolidada de {lrfUlt.ano} ({lrfUlt.quad}º quadrimestre) mais as operações de crédito e menos a amortização da PLOA 2027 (R$ {numero(dc27 / 1e9, 2)} bi); operações de crédito: captação da PLOA e, na Proj. 27, a de 2026. Não projetamos a dívida líquida nem as garantias, que dependem de caixa e de contratos.</p>
          </Cartao>
          <Cartao titulo="CAPAG: notas e projeção para 2027">
            <TabelaItens altura="livre" compacta itens={linhasCapag} legenda="Capacidade de pagamento (CAPAG), três indicadores e classificação" colunas={[
              { rotulo: 'Indicador', valor: (l) => <><span className="font-medium text-ink">{l.rotulo}</span><span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{l.base}</span></> },
              ...[0, 1, 2].map((j) => ({ rotulo: String(2023 + j), secundaria: j < 2, valor: (l: (typeof linhasCapag)[number]) => l.v[j] })),
              { rotulo: 'Proj. 27', valor: (l: (typeof linhasCapag)[number]) => l.proj },
              { rotulo: 'PLOA 27', valor: (l: (typeof linhasCapag)[number]) => <span className="font-semibold">{l.ploa}</span> },
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>Edições do Tesouro Nacional; faixas da Portaria Normativa MF nº 1.583/2023. Endividamento: mesma dívida consolidada projetada acima. Poupança corrente: razão entre as despesas correntes e as receitas correntes menos municípios e Fundeb, multiplicada por um fator calibrado nas edições de 2023 a 2025 ({numero(calibraMed, 2)}; erro de até ±{numero(calibraErro, 0)} p.p.), porque o conceito de receitas correntes ajustadas da STN não é reproduzível com os quadros da PLOA. A liquidez depende da posição de caixa e não é projetada; em 2025 estava em {pcN(capagAno(2025)?.liquidez)}, contra o piso de 5% da nota A. Em qualquer das projeções, endividamento e poupança permanecem na faixa da nota A.</p>
          </Cartao>
        </div>
      )}
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fonte: PLOA 2027, Mensagem nº 189/2026, quadros Evolução da Receita (p. 97) e Evolução da Despesa (p. 130); arrecadação mensal do Portal de Dados Abertos do ES; despesa empenhada: Siconfi, RREO; IPCA: {fonteIpca}</p>
    </div>
  )
}
