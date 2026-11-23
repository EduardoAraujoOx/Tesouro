import { analisaFontes, implicitoPetroleo, projecaoItens, PETROLEO_LDO_2027, type DadosReceita } from '@/components/painel/projecao'
import { BRENT_CENTRAL, CAMBIO_CENTRAL, EDICAO_EIA, PRODUCAO_CENTRAL, PRODUCAO_LDO, receitaPetroleo, sens } from '@/components/painel/petroleo'
import { parametros, type LinhaMacro } from '@/lib/macro'

/** Cenário de petróleo da LDO 2027 (Anexo de Riscos Fiscais): Brent a US$ 60, câmbio de R$ 5,40 e 224,5 mil barris por dia. */
const LDO = { brent: 60, cambio: 5.4, producao: PRODUCAO_LDO }

export type LinhaProjecao = { chave: string; rotulo: string; ploa: number | null; estimativa: number; sub?: boolean }
export type ProjecaoReceitas = {
  g27: number
  ipca27: number
  pib27: number
  brent: number
  cambio: number
  producao: number
  edicaoEia: string
  linhas: LinhaProjecao[]
  /** petróleo no cenário da LDO: o que a LDO prevê e o que o modelo da equipe dá com os mesmos parâmetros, em R$ */
  ldo: { previsto: number; modelo: number; brent: number; cambio: number; producao: number }
  /** quanto a estimativa de ICMS ficaria menor se o ICMS do petróleo seguisse o Brent menor de 2027, em R$ */
  ajusteIcmsPetroleo: number
}

/**
 * Estimativa da equipe para 2027 das maiores fontes de receita (ICMS, FPE e petróleo), ao lado do que a PLOA traz.
 * ICMS e FPE: fechamento projetado de 2026 pelos métodos do painel, atualizado pelo crescimento nominal da atividade em 2027 (IPCA e PIB do Focus).
 * Petróleo: modelo sobre a série mensal (Brent, câmbio e produção), com os parâmetros centrais de 2027; a PLOA não informa a receita de petróleo, e o valor
 * mostrado é o que sobra das transferências correntes da União depois do FPE e das demais transferências, que crescem como a atividade.
 */
export function projecaoReceitas(dados: DadosReceita, receita: LinhaMacro[], fpePloa: number): ProjecaoReceitas {
  const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
  const ipca27 = parametros.ipca['2027']
  const pib27 = parametros.pib_real['2027']
  const g27 = (1 + ipca27) * (1 + pib27) - 1
  const analise = analisaFontes(dados)
  const icms26 = projecaoItens(dados).icms.central
  const fpe26 = analise.find((a) => a.id === 'fpe')!.central
  const pet = receitaPetroleo(BRENT_CENTRAL, CAMBIO_CENTRAL, PRODUCAO_CENTRAL)
  const petPloa = implicitoPetroleo(dados, analise, R.transf_corr_uniao[5], g27).implicito
  const icms = icms26 * (1 + g27)
  const fpe = fpe26 * (1 + g27)
  const petEst = pet.transferencias
  const f = sens.fator_alinea_171252
  const pet26 = receitaPetroleo(sens.base_2026.brent, sens.base_2026.cambio, sens.base_2026.producao)
  return {
    g27, ipca27, pib27, brent: BRENT_CENTRAL, cambio: CAMBIO_CENTRAL, producao: PRODUCAO_CENTRAL, edicaoEia: EDICAO_EIA,
    linhas: [
      { chave: 'icms', rotulo: 'ICMS', ploa: R.icms[5], estimativa: icms },
      { chave: 'fpe', rotulo: 'FPE', ploa: fpePloa, estimativa: fpe },
      { chave: 'petroleo', rotulo: 'Petróleo', ploa: petPloa, estimativa: petEst },
      { chave: 'roy', rotulo: 'Royalties e excedente', ploa: null, estimativa: pet.royExc * f, sub: true },
      { chave: 'pe', rotulo: 'Participação especial', ploa: null, estimativa: pet.pe * f, sub: true },
      { chave: 'total', rotulo: 'Total das três fontes', ploa: R.icms[5] + fpePloa + petPloa, estimativa: icms + fpe + petEst },
    ],
    ldo: { previsto: PETROLEO_LDO_2027, modelo: receitaPetroleo(LDO.brent, LDO.cambio, LDO.producao).transferencias, ...LDO },
    ajusteIcmsPetroleo: pet26.icms * (1 + g27) - pet.icms,
  }
}
