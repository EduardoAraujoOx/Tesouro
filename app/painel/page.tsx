import type { Metadata } from 'next'
import { Painel } from '@/components/painel/Painel'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { dadosPainel } from '@/lib/dados-painel'

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

export default function PaginaPainel() {
  return <Painel {...dadosPainel()} />
}
