import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { coletadoEm, linhasCompactas, nomesPainel, ORGAOS_OUTROS_PODERES } from '@/lib/orcamento'

export const metadata: Metadata = {
  title: { absolute: `${IDENTIDADE.nome} · ${IDENTIDADE.painel}` },
  description: IDENTIDADE.aviso,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: IDENTIDADE.nome, title: IDENTIDADE.painel, description: IDENTIDADE.aviso },
  robots: { index: false, follow: false },
}

export default function PaginaPainel() {
  const linhas = linhasCompactas()
  const coleta = new Date(coletadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return <Painel linhas={linhas} nomes={nomesPainel(linhas)} coleta={coleta} outrosPoderes={[...ORGAOS_OUTROS_PODERES]} />
}
