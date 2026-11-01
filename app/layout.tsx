import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { TopBar } from '@/components/TopBar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Tesouro Estadual do Espírito Santo', template: '%s · Tesouro Estadual ES' },
  description:
    'Transparência e responsabilidade na gestão das finanças públicas: informações fiscais, contabilidade, dívida pública e publicações do Tesouro Estadual do Espírito Santo.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Tesouro Estadual do Espírito Santo' },
}

export const viewport: Viewport = { themeColor: '#082B57', width: 'device-width', initialScale: 1 }

// Aplica preferências de acessibilidade antes da primeira pintura (evita "piscada").
const prefs = `try{var d=document.documentElement,c=localStorage.getItem('tesouro:contraste'),f=localStorage.getItem('tesouro:fonte');if(c==='alto')d.dataset.contrast='alto';if(f&&f!=='md')d.dataset.font=f}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><script dangerouslySetInnerHTML={{ __html: prefs }} /></head>
      <body>
        <a href="#conteudo" className="sr-only-focusable z-50 bg-navy px-4 py-3 font-semibold text-on-navy focus:fixed focus:left-4 focus:top-4">
          Ir para o conteúdo
        </a>
        <TopBar />
        <Header />
        <main id="conteudo" tabIndex={-1} className="outline-none">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
