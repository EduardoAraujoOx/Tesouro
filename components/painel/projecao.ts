import rreoRaw from '@/data/rreo.json'
import ritmoRaw from '@/data/ritmo-receita.json'
import despesaMensalRaw from '@/data/despesa-mensal.json'
import sefazRaw from '@/data/receita-sefaz.json'
import pibRaw from '@/data/pib-receita.json'

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

/** Receita de petróleo de 2027 no cenário base da LDO (Lei 12.967/2026, Anexo de Riscos Fiscais, p. 52): Brent a US$ 60, câmbio de R$ 5,40 e 224,5 mil barris por dia (royalties 693,8, participação especial 527,2 e Fundo do Petróleo 19,8, em R$ milhões). */
export const PETROLEO_LDO_2027 = 1240.8e6

export type ItemProjetado = {
  central: number; min?: number; max?: number
  base: 'bimestres' | 'icms' | 'mensal' | '2025' | 'resíduo'
  /** parte do fechamento que é receita pontual (não recorrente) já realizada; a referência de 2027 não a repete */
  pontual?: number
}

/* Receita bruta acumulada no ano por natureza e mês, 2023 em diante (demonstrativo mensal da SEFAZ): três anos fechados de sazonalidade. */
const sefaz = (sefazRaw as unknown as { meses: Record<string, Record<string, number>> }).meses
const ANOS_SEFAZ = [2023, 2024, 2025]
const acumSefaz = (ano: number, mes: number, cod: string) => sefaz[`${ano}-${String(mes).padStart(2, '0')}`]?.[cod] ?? 0
/** Fração do ano já arrecadada até o mês, em cada ano fechado, para a soma de `somar` menos a soma de `menos` (códigos de natureza). */
function sazonalSefaz(mes: number, somar: string[], menos: string[] = []): number[] {
  const at = (a: number, m: number) => somar.reduce((s, c) => s + acumSefaz(a, m, c), 0) - menos.reduce((s, c) => s + acumSefaz(a, m, c), 0)
  return ANOS_SEFAZ.map((a) => (at(a, 12) > 0 ? at(a, mes) / at(a, 12) : NaN)).filter((x) => Number.isFinite(x) && x > 0)
}
function projetaPorSazonal(ytd: number, sh: number[]): { central: number; min: number; max: number } {
  const media = sh.reduce((x, y) => x + y, 0) / sh.length
  return { central: ytd / media, min: ytd / Math.max(...sh), max: ytd / Math.min(...sh) }
}

/**
 * Projeção bruta de fechamento de 2026 para as linhas do quadro da PLOA (que é bruto das deduções), pela mesma regra.
 *  - grupos do RREO: sazonalidade líquida de 2022 a 2025 aplicada ao acumulado bruto;
 *  - ICMS: sazonalidade mensal de 2022 a 2025 (RREO, Anexo 03), aplicada à arrecadação bruta de ICMS do Portal;
 *  - IPVA, IRRF e ITCD: sazonalidade de 2023 a 2025 do demonstrativo mensal da SEFAZ (o Portal só tem mês a mês de 2025 em diante);
 *  - demais receitas correntes: a parte recorrente pela sazonalidade da SEFAZ; indenizações, restituições e ressarcimentos (espécie 192, pontuais) entram como realizados;
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

  // IPVA, IRRF, ITCD: sazonalidade de 2023 a 2025 (demonstrativo mensal da SEFAZ), com faixa pelas frações extremas
  for (const [id, pref] of [['ipva', '111251'], ['irrf', '111303'], ['itcd', '111252']] as const) {
    out[id] = { ...projetaPorSazonal(bruto(linhas26, r.meses, [pref]), sazonalSefaz(r.meses, [pref])), base: 'mensal' }
  }
  // demais receitas correntes: parte recorrente pela sazonalidade; espécie 192 (indenizações, restituições e ressarcimentos) é pontual
  const ytdDemais = bruto(linhas26, r.meses, ['14', '15', '16', '19'])
  const pontual = bruto(linhas26, r.meses, ['192'])
  const demaisRec = projetaPorSazonal(ytdDemais - pontual, sazonalSefaz(r.meses, ['19', '16', '15', '14'], ['192']))
  out.demais = { central: demaisRec.central + pontual, min: demaisRec.min + pontual, max: demaisRec.max + pontual, base: 'mensal', pontual }
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
type MensalAno = { ultimo_dia: string; meses_completos: number; gnd: Record<string, number[][]>; ate_ultimo_dia: Record<string, number[]> }
const despMensal = (despesaMensalRaw as unknown as { anos: Record<string, MensalAno> }).anos
export const ANOS_SAZONAL_DESPESA = [2022, 2023, 2024, 2025]
/** chave da linha do quadro de grandes grupos da Visão geral → grupo de natureza da despesa (GND) do Portal */
const GND_DESPESA: Record<string, string> = { pessoal: '1', juros: '2', outras: '3', inv: '4', invf: '5', amort: '6' }
/** Despesas que seguem calendário de pagamento (folha, serviço da dívida): medidas pela liquidação, porque o momento do empenho varia de ano a ano. */
const CALENDARIO_DESPESA = new Set(['pessoal', 'juros', 'amort'])
const EMP = 0, LIQ = 1

