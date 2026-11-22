import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { ploaPorElemento, pessoalExecutivoEmpenhado2025, pessoalPloaExecutivo } from '@/lib/orcamento'
import { despesaMacro, parametros, receitaMacro } from '@/lib/macro'
import receitaRaw from '@/data/receita.json'
import ploaRaw from '@/data/ploa2027.json'
import orgaosRaw from '@/data/ploa2027-orgaos.json'
import rclRaw from '@/data/ploa2027-rcl.json'
import indicadoresRaw from '@/data/indicadores.json'
import loaRaw from '@/data/loa-executado.json'
import receitaAnualRaw from '@/data/receita-anual.json'
import { ajustesVotacao } from '@/lib/ajustes-ploa'
import type { IndicadoresFiscais } from '@/components/painel/Agregado'
import type { LoaAnual, ReceitaAnual } from '@/components/painel/OrcadoExecutado'
import type { OrgaoPloa } from '@/components/painel/DespesaOrgaos'
import type { DadosReceita } from '@/components/painel/projecao'

export const metadata: Metadata = {
  title: { absolute: `${IDENTIDADE.nome} · ${IDENTIDADE.painel}` },
  description: IDENTIDADE.aviso,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: IDENTIDADE.nome, title: IDENTIDADE.painel, description: IDENTIDADE.aviso },
  robots: { index: false, follow: false },
}

/** Órgãos da PLOA 2027 (dois primeiros dígitos do código da unidade orçamentária): despesa executável (GND 1 a 6) e reservas (GND 9), com os nomes do art. 5º. */
function orgaosPloa(): OrgaoPloa[] {
  const b = ploaRaw as unknown as { colunas: string[]; linhas: (string | number)[][] }
  const ic = Object.fromEntries(b.colunas.map((c, i) => [c, i]))
  const por: Record<string, { exec: number; reserva: number; porGnd: Record<string, number> }> = {}
  for (const r of b.linhas) {
    const cod = String(r[ic.uo]).padStart(5, '0').slice(0, 2)
    const o = (por[cod] ??= { exec: 0, reserva: 0, porGnd: {} })
    const g = String(r[ic.gnd])
    if (g === '9') o.reserva += Number(r[ic.valor])
    else { o.exec += Number(r[ic.valor]); o.porGnd[g] = (o.porGnd[g] ?? 0) + Number(r[ic.valor]) }
  }
  const nomes = Object.fromEntries((orgaosRaw as unknown as { poderes: { orgaos: { cod: string; nome: string }[] }[] }).poderes.flatMap((p) => p.orgaos).map((o) => [o.cod, o.nome]))
  return Object.entries(por).map(([cod, v]) => ({ cod, nome: nomes[cod] ?? `Órgão ${cod}`, ...v }))
}

/** LRF (RGF do Poder Executivo) e CAPAG, séries do Tesouro Nacional já guardadas em data/indicadores.json. */
function indicadoresFiscais(): IndicadoresFiscais {
  const d = indicadoresRaw as unknown as { capag: { serie: IndicadoresFiscais['capag'] }; lrf: { serie: IndicadoresFiscais['lrf'] } }
  return { capag: d.capag.serie.filter((x) => x.ano >= 2023), lrf: d.lrf.serie.filter((x) => x.ano >= 2025), pessoalExecutivoEmpenhado2025: pessoalExecutivoEmpenhado2025() }
}

/** Orçamento inicial (LOA) e despesa empenhada por ano, do consolidado por unidade gestora do Portal. */
function loaExecutado(): LoaAnual {
  const d = (loaRaw as unknown as { anos: Record<string, { dotacao_inicial: number; empenhado: number }> }).anos
  return Object.fromEntries(Object.entries(d).map(([a, v]) => [a, { inicial: v.dotacao_inicial, empenhado: v.empenhado }]))
}

/** Arrecadação líquida de deduções dos anos que os quadros da PLOA não cobrem (2019 a 2022). */
function receitaAnual(): ReceitaAnual {
  const d = (receitaAnualRaw as unknown as { anos: Record<string, { liquida: number }> }).anos
  return Object.fromEntries(Object.entries(d).map(([a, v]) => [a, v.liquida]))
}

export default function PaginaPainel() {
  return <Painel
    macro={{ receita: receitaMacro, despesa: despesaMacro, ipca: parametros.ipca, pib: parametros.pib_real, fonteIpca: parametros.fonte }}
    elementosPloa={ploaPorElemento()} orgaos={orgaosPloa()} fiscais={indicadoresFiscais()} rclPloa={(rclRaw as unknown as { linhas: Record<string, number> }).linhas.rcl} pessoalExecPloa={pessoalPloaExecutivo()} ajustes={ajustesVotacao()} loa={loaExecutado()} receitaAnual={receitaAnual()} receitaMes={receitaRaw as unknown as DadosReceita} />
}
