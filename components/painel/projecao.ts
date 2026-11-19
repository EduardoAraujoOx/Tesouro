import rreoRaw from '@/data/rreo.json'

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

export type Projecao = {
  /** último mês completo usado (1 a 12) */
  ultimo: number
  acumulado: number
  acumulado25: number
  /** participação de jan..último mês no total de 2025 */
  participacao: number
  central: number
  min: number
  max: number
  /** participação de jan..mês do ICMS em cada ano fechado, para mostrar a estabilidade da sazonalidade */
  sazonalidadeIcms: { ano: number; participacao: number }[]
  mesesIcms: number
}

/**
 * Projeção de fechamento da receita líquida de 2026: arrecadação acumulada ÷ participação desses meses em 2025.
 * A faixa vem da variação histórica (2022 a 2025) da participação de jan..último mês na arrecadação anual de ICMS (principal tributo),
 * aplicada à projeção central: mostra quanto a conclusão muda se a sazonalidade de 2026 fosse a de outro ano.
 */
export function projetaReceita2026(dados: DadosReceita): Projecao {
  const coleta = new Date(dados.coletado_em)
  const ultimo = Math.max(1, Math.min(12, coleta.getMonth() + (coleta.getDate() >= 28 ? 1 : 0)))
  const liq25 = porMes(dados.anos['2025']?.linhas ?? [], 'liq')
  const liq26 = porMes(dados.anos['2026']?.linhas ?? [], 'liq')
  const acumulado = soma(liq26, ultimo)
  const acumulado25 = soma(liq25, ultimo)
  const participacao = acumulado25 / soma(liq25)
  const central = acumulado / participacao

  const icms = (rreoRaw as unknown as { mensal: { icms: Record<string, number> } }).mensal.icms
  const mes = (a: number, ate: number) => Array.from({ length: ate }, (_, i) => icms[`${a}-${String(i + 1).padStart(2, '0')}`] ?? 0).reduce((s, x) => s + x, 0)
  let mesesIcms = 0
  for (let m = 1; m <= 12; m++) if (icms[`2026-${String(m).padStart(2, '0')}`] !== undefined) mesesIcms = m
  const sazonalidadeIcms = [2022, 2023, 2024, 2025].map((ano) => ({ ano, participacao: mes(ano, mesesIcms) / mes(ano, 12) }))
  const base = sazonalidadeIcms.find((s) => s.ano === 2025)!.participacao
  const fatores = sazonalidadeIcms.map((s) => base / s.participacao)
  return { ultimo, acumulado, acumulado25, participacao, central, min: central * Math.min(...fatores), max: central * Math.max(...fatores), sazonalidadeIcms, mesesIcms }
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