export type ProjecaoDespesa = { itens: Record<string, ItemProjetado>; mesCorte: number; ultimoDia: string; acumulado: number; acumulado25: number; observado: number }

/** Acumulado no ano ao fim do mês m (1 a 12) de um grupo, na medida i (0 empenhada, 1 liquidada). */
const acumDesp = (ano: number, gnd: string, m: number, i: number) => despMensal[String(ano)].gnd[gnd][m - 1][i]

/**
 * Projeção do fechamento de um grupo no ano `ano`, feita ao fim do mês `m` com as frações dos anos `base`.
 * Por empenho: acumulado empenhado ÷ fração média do ano já empenhada na mesma data. Por liquidação: acumulado liquidado ÷ fração média já liquidada,
 * vezes a razão média entre empenho e liquidação no fim do ano. Para folha, juros e amortização vale a liquidação; para os demais, a média das duas.
 * A faixa vem das frações extremas.
 */
function projetaGrupo(chave: string, ano: number, m: number, base: number[]): { central: number; min: number; max: number } {
  const g = GND_DESPESA[chave]
  const media = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length
  const shE = base.map((a) => acumDesp(a, g, m, EMP) / acumDesp(a, g, 12, EMP))
  const shL = base.map((a) => acumDesp(a, g, m, LIQ) / acumDesp(a, g, 12, LIQ))
  const razao = media(base.map((a) => acumDesp(a, g, 12, EMP) / acumDesp(a, g, 12, LIQ)))
  const xE = acumDesp(ano, g, m, EMP), xL = acumDesp(ano, g, m, LIQ)
  const pE = (f: number) => xE / f
  const pL = (f: number) => (xL / f) * razao
  if (CALENDARIO_DESPESA.has(chave)) return { central: pL(media(shL)), min: pL(Math.max(...shL)), max: pL(Math.min(...shL)) }
  return {
    central: (pE(media(shE)) + pL(media(shL))) / 2,
    min: (pE(Math.max(...shE)) + pL(Math.max(...shL))) / 2,
    max: (pE(Math.min(...shE)) + pL(Math.min(...shL))) / 2,
  }
}

function itensDespesa(ano: number, m: number, base: number[]): Record<string, ItemProjetado> {
  const itens: Record<string, ItemProjetado> = {}
  for (const chave of Object.keys(GND_DESPESA)) itens[chave] = { ...projetaGrupo(chave, ano, m, base), base: 'mensal' }
  const soma = (cs: string[]): ItemProjetado => ({
    central: cs.reduce((x, c) => x + itens[c].central, 0),
    min: cs.reduce((x, c) => x + (itens[c].min ?? 0), 0),
    max: cs.reduce((x, c) => x + (itens[c].max ?? 0), 0),
    base: 'mensal',
  })
  itens.corr = soma(['pessoal', 'juros', 'outras'])
  itens.capd = soma(['inv', 'invf', 'amort'])
  itens.res = { central: 0, base: 'mensal' }
  itens.tot = soma(['corr', 'capd'])
  return itens
}

