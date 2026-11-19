import rreoRaw from '@/data/rreo.json'
import ritmoRaw from '@/data/ritmo-receita.json'

/** Linhas do arquivo de receita: [mes, alinea, fonte, bruta, deducao, liquida_tipo] (R$). */
export type DadosReceita = {
  anos: Record<string, { fechado: boolean; linhas: (string | number)[][] }>
  nomes: { alinea: Record<string, string>; fonte: Record<string, string> }
  coletado_em: string
}

/** Soma por mês (1 a 12) de uma coluna do arquivo (3 = bruta, 4 = dedução), filtrando pelo prefixo da alínea. */
export function porMes(linhas: (string | number)[][], col: 3 | 4 | 'liq', prefixos?: string[], exclui?: string[]): number[] {
  const m = Array(12).fill(0)
  for (const l of linhas) {
    const alinea = String(l[1])
    if (prefixos && !prefixos.some((p) => alinea.startsWith(p))) continue
    if (exclui && exclui.some((p) => alinea.startsWith(p))) continue
    const v = col === 'liq' ? Number(l[3]) + Number(l[4]) : Number(l[col])
    m[Number(l[0]) - 1] += v
  }
  return m
}
export const soma = (v: number[], ate = 12) => v.slice(0, ate).reduce((s, x) => s + x, 0)

/* ---------- ritmo e projeção de fechamento por tipo de receita ---------- */

type Ritmo = { fonte: string; coletado_em: string; anos: Record<string, Record<string, Record<string, number>>> }
const ritmo = ritmoRaw as unknown as Ritmo

/** Grupos de receita: contas do RREO (Anexo 01) e o prefixo da natureza da receita no arquivo do Portal, que somam o mesmo valor. */
export type GrupoDef = { id: string; rotulo: string; rreo: string[]; prefixos: string[] }
export const GRUPOS: GrupoDef[] = [
  { id: 'impostos', rotulo: 'Impostos', rreo: ['Impostos'], prefixos: ['111'] },
  { id: 'taxas', rotulo: 'Taxas', rreo: ['Taxas'], prefixos: ['112', '113'] },
  { id: 'contrib', rotulo: 'Contribuições', rreo: ['CONTRIBUIÇÕES'], prefixos: ['12'] },
  { id: 'patrim', rotulo: 'Receita patrimonial', rreo: ['RECEITA PATRIMONIAL'], prefixos: ['13'] },
  { id: 'transf', rotulo: 'Transferências correntes', rreo: ['TRANSFERÊNCIAS CORRENTES'], prefixos: ['17'] },
  { id: 'demais', rotulo: 'Demais receitas correntes', rreo: ['RECEITA AGROPECUÁRIA', 'RECEITA INDUSTRIAL', 'RECEITA DE SERVIÇOS', 'OUTRAS RECEITAS CORRENTES'], prefixos: ['14', '15', '16', '19'] },
  { id: 'intra', rotulo: 'Correntes intraorçamentárias', rreo: ['RECEITAS (INTRA-ORÇAMENTÁRIAS) (II)'], prefixos: ['7', '8'] },
  { id: 'cred', rotulo: 'Operações de crédito', rreo: ['OPERAÇÕES DE CRÉDITO'], prefixos: ['21'] },
  { id: 'capout', rotulo: 'Demais receitas de capital', rreo: ['ALIENAÇÃO DE BENS', 'AMORTIZAÇÕES DE EMPRÉSTIMOS', 'TRANSFERÊNCIAS DE CAPITAL', 'OUTRAS RECEITAS DE CAPITAL'], prefixos: ['22', '23', '24', '25', '29'] },
]
const TOTAL_RREO = ['SUBTOTAL DAS RECEITAS (III) = (I + II)']
/** Anos usados para medir a sazonalidade (quanto do ano já está arrecadado no mês de corte). */
const ANOS_SAZONAIS = [2022, 2023, 2024, 2025]
/** Anos mostrados no ritmo (acumulado até o mesmo ponto do ano). */
export const ANOS_RITMO = [2023, 2024, 2025]

export type RitmoGrupo = {
  id: string
  rotulo: string
  /** acumulado líquido até o bimestre de corte, por ano (R$) */
  acumulado: Record<number, number>
  /** participação do acumulado no total do ano, por ano fechado */
  participacoes: { ano: number; valor: number }[]
  participacaoMedia: number
  /** fechamento projetado de 2026 (líquido): acumulado de 2026 dividido pela participação média; faixa pelas participações extremas */
  central: number
  min: number
  max: number
  /** a participação oscila mais de 8 pontos entre os anos: projeção pouco confiável */
  oscila: boolean
}

export type RitmoReceita = {
  /** meses usados no corte (par: o RREO é bimestral) e bimestre correspondente */
  meses: number
  bimestre: number
  grupos: RitmoGrupo[]
  total: RitmoGrupo
  /** acumulado bruto de 2026 por grupo (antes das deduções), até o mesmo mês, para comparar com a PLOA, que é bruta */
  brutoAcumulado26: Record<string, number>
}

