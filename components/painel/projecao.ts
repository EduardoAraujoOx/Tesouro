import rreoRaw from '@/data/rreo.json'
import ritmoRaw from '@/data/ritmo-receita.json'
import ritmoDespRaw from '@/data/ritmo-despesa.json'
import despesaMacroRaw from '@/data/ploa2027-macro.json'

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

/** Teste retroativo do método: em cada ano de 2022 a 2025, projeta o fechamento a partir do mesmo corte de outubro, usando só os até quatro anos anteriores, e compara com o realizado. */
export type RetroGrupo = { id: string; rotulo: string; erros: { ano: number; erro: number | null }[]; erroMedio: number | null }
export function retroteste(): { grupos: RetroGrupo[]; total: RetroGrupo; bimestre: number } {
  const bimestre = 5
  const dados: { id: string; rotulo: string; rreo: string[] }[] = [...GRUPOS, { id: 'total', rotulo: 'Receita líquida total', rreo: TOTAL_RREO }]
  const feitos = dados.map((g) => {
    const erros = [2022, 2023, 2024, 2025].map((ano) => {
      const previos = Array.from({ length: 4 }, (_, i) => ano - 4 + i).filter((a) => a >= 2019)
      const sh = previos.map((a) => (somaContas(a, 6, g.rreo) > 0 ? somaContas(a, bimestre, g.rreo) / somaContas(a, 6, g.rreo) : NaN)).filter(Number.isFinite)
      const real = somaContas(ano, 6, g.rreo)
      if (!sh.length || real <= 0) return { ano, erro: null }
      const proj = somaContas(ano, bimestre, g.rreo) / (sh.reduce((s, x) => s + x, 0) / sh.length)
      return { ano, erro: (proj / real - 1) * 100 }
    })
    const v = erros.map((e) => e.erro).filter((e): e is number => e !== null)
    return { id: g.id, rotulo: g.rotulo, erros, erroMedio: v.length ? v.reduce((s, x) => s + Math.abs(x), 0) / v.length : null }
  })
  return { grupos: feitos.slice(0, -1), total: feitos[feitos.length - 1], bimestre }
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

/** Conferência do ano fechado mais recente: o quadro da PLOA, o Portal (bruto e líquido) e o RREO (líquido), linha a linha. */
export type LinhaConciliacao = { chave: string; cod: string; rotulo: string; ploa: number | null; portalBruto: number; rreo: number | null; portalLiquido: number }
export function conciliacao(dados: DadosReceita, quadro: Record<string, number[]>, ano = 2025): LinhaConciliacao[] {
  const linhas = dados.anos[String(ano)]?.linhas ?? []
  /** posição do ano nos seis valores do quadro da PLOA (2023, 2024, 2025, ...) */
  const col = ano - 2023
  const soma = (pref: string[], liquido: boolean, exclui: string[] = []) =>
    linhas.filter((l) => pref.some((p) => naturezaDe(l).startsWith(p)) && !exclui.some((p) => naturezaDe(l).startsWith(p))).reduce((s, l) => s + Number(l[3]) + (liquido ? Number(l[4]) : 0), 0)
  const rreo = (cs: string[]) => somaContas(ano, 6, cs)
  const def: { chave: string; cod: string; rotulo: string; q: string[]; pref: string[]; rreo?: string[] }[] = [
    { chave: 'impostos', cod: '1.1.1', rotulo: 'Impostos', q: ['impostos'], pref: ['111'], rreo: ['Impostos'] },
    { chave: 'icms', cod: '1.1.1.4', rotulo: 'ICMS', q: ['icms'], pref: ['1114'] },
    { chave: 'ipva', cod: '1.1.1.2.51', rotulo: 'IPVA', q: ['ipva'], pref: ['111251'] },
    { chave: 'itcd', cod: '1.1.1.2.52', rotulo: 'ITCD', q: ['itcd'], pref: ['111252'] },
    { chave: 'irrf', cod: '1.1.1.3.03', rotulo: 'IRRF', q: ['irrf'], pref: ['111303'] },
    { chave: 'taxas', cod: '1.1.2–1.1.3', rotulo: 'Taxas e contribuição de melhoria', q: ['taxas', 'contrib_melhoria'], pref: ['112', '113'], rreo: ['Taxas'] },
    { chave: 'contrib', cod: '1.2', rotulo: 'Contribuições', q: ['contribuicoes'], pref: ['12'], rreo: ['CONTRIBUIÇÕES'] },
    { chave: 'patrim', cod: '1.3', rotulo: 'Receita patrimonial', q: ['patrimonial'], pref: ['13'], rreo: ['RECEITA PATRIMONIAL'] },
    { chave: 'servicos', cod: '1.4–1.6', rotulo: 'Agropecuária, industrial e serviços', q: ['agropecuaria', 'industrial', 'servicos'], pref: ['14', '15', '16'], rreo: ['RECEITA AGROPECUÁRIA', 'RECEITA INDUSTRIAL', 'RECEITA DE SERVIÇOS'] },
    { chave: 'transf', cod: '1.7', rotulo: 'Transferências correntes', q: ['transf_correntes'], pref: ['17'], rreo: ['TRANSFERÊNCIAS CORRENTES'] },
    { chave: 'outras', cod: '1.9', rotulo: 'Outras receitas correntes', q: ['outras_correntes'], pref: ['19'], rreo: ['OUTRAS RECEITAS CORRENTES'] },
    { chave: 'intra', cod: '7', rotulo: 'Correntes intraorçamentárias', q: ['intra'], pref: ['7', '8'], rreo: ['RECEITAS (INTRA-ORÇAMENTÁRIAS) (II)'] },
    { chave: 'cred', cod: '2.1', rotulo: 'Operações de crédito', q: ['operacoes_credito'], pref: ['21'], rreo: ['OPERAÇÕES DE CRÉDITO'] },
    { chave: 'capout', cod: '2.2–2.4, 2.9', rotulo: 'Alienação, amortizações, transferências e outras de capital', q: ['alienacao', 'amortizacao_emprestimos', 'transf_capital', 'outras_capital'], pref: ['22', '23', '24', '25', '29'], rreo: ['ALIENAÇÃO DE BENS', 'AMORTIZAÇÕES DE EMPRÉSTIMOS', 'TRANSFERÊNCIAS DE CAPITAL', 'OUTRAS RECEITAS DE CAPITAL'] },
  ]
  const out: LinhaConciliacao[] = def.map((d) => ({
    chave: d.chave, cod: d.cod, rotulo: d.rotulo,
    ploa: d.q.reduce((s, k) => s + (quadro[k]?.[col] ?? 0), 0),
    portalBruto: soma(d.pref, false), portalLiquido: soma(d.pref, true), rreo: d.rreo ? rreo(d.rreo) : null,
  }))
  const totalLinhas = linhas.reduce((s, l) => s + Number(l[3]), 0)
  out.push({ chave: 'ded', cod: '9', rotulo: 'Deduções (municípios, Fundeb e outras)', ploa: quadro.deducoes?.[col] ?? 0, portalBruto: linhas.reduce((s, l) => s + Number(l[4]), 0), rreo: null, portalLiquido: 0 })
  out.push({ chave: 'total', cod: '', rotulo: 'Receita líquida total', ploa: quadro.total?.[col] ?? 0, portalBruto: totalLinhas + linhas.reduce((s, l) => s + Number(l[4]), 0), rreo: rreo(TOTAL_RREO), portalLiquido: totalLinhas + linhas.reduce((s, l) => s + Number(l[4]), 0) })
  return out
}

/* ---------- principais fontes: ICMS, cota-parte do FPE e compensação pela produção de petróleo ---------- */

export type IdFonte = 'icms' | 'fpe' | 'petroleo'
export const FONTES: { id: IdFonte; rotulo: string; cod: string; prefixo: string }[] = [
  { id: 'icms', rotulo: 'ICMS', cod: '1.1.1.4', prefixo: '1114' },
  { id: 'fpe', rotulo: 'Cota-parte do FPE', cod: '1.7.1.1', prefixo: '171150' },
  { id: 'petroleo', rotulo: 'Petróleo (compensação financeira)', cod: '1.7.1.2', prefixo: '171252' },
]
type SerieMensal = Record<string, number>
const chaveMes = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}`

/** Série mensal bruta da fonte: histórico do RREO (Anexo 03) para ICMS e FPE, completado e conferido pelo Portal; só o Portal para o petróleo (2025 em diante). */
export function serieFonte(dados: DadosReceita, id: IdFonte): SerieMensal {
  const def = FONTES.find((f) => f.id === id)!
  const { ultimo } = mesesCorte(dados)
  const s: SerieMensal = {}
  if (id !== 'petroleo') Object.assign(s, (rreoRaw as unknown as { mensal: Record<string, SerieMensal> }).mensal[id])
  // o Portal é a referência de 2025 e 2026 (coincide com o RREO): reconstrói esses meses somando as linhas
  const somaPortal: SerieMensal = {}
  for (const ano of [2025, 2026]) {
    for (const l of dados.anos[String(ano)]?.linhas ?? []) {
      const m = Number(l[0])
      if (ano === 2026 && m > ultimo) continue
      if (String(l[1]).startsWith(def.prefixo)) somaPortal[chaveMes(ano, m)] = (somaPortal[chaveMes(ano, m)] ?? 0) + Number(l[3])
    }
  }
  Object.assign(s, somaPortal)
  return s
}

const val = (s: SerieMensal, a: number, m: number) => s[chaveMes(a, m)] ?? 0
const acum = (s: SerieMensal, a: number, ate: number) => Array.from({ length: ate }, (_, i) => val(s, a, i + 1)).reduce((x, y) => x + y, 0)
const totalAno = (s: SerieMensal, a: number) => acum(s, a, 12)
/** soma dos doze meses que terminam em (a, n) */
const ult12 = (s: SerieMensal, a: number, n: number) => {
  let t = 0
  for (let k = 0; k < 12; k++) { let mm = n - k, aa = a; if (mm <= 0) { mm += 12; aa -= 1 }; t += val(s, aa, mm) }
  return t
}

export type ResultadoMetodos = {
  sazonal?: number
  ritmo3m?: number
  ritmoAno?: number
  ritmo12m?: number
  g3m?: number
  gAno?: number
  g12m?: number
}

/**
 * Quatro projeções de fechamento do ano `a` com os meses até `n` conhecidos:
 *  - sazonal: acumulado ÷ participação média do mesmo período nos até quatro anos anteriores;
 *  - ritmo3m: acumulado + meses restantes do ano anterior × (1 + crescimento dos três últimos meses sobre o mesmo trimestre do ano anterior);
 *  - ritmoAno: igual, com o crescimento do acumulado do ano;
 *  - ritmo12m: igual, com o crescimento dos doze últimos meses sobre os doze anteriores.
 * O ritmo recente capta desaceleração ou aceleração dentro do ano, que a sazonalidade, por construção, não vê.
 */
export function projetaMetodos(s: SerieMensal, a: number, n: number, primeiroAno = 2019): ResultadoMetodos {
  const prev = a - 1
  const restoPrev = Array.from({ length: 12 - n }, (_, i) => val(s, prev, n + 1 + i)).reduce((x, y) => x + y, 0)
  const ytd = acum(s, a, n)
  const trimAtual = [n - 2, n - 1, n].reduce((t, m) => t + val(s, a, m), 0)
  const trimPrev = [n - 2, n - 1, n].reduce((t, m) => t + val(s, prev, m), 0)
  const out: ResultadoMetodos = {}
  const anosPrev = Array.from({ length: 4 }, (_, i) => a - 4 + i).filter((y) => y >= primeiroAno && totalAno(s, y) > 0)
  if (anosPrev.length >= 2) {
    const sh = anosPrev.map((y) => acum(s, y, n) / totalAno(s, y))
    out.sazonal = ytd / (sh.reduce((x, y) => x + y, 0) / sh.length)
  }
  if (trimPrev > 0 && acum(s, prev, n) > 0) {
    out.g3m = trimAtual / trimPrev - 1
    out.gAno = ytd / acum(s, prev, n) - 1
    out.ritmo3m = ytd + restoPrev * (1 + out.g3m)
    out.ritmoAno = ytd + restoPrev * (1 + out.gAno)
  }
  if (ult12(s, prev, n) > 0 && a - 2 >= primeiroAno) {
    out.g12m = ult12(s, a, n) / ult12(s, prev, n) - 1
    out.ritmo12m = ytd + restoPrev * (1 + out.g12m)
  }
  return out
}

export const NOMES_METODO: Record<'sazonal' | 'ritmo3m' | 'ritmoAno' | 'ritmo12m', string> = {
  sazonal: 'Sazonalidade (média de 4 anos)',
  ritmo3m: 'Ritmo dos 3 últimos meses',
  ritmoAno: 'Ritmo do acumulado do ano',
  ritmo12m: 'Ritmo dos 12 últimos meses',
}
type IdMetodo = keyof typeof NOMES_METODO
const METODOS: IdMetodo[] = ['sazonal', 'ritmo3m', 'ritmoAno', 'ritmo12m']

/** Teste retroativo dos quatro métodos para ICMS e FPE (séries com história): projeção feita com os dados até outubro de cada ano de 2021 a 2025. */
export function retrotesteFonte(dados: DadosReceita, id: 'icms' | 'fpe', n = 10): { metodo: IdMetodo; erros: { ano: number; erro: number }[]; mae: number }[] {
  const s = serieFonte(dados, id)
  return METODOS.map((m) => {
    const erros = [2021, 2022, 2023, 2024, 2025].map((ano) => {
      const p = projetaMetodos(s, ano, n)[m]
      return { ano, erro: p === undefined ? NaN : (p / totalAno(s, ano) - 1) * 100 }
    }).filter((e) => Number.isFinite(e.erro))
    return { metodo: m, erros, mae: erros.reduce((t, e) => t + Math.abs(e.erro), 0) / (erros.length || 1) }
  })
}

export type AnaliseFonte = {
  id: IdFonte
  rotulo: string
  cod: string
  /** participação na receita bruta de 2025 */
  participacao: number
  acum25: number
  acum26: number
  /** crescimento mês a mês sobre o mesmo mês de 2025, de janeiro ao mês de corte (%) */
  yoy: (number | null)[]
  g3m: number | undefined
  gAno: number | undefined
  metodos: ResultadoMetodos
  /** método escolhido (o de menor erro no teste retroativo, quando há história) e o fechamento por ele */
  escolhido: IdMetodo
  central: number
  min: number
  max: number
  fechou2025: number
  retro?: { metodo: IdMetodo; mae: number }[]
}

export function analisaFontes(dados: DadosReceita): AnaliseFonte[] {
  const { ultimo } = mesesCorte(dados)
  const brutoTotal25 = (dados.anos['2025']?.linhas ?? []).reduce((t, l) => t + Number(l[3]), 0)
  return FONTES.map((f) => {
    const s = serieFonte(dados, f.id)
    const metodos = projetaMetodos(s, 2026, ultimo)
    const retro = f.id === 'petroleo' ? undefined : retrotesteFonte(dados, f.id, ultimo).map((r) => ({ metodo: r.metodo, mae: r.mae }))
    const disponiveis = METODOS.filter((m) => metodos[m] !== undefined)
    const melhor = retro ? [...retro].filter((r) => metodos[r.metodo] !== undefined).sort((a, b) => a.mae - b.mae)[0]?.metodo : undefined
    const escolhido: IdMetodo = melhor ?? 'ritmo3m'
    const valores = disponiveis.map((m) => metodos[m] as number)
    return {
      id: f.id, rotulo: f.rotulo, cod: f.cod,
      participacao: (acum(s, 2025, 12) / brutoTotal25), acum25: acum(s, 2025, ultimo), acum26: acum(s, 2026, ultimo),
      yoy: Array.from({ length: ultimo }, (_, i) => (val(s, 2025, i + 1) > 0 ? (val(s, 2026, i + 1) / val(s, 2025, i + 1) - 1) * 100 : null)),
      g3m: metodos.g3m, gAno: metodos.gAno, metodos, escolhido, central: metodos[escolhido] as number,
      min: Math.min(...valores), max: Math.max(...valores), fechou2025: totalAno(s, 2025), retro,
    }
  })
}

/** Transferências da União: o que a PLOA precisa supor para o petróleo, dado o FPE e as demais transferências da União crescendo com o parâmetro informado. */
export function implicitoPetroleo(dados: DadosReceita, analise: AnaliseFonte[], tUniao2027: number, crescimento: number) {
  const { ultimo } = mesesCorte(dados)
  const linhas = (ano: number) => dados.anos[String(ano)]?.linhas ?? []
  const mensalOutras = (ano: number) => {
    const s: SerieMensal = {}
    for (const l of linhas(ano)) {
      const m = Number(l[0]); const nat = String(l[1])
      if (ano === 2026 && m > ultimo) continue
      if (nat.startsWith('171') && !nat.startsWith('171150') && !nat.startsWith('171252')) s[chaveMes(ano, m)] = (s[chaveMes(ano, m)] ?? 0) + Number(l[3])
    }
    return s
  }
  const outras = { ...mensalOutras(2025), ...mensalOutras(2026) }
  const mo = projetaMetodos(outras, 2026, ultimo)
  const outras26 = mo.ritmo3m ?? mo.ritmoAno ?? NaN
  const fpe = analise.find((a) => a.id === 'fpe')!, pet = analise.find((a) => a.id === 'petroleo')!
  const fpe27 = fpe.central * (1 + crescimento)
  const outras27 = outras26 * (1 + crescimento)
  const implicito = tUniao2027 - fpe27 - outras27
  return { fpe27, outras26, outras27, implicito, petroleo26: pet.central, petroleo25: pet.fechou2025 }
}


/* ---------- ritmo e projeção de fechamento da despesa ---------- */
type RitmoDespesaDados = { anos: Record<string, Record<string, { empenhada: Record<string, number>; liquidada: Record<string, number> }>> }
const ritmoDesp = ritmoDespRaw as unknown as RitmoDespesaDados
export const ANOS_SAZONAL_DESPESA = [2022, 2023, 2024, 2025]
const GRUPOS_DESPESA = ['pessoal', 'juros', 'outras_correntes', 'investimento', 'inversoes', 'amortizacao'] as const
/** chave da linha do quadro de grandes grupos da Visão geral → chave do quadro da PLOA */
const CHAVE_DESPESA: Record<string, string> = { pessoal: 'pessoal', juros: 'juros', outras: 'outras_correntes', inv: 'investimento', invf: 'inversoes', amort: 'amortizacao' }

export type ProjecaoDespesa = { itens: Record<string, ItemProjetado>; bimestre: number; acumulado: number; acumulado25: number }

/**
 * Projeção de fechamento da despesa empenhada de 2026 por grupo de natureza: despesa acumulada até o bimestre mais recente (RREO, Anexo 01)
 * dividida pela fração que o mesmo período costuma representar no ano (média de 2022 a 2025; mínimo e máximo dão a faixa).
 * O RREO traz a despesa exceto intraorçamentária; para ficar na base dos quadros da PLOA, cada grupo é multiplicado pela razão entre o
 * valor de 2025 no quadro da PLOA e o de 2025 no RREO. Reservas não são executadas, então entram com zero.
 */
export function projetaDespesa2026(): ProjecaoDespesa {
  const anoCorrente = ritmoDesp.anos['2026']
  const bim = Number(Object.keys(anoCorrente)[0])
  const macro = Object.fromEntries((despesaMacroRaw as unknown as { despesa: { chave: string; valores: number[] }[] }).despesa.map((x) => [x.chave, x.valores]))
  const grupo = (g: string) => {
    const acum = anoCorrente[String(bim)].empenhada[g]
    const fr = ANOS_SAZONAL_DESPESA.map((a) => ritmoDesp.anos[String(a)][String(bim)].empenhada[g] / ritmoDesp.anos[String(a)]['6'].empenhada[g])
    const media = fr.reduce((x, y) => x + y, 0) / fr.length
    const fator = macro[g][2] / ritmoDesp.anos['2025']['6'].empenhada[g]
    return { central: (acum / media) * fator, min: (acum / Math.max(...fr)) * fator, max: (acum / Math.min(...fr)) * fator }
  }
  const itens: Record<string, ItemProjetado> = {}
  for (const [chave, g] of Object.entries(CHAVE_DESPESA)) itens[chave] = { ...grupo(g), base: 'bimestres' }
  const soma = (cs: string[]): ItemProjetado => ({
    central: cs.reduce((x, c) => x + itens[c].central, 0),
    min: cs.reduce((x, c) => x + (itens[c].min ?? 0), 0),
    max: cs.reduce((x, c) => x + (itens[c].max ?? 0), 0),
    base: 'bimestres',
  })
  itens.corr = soma(['pessoal', 'juros', 'outras'])
  itens.capd = soma(['inv', 'invf', 'amort'])
  itens.res = { central: 0, base: 'bimestres' }
  itens.tot = soma(['corr', 'capd'])
  const acumulado = GRUPOS_DESPESA.reduce((x, g) => x + anoCorrente[String(bim)].empenhada[g], 0)
  const acumulado25 = GRUPOS_DESPESA.reduce((x, g) => x + ritmoDesp.anos['2025'][String(bim)].empenhada[g], 0)
  return { itens, bimestre: bim, acumulado, acumulado25 }
}

export type RetroDespesa = { id: string; rotulo: string; erros: { ano: number; erro: number | null }[]; erroMedio: number | null }
const ROTULOS_DESPESA: Record<string, string> = { total: 'Despesa total (exceto intra)', pessoal: 'Pessoal e encargos', outras_correntes: 'Outras despesas correntes', investimento: 'Investimentos' }
/** Teste retroativo da projeção da despesa: em cada ano de 2022 a 2025, projeta com o acumulado até o 4º bimestre e as frações dos até quatro anos anteriores. */
export function retrotesteDespesa(): RetroDespesa[] {
  return Object.entries(ROTULOS_DESPESA).map(([id, rotulo]) => {
    const erros = [2022, 2023, 2024, 2025].map((ano) => {
      const fr = [1, 2, 3, 4].map((k) => ano - k).filter((a) => ritmoDesp.anos[String(a)]).map((a) => ritmoDesp.anos[String(a)]['4'].empenhada[id] / ritmoDesp.anos[String(a)]['6'].empenhada[id])
      if (!fr.length) return { ano, erro: null }
      const proj = ritmoDesp.anos[String(ano)]['4'].empenhada[id] / (fr.reduce((x, y) => x + y, 0) / fr.length)
      const real = ritmoDesp.anos[String(ano)]['6'].empenhada[id]
      return { ano, erro: (proj / real - 1) * 100 }
    })
    const v = erros.filter((e) => e.erro !== null).map((e) => Math.abs(e.erro as number))
    return { id, rotulo, erros, erroMedio: v.length ? v.reduce((x, y) => x + y, 0) / v.length : null }
  })
}