/**
 * Projeção de fechamento da despesa empenhada de 2026 por grupo de natureza, a partir dos lançamentos diários do Portal de Dados Abertos
 * (mesma base dos quadros da PLOA, que inclui a despesa intraorçamentária), medida ao fim do último mês fechado e comparada com a mesma data de 2022 a 2025.
 * Reservas não são executadas, então entram com zero.
 */
export function projetaDespesa2026(): ProjecaoDespesa {
  const a26 = despMensal['2026']
  const m = a26.meses_completos
  const itens = itensDespesa(2026, m, ANOS_SAZONAL_DESPESA)
  const soma = (ano: number) => Object.values(GND_DESPESA).reduce((x, g) => x + acumDesp(ano, g, m, EMP), 0)
  const observado = Object.values(GND_DESPESA).reduce((x, g) => x + a26.ate_ultimo_dia[g][EMP], 0)
  return { itens, mesCorte: m, ultimoDia: a26.ultimo_dia, acumulado: soma(2026), acumulado25: soma(2025), observado }
}

/**
 * Razão entre o fechamento projetado de 2026 e o empenhado até o último dia disponível, por GND (chave: código do GND). Serve para levar a projeção
 * do grupo às unidades e ações: o fechamento de cada linha é o seu empenhado até a data vezes a razão do seu grupo de natureza. Reserva (GND 9) não é executada.
 */
export function razoesFechamento2026(): Record<string, number> {
  const p = projetaDespesa2026()
  const a26 = despMensal['2026']
  const out: Record<string, number> = { '9': 0 }
  for (const [chave, g] of Object.entries(GND_DESPESA)) out[g] = p.itens[chave].central / a26.ate_ultimo_dia[g][EMP]
  return out
}

export type RetroDespesa = { id: string; rotulo: string; erros: { ano: number; erro: number | null }[]; erroMedio: number | null }
const ROTULOS_DESPESA: Record<string, string> = { tot: 'Despesa total', pessoal: 'Pessoal e encargos', outras: 'Outras despesas correntes', inv: 'Investimentos' }
/** Teste retroativo da projeção da despesa: em cada ano de 2022 a 2025, projeta ao fim do mesmo mês de corte com as frações dos até quatro anos anteriores (a partir de 2019). */
export function retrotesteDespesa(): RetroDespesa[] {
  const m = despMensal['2026'].meses_completos
  const real = (ano: number, chave: string) => (chave === 'tot' ? Object.values(GND_DESPESA) : [GND_DESPESA[chave]]).reduce((x, g) => x + acumDesp(ano, g, 12, EMP), 0)
  return Object.entries(ROTULOS_DESPESA).map(([id, rotulo]) => {
    const erros = [2022, 2023, 2024, 2025].map((ano) => {
      const base = [1, 2, 3, 4].map((k) => ano - k).filter((a) => despMensal[String(a)])
      if (!base.length) return { ano, erro: null }
      const proj = itensDespesa(ano, m, base)[id].central
      return { ano, erro: (proj / real(ano, id) - 1) * 100 }
    })
    const v = erros.filter((e) => e.erro !== null).map((e) => Math.abs(e.erro as number))
    return { id, rotulo, erros, erroMedio: v.length ? v.reduce((x, y) => x + y, 0) / v.length : null }
  })
}

