import ploaRaw from '@/data/ploa2027.json'
import rreoRaw from '@/data/rreo.json'

/**
 * Ajustes que a votação pode acrescentar à PLOA 2027 e que a proposta enviada em 30/09/2026 não contém: dotações dos Poderes e órgãos autônomos
 * até os limites da LDO 2027 e emendas parlamentares impositivas. Ordem de grandeza, calculada a partir da LDO; não são alterações já feitas.
 */

/** Limites da LDO 2027 (Lei nº 12.967/2026, art. 21, § 1º), em % da RCL de julho de 2025 a junho de 2026 (RREO do 3º bimestre de 2026, Anexo 03): R$ 30.126,1 milhões. */
const PODERES: { uos: string[]; limite: number }[] = [
  { uos: ['01101'], limite: 1.281 }, // Assembleia Legislativa
  { uos: ['02101'], limite: 1.017 }, // Tribunal de Contas
  { uos: ['03101', '03901'], limite: 6.131 }, // Tribunal de Justiça e fundo especial
  { uos: ['05101', '05902'], limite: 2.456 }, // Ministério Público e fundo especial
  { uos: ['06101', '06901'], limite: 0.75 }, // Defensoria Pública e fundo
]
const RCL_JUL25_JUN26 = 30126.1e6
/** Emendas impositivas: 1,55% da RCL de 2025 (Emenda Constitucional 120/2026), das quais R$ 90 milhões já constam como reserva na PLOA. */
const PCT_EMENDAS = 0.0155
const RESERVA_EMENDAS = 90e6

export type AjustesVotacao = { poderes: number; emendas: number }

export function ajustesVotacao(): AjustesVotacao {
  const b = ploaRaw as unknown as { colunas: string[]; linhas: (string | number)[][] }
  const ic = Object.fromEntries(b.colunas.map((c, i) => [c, i]))
  const dotacao = (uos: string[]) => b.linhas.filter((r) => uos.includes(String(r[ic.uo]).padStart(5, '0'))).reduce((t, r) => t + Number(r[ic.valor]), 0)
  /* só os Poderes abaixo do limite entram: o que está acima (hoje, o Tribunal de Justiça) não é reduzido por este cálculo */
  const poderes = PODERES.reduce((t, p) => t + Math.max((p.limite / 100) * RCL_JUL25_JUN26 - dotacao(p.uos), 0), 0)
  const rcl25 = (rreoRaw as unknown as { serie: { ano: number; rcl12m: number }[] }).serie.find((s) => s.ano === 2025)?.rcl12m ?? 0
  return { poderes, emendas: Math.max(rcl25 * PCT_EMENDAS - RESERVA_EMENDAS, 0) }
}
