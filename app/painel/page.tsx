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
import type { IndicadoresFiscais } from '@/components/painel/Agregado'
import type { OrgaoPloa } from '@/components/painel/DespesaOrgaos'
import type { DadosReceita } from '@/components/painel/projecao'

const descricaoCard = 'PLOA 2027 e projeção de 2026: receita, despesa, resultado, LRF e CAPAG. Material de trabalho da equipe de transição, com dados públicos; não é divulgação oficial do Governo do Estado.'
const tituloCard = `${IDENTIDADE.painel} · ${IDENTIDADE.nome}`

/** A imagem do card (WhatsApp, redes) é app/painel/opengraph-image.png, 1200 x 630; a fonte dela está em scripts/card-painel.html. */
export const metadata: Metadata = {
  title: { absolute: tituloCard },
  description: descricaoCard,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: IDENTIDADE.nome, title: tituloCard, description: descricaoCard, url: '/painel' },
  twitter: { card: 'summary_large_image', title: tituloCard, description: descricaoCard },
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

export default function PaginaPainel() {
  return <Painel
    macro={{ receita: receitaMacro, despesa: despesaMacro, ipca: parametros.ipca, pib: parametros.pib_real, fonteIpca: parametros.fonte }}
    elementosPloa={ploaPorElemento()} orgaos={orgaosPloa()} fiscais={indicadoresFiscais()} rclPloa={(rclRaw as unknown as { linhas: Record<string, number> }).linhas.rcl} pessoalExecPloa={pessoalPloaExecutivo()} receitaMes={receitaRaw as unknown as DadosReceita} />
}