export type RetroSefaz = { id: string; rotulo: string; erros: { ano: number; erro: number | null }[]; erroMedio: number | null }
/** Teste retroativo das linhas projetadas pela sazonalidade do demonstrativo da SEFAZ: projeção feita em outubro com as frações dos anos anteriores disponíveis (2023 em diante). */
export function retrotesteSefaz(): RetroSefaz[] {
  const linhas: { id: string; rotulo: string; somar: string[]; menos: string[] }[] = [
    { id: 'ipva', rotulo: 'IPVA', somar: ['111251'], menos: [] },
    { id: 'irrf', rotulo: 'IRRF', somar: ['111303'], menos: [] },
    { id: 'itcd', rotulo: 'ITCD', somar: ['111252'], menos: [] },
    { id: 'demais', rotulo: 'Demais receitas correntes, parte recorrente', somar: ['19', '16', '15', '14'], menos: ['192'] },
  ]
  const at = (a: number, m: number, l: (typeof linhas)[number]) => l.somar.reduce((s, c) => s + acumSefaz(a, m, c), 0) - l.menos.reduce((s, c) => s + acumSefaz(a, m, c), 0)
  return linhas.map((l) => {
    const erros = [2024, 2025].map((ano) => {
      const fr = ANOS_SEFAZ.filter((p) => p < ano).map((p) => at(p, 10, l) / at(p, 12, l))
      if (!fr.length) return { ano, erro: null }
      return { ano, erro: (at(ano, 10, l) / (fr.reduce((x, y) => x + y, 0) / fr.length) / at(ano, 12, l) - 1) * 100 }
    })
    const v = erros.filter((e) => e.erro !== null).map((e) => Math.abs(e.erro as number))
    return { id: l.id, rotulo: l.rotulo, erros, erroMedio: v.length ? v.reduce((x, y) => x + y, 0) / v.length : null }
  })
}


/* ---------- PIB e arrecadação: a referência de 2027 é coerente com a história? ---------- */
export type LinhaPib = { ano: number; pib: number; impostos: number; dif: number }
export type PibArrecadacao = { linhas: LinhaPib[]; elasticidade: number; intercepto: number; r2: number; difMedia: number; difDesvio: number; n: number }
/**
 * Crescimento anual dos impostos do ES (RREO, líquidos) contra o do PIB nominal do Brasil (Banco Central), desde 2016.
 * Elasticidade: inclinação da regressão dos log-crescimentos (1 = a arrecadação cresce junto com o PIB nominal).
 * Dif.: crescimento dos impostos menos o do PIB nominal, em pontos percentuais; o desvio mede o quanto a arrecadação se afasta do PIB de um ano para o outro.
 */
export function pibArrecadacao(): PibArrecadacao {
  const d = pibRaw as unknown as { pib_nominal: Record<string, number>; impostos: Record<string, number> }
  const anos = Object.keys(d.impostos).map(Number).sort((a, b) => a - b).filter((a) => d.impostos[String(a - 1)] && d.pib_nominal[String(a)] && d.pib_nominal[String(a - 1)])
  const linhas = anos.map((a) => ({
    ano: a,
    pib: (d.pib_nominal[String(a)] / d.pib_nominal[String(a - 1)] - 1) * 100,
    impostos: (d.impostos[String(a)] / d.impostos[String(a - 1)] - 1) * 100,
    dif: 0,
  }))
  linhas.forEach((l) => { l.dif = l.impostos - l.pib })
  const xs = linhas.map((l) => Math.log(1 + l.pib / 100)), ys = linhas.map((l) => Math.log(1 + l.impostos / 100))
  const n = xs.length
  const mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, x) => s + x, 0) / n
  const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const a0 = my - b * mx
  const sst = ys.reduce((s, y) => s + (y - my) ** 2, 0), sse = ys.reduce((s, y, i) => s + (y - (a0 + b * xs[i])) ** 2, 0)
  const difMedia = linhas.reduce((s, l) => s + l.dif, 0) / n
  const difDesvio = Math.sqrt(linhas.reduce((s, l) => s + (l.dif - difMedia) ** 2, 0) / (n - 1))
  return { linhas, elasticidade: b, intercepto: a0, r2: 1 - sse / sst, difMedia, difDesvio, n }
}
