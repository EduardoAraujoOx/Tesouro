'use client'
import { useSession } from 'next-auth/react'
import ManualInputTable from '@/components/input/ManualInputTable'

export default function PressoresPage() {
  const { data: session } = useSession()
  const canEdit = ['ADMIN', 'SEP'].includes(session?.user?.role || '')

  return (
    <ManualInputTable
      colKey="IX"
      colLabel="Pressões Orçamentárias Identificadas — Coluna IX (SEP)"
      apiEndpoint="/api/pressoes"
      canEdit={canEdit}
      saveMsg={`Salvo por ${session?.user?.name || ''} (${session?.user?.role || ''})`}
    />
  )
}
