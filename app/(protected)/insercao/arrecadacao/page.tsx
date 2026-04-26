'use client'
import { useSession } from 'next-auth/react'
import ManualInputTable from '@/components/input/ManualInputTable'

export default function ArrecadacaoPage() {
  const { data: session } = useSession()
  const canEdit = ['ADMIN', 'SUBSET'].includes(session?.user?.role || '')

  return (
    <ManualInputTable
      colKey="VI"
      colLabel="Arrecadação Prevista a Realizar por Fonte — Coluna VI (SUBSET)"
      apiEndpoint="/api/arrecadacao"
      canEdit={canEdit}
      saveMsg={`Salvo por ${session?.user?.name || ''} (${session?.user?.role || ''})`}
    />
  )
}
