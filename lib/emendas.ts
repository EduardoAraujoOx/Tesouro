import orcamentoRaw from '@/data/orcamento.json'
import ploaRaw from '@/data/ploa2027.json'
import rreoRaw from '@/data/rreo.json'
import obrigRaw from '@/data/ploa2027-obrigatorias.json'

/**
 * Dados do subitem Emendas (Despesa): emendas individuais e despesa dos Poderes, com os parâmetros de comparação.
 *
 * Emendas individuais: PEC 04/2026 (Assembleia Legislativa, 13/10/2026) e LDO 2027, art. 24: 1,55% da RCL do exercício de 2025, divididas entre os 30 deputados.
 * Em 2026 o teto foi de R$ 3 milhões por deputado (ES Hoje, 13/10/2026), sem obrigatoriedade de execução. O valor de 2025 não foi localizado em fonte pública.
 * Despesa primária discricionária: demonstrativo da Mensagem nº 189/2026 (autorizado em 25/09/2026 e PLOA 2027), em data/ploa2027-obrigatorias.json. O demonstrativo é
 * consolidado (soma ao total da PLOA menos a reserva do RPPS) e, portanto, inclui os demais Poderes; a série só do Executivo não foi localizada. Como sensibilidade,
 * `discSemPoderes` retira o custeio e o investimento (GND 3, 4 e 5) dos Poderes, o limite superior do que nesses órgãos seria discricionário.
 */
export const PCT_EMENDAS = 0.0155
const DEPUTADOS = 30
const POR_DEPUTADO_2026 = 3e6

const PODERES: { rotulo: string; uos: string[] }[] = [
  { rotulo: 'Assembleia', uos: ['01101'] },
  { rotulo: 'Trib. de Contas', uos: ['02101'] },
  { rotulo: 'Trib. de Justiça', uos: ['03101', '03901'] },
  { rotulo: 'Min. Público', uos: ['05101', '05902'] },
  { rotulo: 'Defensoria', uos: ['06101', '06901'] },
]

export type PoderEmenda = { rotulo: string; v25: number; v26: number; v27: number }
export type DadosEmendas = {
  /** emendas individuais, em R$ (2025: não localizado) */
  emendas: { a2025: number | null; a2026: number; a2027: number }
  /** RCL do ano-base de cada exercício (2023, 2024 e 2025), em R$ */
  rcl: { a2025: number; a2026: number; a2027: number }
  /** despesa primária discricionária do Executivo, em R$: autorizado de 2026 e PLOA 2027 */
  disc: { a2026: number; a2027: number }
  /** a mesma série sem o custeio e o investimento dos Poderes (limite inferior para o Executivo), em R$ */
  discSemPoderes: { a2026: number; a2027: number }
  /** recursos não vinculados de impostos (fonte 500) dos Poderes: LOA 2025 e 2026 (dotação inicial) e PLOA 2027 */
  poderes: PoderEmenda[]
  /** IPCA de julho a junho que antecede cada exercício (2026 e 2027), em % */
  ipca: { a2026: number; a2027: number }
}

type Tabela = { colunas: string[]; linhas: (string | number)[][] }
function soma(t: Tabela, uos: string[], valor: string): number {
  const ic = Object.fromEntries(t.colunas.map((c, i) => [c, i]))
  return t.linhas.filter((l) => uos.includes(String(l[ic.uo]).padStart(5, '0')) && String(l[ic.fonte]) === '500').reduce((s, l) => s + Number(l[ic[valor]]), 0)
}

export function dadosEmendas(): DadosEmendas {
  const orc = (orcamentoRaw as unknown as { anos: Record<string, Tabela> }).anos
  const rreo = rreoRaw as unknown as { serie: { ano: number; rcl12m: number }[]; ipca: { mes: string; var: number }[] }
  const rcl = (ano: number) => rreo.serie.find((s) => s.ano === ano)?.rcl12m ?? NaN
  const ipcaAcum = (de: string) => {
    const m = Object.fromEntries(rreo.ipca.map((x) => [x.mes, x.var]))
    let f = 1
    for (let k = 0; k < 12; k++) {
      const ano = Number(de.slice(0, 4)) + Math.floor((Number(de.slice(5)) - 1 + k) / 12)
      const mes = ((Number(de.slice(5)) - 1 + k) % 12) + 1
      f *= 1 + (m[`${ano}-${String(mes).padStart(2, '0')}`] ?? 0) / 100
    }
    return (f - 1) * 100
  }
  const ptab = ploaRaw as unknown as Tabela
  const custeio = (t: Tabela, valor: string) => {
    const ic = Object.fromEntries(t.colunas.map((c, i) => [c, i]))
    const uos = PODERES.flatMap((q) => q.uos)
    return t.linhas.filter((l) => uos.includes(String(l[ic.uo]).padStart(5, '0')) && ['3', '4', '5'].includes(String(l[ic.gnd]))).reduce((x, l) => x + Number(l[ic[valor]]), 0)
  }
  const obrig = (obrigRaw as unknown as { linhas: Record<string, number[]> }).linhas.primarias_discricionarias
  return {
    emendas: { a2025: null, a2026: DEPUTADOS * POR_DEPUTADO_2026, a2027: PCT_EMENDAS * rcl(2025) },
    rcl: { a2025: rcl(2023), a2026: rcl(2024), a2027: rcl(2025) },
    disc: { a2026: obrig[0], a2027: obrig[1] },
    discSemPoderes: { a2026: obrig[0] - custeio(orc['2026'], 'dotacao_atualizada'), a2027: obrig[1] - custeio(ptab, 'valor') },
    poderes: PODERES.map((p) => ({
      rotulo: p.rotulo,
      v25: soma(orc['2025'], p.uos, 'dotacao_inicial'),
      v26: soma(orc['2026'], p.uos, 'dotacao_inicial'),
      v27: soma(ploaRaw as unknown as Tabela, p.uos, 'valor'),
    })),
    ipca: { a2026: ipcaAcum('2024-07'), a2027: ipcaAcum('2025-07') },
  }
}