const somaContas = (ano: number, per: number, contas: string[]) => contas.reduce((s, c) => s + (ritmo.anos[String(ano)]?.[String(per)]?.[c] ?? 0), 0)
const naturezaDe = (l: (string | number)[]) => String(l[1])

/** Mês de corte: último mês completo da coleta, arredondado para baixo a um bimestre cheio (o RREO é bimestral). */
export function mesesCorte(dados: DadosReceita): { ultimo: number; meses: number; bimestre: number } {
  const coleta = new Date(dados.coletado_em)
  const ultimo = Math.max(1, Math.min(12, coleta.getMonth() + (coleta.getDate() >= 28 ? 1 : 0)))
  const bimestre = Math.max(1, Math.floor(ultimo / 2))
  return { ultimo, meses: bimestre * 2, bimestre }
}

function grupoRitmo(def: { id: string; rotulo: string; rreo: string[] }, bimestre: number, acumulado26: number): RitmoGrupo {
  const acumulado: Record<number, number> = {}
  for (const a of ANOS_RITMO) acumulado[a] = somaContas(a, bimestre, def.rreo)
  acumulado[2026] = acumulado26
  const participacoes = ANOS_SAZONAIS.map((ano) => ({ ano, valor: somaContas(ano, 6, def.rreo) > 0 ? somaContas(ano, bimestre, def.rreo) / somaContas(ano, 6, def.rreo) : NaN })).filter((p) => Number.isFinite(p.valor) && p.valor > 0)
  const valores = participacoes.map((p) => p.valor)
  const media = valores.reduce((s, x) => s + x, 0) / (valores.length || 1)
  const central = valores.length ? acumulado26 / media : NaN
  return {
    id: def.id, rotulo: def.rotulo, acumulado, participacoes, participacaoMedia: media, central,
    min: valores.length ? acumulado26 / Math.max(...valores) : NaN, max: valores.length ? acumulado26 / Math.min(...valores) : NaN,
    oscila: valores.length > 1 && Math.max(...valores) - Math.min(...valores) > 0.08,
  }
}

/**
 * Ritmo da arrecadação até o mês de corte e projeção de fechamento de 2026 por tipo de receita.
 * Projeção = acumulado de 2026 ÷ participação média, nos anos de 2022 a 2025, do acumulado até o mesmo ponto na arrecadação do ano
 * inteiro (RREO, líquida). A faixa usa a menor e a maior participação observadas. Só realizado: não usa orçamento nem previsão.
 */
export function ritmoReceita(dados: DadosReceita): RitmoReceita {
  const { meses, bimestre } = mesesCorte(dados)
  const linhas = dados.anos['2026']?.linhas ?? []
  const ate = linhas.filter((l) => Number(l[0]) <= meses)
  const liq = (f: (l: (string | number)[]) => boolean) => ate.filter(f).reduce((s, l) => s + Number(l[3]) + Number(l[4]), 0)
  const bruto = (f: (l: (string | number)[]) => boolean) => ate.filter(f).reduce((s, l) => s + Number(l[3]), 0)
  const grupos = GRUPOS.map((g) => grupoRitmo(g, bimestre, liq((l) => g.prefixos.some((p) => naturezaDe(l).startsWith(p)))))
  const total = grupoRitmo({ id: 'total', rotulo: 'Receita líquida total', rreo: TOTAL_RREO }, bimestre, liq(() => true))
  const brutoAcumulado26: Record<string, number> = {}
  for (const g of GRUPOS) brutoAcumulado26[g.id] = bruto((l) => g.prefixos.some((p) => naturezaDe(l).startsWith(p)))
  return { meses, bimestre, grupos, total, brutoAcumulado26 }
}

export type Projecao = {
  /** último mês completo usado (1 a 12) */
  ultimo: number
  /** meses usados no corte (bimestre cheio) */
  meses: number
  acumulado: number
  acumulado25: number
  /** participação média do acumulado até o corte no ano inteiro */
  participacao: number
  central: number
  min: number
  max: number
  /** participação em cada ano de 2022 a 2025, para mostrar a estabilidade da sazonalidade */
  sazonalidade: { ano: number; participacao: number }[]
}

/** Projeção de fechamento da receita líquida total de 2026 (ver `ritmoReceita`). */
export function projetaReceita2026(dados: DadosReceita): Projecao {
  const r = ritmoReceita(dados)
  const { ultimo } = mesesCorte(dados)
  return {
    ultimo, meses: r.meses, acumulado: r.total.acumulado[2026], acumulado25: r.total.acumulado[2025], participacao: r.total.participacaoMedia,
    central: r.total.central, min: r.total.min, max: r.total.max, sazonalidade: r.total.participacoes.map((p) => ({ ano: p.ano, participacao: p.valor })),
  }
}

export type ItemProjetado = { central: number; min?: number; max?: number; base: 'bimestres' | 'icms' | '2025' | 'resíduo' }

