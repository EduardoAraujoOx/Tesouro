import type { LinhaCompacta } from '@/lib/orcamento'

export type Linha = LinhaCompacta
/** [ploa2027, inicial26, atualizada26, empenhado26, liquidado26, pago26, empenhado25, atualizada25] */
export type Soma = [number, number, number, number, number, number, number, number]
export type Item = { chave: string; rotulo: string; sub?: string; v: Soma }

export const PLOA = 0, INI = 1, ATU = 2, EMP = 3, LIQ = 4, PAGO = 5, EMP25 = 6, ATU25 = 7

export const zero = (): Soma => [0, 0, 0, 0, 0, 0, 0, 0]

export function agrupa(ls: Linha[], chave: (l: Linha) => string): Map<string, Soma> {
  const m = new Map<string, Soma>()
  for (const l of ls) {
    const k = chave(l)
    let s = m.get(k)
    if (!s) { s = zero(); m.set(k, s) }
    for (let i = 0; i < 8; i++) s[i] += l[5 + i] as number
  }
  return m
}

export const total = (ls: Linha[]): Soma => {
  const s = zero()
  for (const l of ls) for (let i = 0; i < 8; i++) s[i] += l[5 + i] as number
  return s
}

/** PLOA em relação à dotação atualizada de 2026, em %; null quando não há base. */
export const variacaoPct = (v: Soma) => (v[ATU] > 0 ? ((v[PLOA] - v[ATU]) / v[ATU]) * 100 : null)
export const execucaoPct = (v: Soma) => (v[ATU] > 0 ? (v[EMP] / v[ATU]) * 100 : null)

const MINUSCULAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para', 'por', 'com', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'à', 'às', 'p/', 'c/']
const SIGLAS = ['ES', 'PPA', 'RAP', 'FES', 'SUS', 'FNDE', 'FUNDEB', 'RPPS', 'IPAJM', 'TIC', 'GND', 'UTI', 'IASES', 'ICMS', 'IPVA', 'MG', 'RJ', 'PM', 'TJ', 'CBMES', 'DER', 'DETRAN', 'IDAF', 'IEMA', 'INCAPER', 'ADERES', 'CESAN', 'BANDES', 'FUNDAP', 'SEFAZ', 'PGE', 'ALES', 'TCE', 'MP']

/** Nomes do orçamento vêm em caixa alta: devolve em título, mantendo siglas e preposições. */
export function titulo(s: string): string {
  if (!s) return s
  let r = s.toLowerCase().replace(/(^|[\s\-(/])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase())
  r = r.replace(new RegExp(`(?<=\\s)(${MINUSCULAS.map((x) => x.replace('/', '\\/')).join('|')})(?=\\s)`, 'giu'), (m) => m.toLowerCase())
  r = r.replace(new RegExp(`(?<![\\p{L}\\p{N}])(${SIGLAS.join('|')})(?![\\p{L}\\p{N}])`, 'giu'), (m) => m.toUpperCase())
  return r
}
