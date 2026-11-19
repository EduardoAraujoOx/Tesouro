'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Esconde o conteúdo (rodapé do portal) nas páginas do painel de dados. */
export function SoForaDoPainel({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return pathname.startsWith('/painel') ? null : <>{children}</>
}
