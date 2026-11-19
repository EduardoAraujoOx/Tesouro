/** Formatação de números em português do Brasil. Sem dependência de dados: pode ir para o navegador. */
export function pct(v: number | null | undefined, casas = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return 'sem dado'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).replace('-', '−') + '%'
}
export function numero(v: number | null | undefined, casas = 1): string {
  if (v === null || v === undefined) return 'sem dado'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).replace('-', '−')
}
export const bilhoes = (v: number | null | undefined) => (v === null || v === undefined ? 'sem dado' : `R$ ${numero(v / 1e9, 1)} bi`)

export const milhoes = (v: number | null | undefined, casas = 1) => {
  if (v === null || v === undefined) return 'sem dado'
  // valores simbólicos (R$ 1 mil, por exemplo) não devem aparecer como zero
  if (v !== 0 && Math.abs(v) < 0.5 * 10 ** (6 - casas)) return casas === 0 ? '< 1' : '< 0,1'
  return numero(v / 1e6, casas)
}
export const reaisMi = (v: number | null | undefined) => (v === null || v === undefined ? 'sem dado' : `R$ ${milhoes(v)} mi`)
