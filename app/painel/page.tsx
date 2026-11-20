import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { coletadoEm, linhasCompactas, nomesPainel, ORGAOS_OUTROS_PODERES, reservaContingenciaPloa, totaisPorFuncao } from '@/lib/orcamento'
import { despesaMacro, parametros, receitaMacro } from '@/lib/macro'
import receitaRaw from '@/data/receita.json'
import petroleoRaw from '@/data/petroleo-sefaz.json'
import mercadoRaw from '@/data/petroleo-mercado.json'
import type { PetroleoMercado, PetroleoSefaz } from '@/components/painel/Fontes'
import type { DadosReceita } from '@/components/painel/ReceitaMensal'

export const metadata: Metadata = {
  title: { absolute: `${IDENTIDADE.nome} · ${IDENTIDADE.painel}` },
  description: IDENTIDADE.aviso,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: IDENTIDADE.nome, title: IDENTIDADE.painel, description: IDENTIDADE.aviso },
  robots: { index: false, follow: false },
}

export default function PaginaPainel() {
  const linhas = linhasCompactas()
  const coleta = new Date(coletadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return <Painel linhas={linhas} nomes={nomesPainel(linhas)} coleta={coleta} outrosPoderes={[...ORGAOS_OUTROS_PODERES]}
    macro={{ receita: receitaMacro, despesa: despesaMacro, ipca: parametros.ipca, pib: parametros.pib_real, fonteIpca: parametros.fonte }}
    funcoes={totaisPorFuncao()} contingencia={reservaContingenciaPloa()} receitaMes={receitaRaw as unknown as DadosReceita} petroleo={petroleoRaw as unknown as PetroleoSefaz} mercado={mercadoRaw as unknown as PetroleoMercado} />
}
