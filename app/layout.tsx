import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Disponibilidade Financeira Líquida | SEFAZ-ES',
  description: 'Controle de Disponibilidade Financeira Líquida do Poder Executivo — Art. 42 da LRF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', theme);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
