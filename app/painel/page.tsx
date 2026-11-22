import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { ploaPorElemento } from '@/lib/orcamento'
import { despesaMacro, parametros, receitaMacro } from '@/lib/macro'
import receitaRaw from '@/data/receita.json'
import ploaRaw from '@/data/ploa2027.json'
import orgaosRaw from '@/data/ploa2027-orgaos.json'
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
  const por: Record<string, { exec: number; reserva: number }> = {}
  for (const r of b.linhas) {
    const cod = String(r[ic.uo]).padStart(5, '0').slice(0, 2)
    const o = (por[cod] ??= { exec: 0, reserva: 0 })
    if (String(r[ic.gnd]) === '9') o.reserva += Number(r[ic.valor])
    else o.exec += Number(r[ic.valor])
  }
  const nomes = Object.fromEntries((orgaosRaw as unknown as { poderes: { orgaos: { cod: string; nome: string }[] }[] }).poderes.flatMap((p) => p.orgaos).map((o) => [o.cod, o.nome]))
  return Object.entries(por).map(([cod, v]) => ({ cod, nome: nomes[cod] ?? `Órgão ${cod}`, ...v }))
}

export default function PaginaPainel() {
  return <Painel
    macro={{ receita: receitaMacro, despesa: despesaMacro, ipca: parametros.ipca, pib: parametros.pib_real, fonteIpca: parametros.fonte }}
    elementosPloa={ploaPorElemento()} orgaos={orgaosPloa()} receitaMes={receitaRaw as unknown as DadosReceita} />
}
