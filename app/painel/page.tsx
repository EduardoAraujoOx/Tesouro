import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { coletadoEm, linhasCompactas, nomesPainel, ORGAOS_OUTROS_PODERES } from '@/lib/orcamento'

export const metadata: Metadata = {
  title: 'Painel do orçamento',
  robots: { index: false, follow: false },
}

export default function PaginaPainel() {
  const linhas = linhasCompactas()
  const coleta = new Date(coletadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return <Painel linhas={linhas} nomes={nomesPainel(linhas)} coleta={coleta} outrosPoderes={[...ORGAOS_OUTROS_PODERES]} />
}
