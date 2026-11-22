import type { Metadata } from 'next'
import { Relatorio } from '@/components/painel/Relatorio'
import { dadosPainel } from '@/lib/dados-painel'

export const metadata: Metadata = {
  title: { absolute: 'Relatório orçamentário 2027 · Espírito Santo' },
  robots: { index: false, follow: false },
}

export default function PaginaRelatorio() {
  return <Relatorio dados={dadosPainel()} />
}
