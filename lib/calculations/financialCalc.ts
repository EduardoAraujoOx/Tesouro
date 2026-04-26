export function getEffectiveVI(colVI: number, colVIAdjusted: number | null): number {
  return colVIAdjusted !== null && colVIAdjusted !== undefined ? colVIAdjusted : colVI
}

export function getEffectiveIX(colIX: number, colIXAdjusted: number | null): number {
  return colIXAdjusted !== null && colIXAdjusted !== undefined ? colIXAdjusted : colIX
}

export interface ExecutiveColumns {
  col1: number
  col2: number
  col3: number
  col4: number
  col5: number
  col6: number
  col7: number
}

export function computeExecutiveColumns(line: {
  colI: number; colII: number; colIII: number; colIV: number; colV: number
  colVI: number; colVIAdjusted: number | null
  colVIII: number; colIX: number; colIXAdjusted: number | null
}): ExecutiveColumns {
  const VI = getEffectiveVI(line.colVI, line.colVIAdjusted)
  const IX = getEffectiveIX(line.colIX, line.colIXAdjusted)
  const col1 = line.colI
  const col2 = line.colII + line.colIII + line.colIV
  const col3 = line.colV
  const col4 = VI
  const col5 = col3 + col4
  const col6 = line.colVIII + IX
  const col7 = col5 - col6
  return { col1, col2, col3, col4, col5, col6, col7 }
}

const AMARELO_THRESHOLD = 0.05

export type TrafficLight = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA'

export function computeTrafficLight(
  col7: number,
  col1: number,
  viPreenchido: boolean,
  ixPreenchido: boolean
): TrafficLight {
  if (!viPreenchido || !ixPreenchido) return 'CINZA'
  if (col7 < 0) return 'VERMELHO'
  if (col7 <= Math.abs(col1) * AMARELO_THRESHOLD) return 'AMARELO'
  return 'VERDE'
}

export const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
