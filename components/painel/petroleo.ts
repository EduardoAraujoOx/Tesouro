import sensRaw from '@/data/petroleo-sensibilidade.json'
import prevRaw from '@/data/brent-previsao.json'

/* Receita do petróleo do Estado em função da cotação (Brent), do câmbio e da produção: relações estimadas em scripts/analisar_petroleo.py;
   parâmetros centrais de 2027 em scripts/atualizar_brent_previsao.py (EIA e Focus). */
export type Sens = {
  royalties: { defasagem_meses: number; k: number; n: number; amostra: { n: number; de: string; ate: string }; por_defasagem: { defasagem: number; r2: number; elast_preco: number; elast_producao: number }[]; fora_da_amostra: { previsto: number; realizado: number } }
  participacao_especial: { a: number; elasticidade: number; erro_padrao_elasticidade: number; r2: number; n: number; elasticidade_ate_2025: number; fora_da_amostra: { mes: string; previsto: number; realizado: number }[] }
  icms_petroleo: { a: number; elasticidade_preco: number; r2: number; n: number }
  base_2025: { brent: number; cambio: number; producao: number; roy_exc: number; pe: number; icms_petroleo: number }
  base_2026: { brent: number; cambio: number; producao: number }
  fator_alinea_171252: number
}
export const sens = sensRaw as unknown as Sens

type Prev = {
  eia: { edicao: string; media_2026: number; media_2027: number; fonte: string }
  cambio_focus_2027: { mediana: number; data: string; respondentes: number }
  outras_previsoes_2027: { fonte: string; preco_2027: number; nota: string }[]
}
export const prev = prevRaw as unknown as Prev

/** Parâmetros centrais de 2027: Brent = média de 2027 da previsão da EIA; câmbio = mediana do Focus; produção = média de 2026 (ANP, até setembro). */
export const BRENT_CENTRAL = Math.round(prev.eia.media_2027)
export const CAMBIO_CENTRAL = prev.cambio_focus_2027.mediana
export const PRODUCAO_CENTRAL = Math.round(sens.base_2026.producao)
export const PRODUCAO_LDO = 224.5

/** Receita anual de petróleo do Estado (R$) para uma cotação (US$/bbl), um câmbio (R$/US$) e uma produção (mil bbl/d) médios. */
export function receitaPetroleo(brent: number, cambio: number, producao: number) {
  const preco = brent * cambio
  const pq = preco * producao
  const royExc = sens.royalties.k * 12 * pq
  const pe = 4 * Math.exp(sens.participacao_especial.a) * Math.pow(pq, sens.participacao_especial.elasticidade)
  const icms = sens.base_2025.icms_petroleo * Math.pow(preco / (sens.base_2025.brent * sens.base_2025.cambio), sens.icms_petroleo.elasticidade_preco)
  return { royExc, pe, transferencias: (royExc + pe) * sens.fator_alinea_171252, icms }
}

const MES_PT: Record<string, string> = { January: 'janeiro', February: 'fevereiro', March: 'março', April: 'abril', May: 'maio', June: 'junho', July: 'julho', August: 'agosto', September: 'setembro', October: 'outubro', November: 'novembro', December: 'dezembro' }
/** Edição da previsão da EIA em português, por exemplo "novembro de 2026". */
export const EDICAO_EIA = prev.eia.edicao.replace(/^(\w+) (\d{4})$/, (_, m, a) => `${MES_PT[m] ?? m} de ${a}`)
