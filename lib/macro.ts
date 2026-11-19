import macroRaw from '@/data/ploa2027-macro.json'
import paramsRaw from '@/data/parametros-macro.json'
import rreoRaw from '@/data/rreo.json'

/** Quadros macro da PLOA 2027: Evolução da Receita (p. 97) e Evolução da Despesa (p. 130). Seis colunas, em R$. */
export type LinhaMacro = { chave: string; rotulo: string; nivel: number; valores: number[] }
export const COLUNAS_MACRO = ['2023', '2024', '2025', 'Orçamento 2026', 'Provável 2026', 'Estimativa 2027'] as const

const macro = macroRaw as unknown as { receita: LinhaMacro[]; despesa: LinhaMacro[]; extraido_em: string; documento: string }
export const receitaMacro = macro.receita
export const despesaMacro = macro.despesa
export const macroExtraidoEm = macro.extraido_em
export const macroDocumento = macro.documento

export const parametros = paramsRaw as unknown as { ipca: Record<string, number>; pib_real: Record<string, number>; fonte: string }

/** Arrecadação mensal (RREO/RGF e ANP): ICMS, cota-parte do FPE e royalties, em R$, por mês 'AAAA-MM'. */
export const mensal = (rreoRaw as unknown as { mensal: Record<'icms' | 'fpe' | 'royalties', Record<string, number>> }).mensal
