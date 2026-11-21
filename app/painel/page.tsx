import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { ploaPorElemento } from '@/lib/orcamento'
import { despesaMacro, parametros, receitaMacro } from '@/lib/macro'
import receitaRaw from '@/data/receita.json'
import type { DadosReceita } from '@/components/painel/projecao'

export const metadata: Metadata = {
  title: { absolute: `${IDENTIDADE.nome} · ${IDENTIDADE.painel}` },
  description: IDENTIDADE.aviso,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: IDENTIDADE.nome, title: IDENTIDADE.painel, description: IDENTIDADE.aviso },
  robots: { index: false, follow: false },
}

export default function PaginaPainel() {
  return <Painel
    macro={{ receita: receitaMacro, despesa: despesaMacro, ipca: parametros.ipca, pib: parametros.pib_real, fonteIpca: parametros.fonte }}
    elementosPloa={ploaPorElemento()} receitaMes={receitaRaw as unknown as DadosReceita} />
}