/**
 * Projeção bruta de fechamento de 2026 para as linhas do quadro da PLOA (que é bruto das deduções), pela mesma regra.
 *  - grupos do RREO: sazonalidade líquida de 2022 a 2025 aplicada ao acumulado bruto;
 *  - ICMS: sazonalidade mensal de 2022 a 2025 (RREO, Anexo 03), aplicada à arrecadação bruta de ICMS do Portal;
 *  - IPVA, IRRF e ITCD: só há mês a mês de 2025 no Portal, e a sazonalidade desse ano é a única base (sem faixa);
 *  - deduções: resíduo entre a receita líquida total projetada e a soma das linhas brutas.
 */
export function projecaoItens(dados: DadosReceita): Record<string, ItemProjetado> {
  const r = ritmoReceita(dados)
  const out: Record<string, ItemProjetado> = {}
  const gr = Object.fromEntries(r.grupos.map((g) => [g.id, g]))
  const proj = (id: string, bruto: number): ItemProjetado => {
    const g = gr[id]
    const sh = g.participacoes.map((p) => p.valor)
    return { central: bruto / g.participacaoMedia, min: bruto / Math.max(...sh), max: bruto / Math.min(...sh), base: 'bimestres' }
  }
  const linhas26 = dados.anos['2026']?.linhas ?? []
  const linhas25 = dados.anos['2025']?.linhas ?? []
  const bruto = (linhas: (string | number)[][], ate: number, pref: string[], exclui: string[] = []) =>
    linhas.filter((l) => Number(l[0]) <= ate && pref.some((p) => naturezaDe(l).startsWith(p)) && !exclui.some((p) => naturezaDe(l).startsWith(p))).reduce((s, l) => s + Number(l[3]), 0)

  for (const g of GRUPOS) out[g.id] = proj(g.id, r.brutoAcumulado26[g.id])
  out.tuniao = proj('transf', bruto(linhas26, r.meses, ['171']))
  out.toutras = proj('transf', bruto(linhas26, r.meses, ['17'], ['171']))
  out.cap = { central: out.cred.central + out.capout.central, min: (out.cred.min ?? NaN) + (out.capout.min ?? NaN), max: (out.cred.max ?? NaN) + (out.capout.max ?? NaN), base: 'bimestres' }

  // ICMS: sazonalidade mensal do RREO, no mesmo número de meses do corte mensal
  const icmsHist = (rreoRaw as unknown as { mensal: { icms: Record<string, number> } }).mensal.icms
  const soma12 = (a: number, ate: number) => Array.from({ length: ate }, (_, i) => icmsHist[`${a}-${String(i + 1).padStart(2, '0')}`] ?? 0).reduce((s, x) => s + x, 0)
  const shIcms = ANOS_SAZONAIS.map((a) => soma12(a, r.meses) / soma12(a, 12)).filter((x) => x > 0)
  const icmsYtd = bruto(linhas26, r.meses, ['1114'])
  const mediaIcms = shIcms.reduce((s, x) => s + x, 0) / shIcms.length
  out.icms = { central: icmsYtd / mediaIcms, min: icmsYtd / Math.max(...shIcms), max: icmsYtd / Math.min(...shIcms), base: 'icms' }

  // IPVA, IRRF, ITCD: sazonalidade de 2025 (única disponível mês a mês)
  for (const [id, pref] of [['ipva', '111251'], ['irrf', '111303'], ['itcd', '111252']] as const) {
    const sh = bruto(linhas25, r.meses, [pref]) / bruto(linhas25, 12, [pref])
    out[id] = { central: bruto(linhas26, r.meses, [pref]) / sh, base: '2025' }
  }
  // impostos: grupo do RREO (já em out.impostos); deduções: resíduo
  out.imp = out.impostos
  const somaBruta = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais', 'intra', 'cap'].reduce((s, k) => s + out[k].central, 0)
  out.ded = { central: r.total.central - somaBruta, base: 'resíduo' }
  out.liq = { central: r.total.central, min: r.total.min, max: r.total.max, base: 'bimestres' }
  return out
}

/** IPCA anual (dezembro a dezembro) a partir da série mensal; para anos incompletos ou futuros, o parâmetro informado (Focus). */
export function ipcaAnual(parametros: Record<string, number>): Record<number, number> {
  const mensal = (rreoRaw as unknown as { ipca: { mes: string; var: number }[] }).ipca
  const acc: Record<number, { f: number; n: number }> = {}
  for (const x of mensal) {
    const a = Number(x.mes.slice(0, 4))
    acc[a] = acc[a] ?? { f: 1, n: 0 }
    acc[a].f *= 1 + x.var / 100
    acc[a].n += 1
  }
  const out: Record<number, number> = {}
  for (const [a, v] of Object.entries(acc)) if (v.n === 12) out[Number(a)] = v.f - 1
  for (const [a, v] of Object.entries(parametros)) out[Number(a)] = v
  return out
}

/** Fator para levar um valor nominal do ano `de` a preços do ano `para` (IPCA acumulado dos anos seguintes até `para`). */
export function fatorPrecos(ipca: Record<number, number>, de: number, para: number): number {
  let f = 1
  for (let a = de + 1; a <= para; a++) f *= 1 + (ipca[a] ?? 0)
  return f
}
