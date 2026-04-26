import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all months that have uploads
  const uploads = await prisma.sigefesUpload.findMany({
    orderBy: { monthRef: 'desc' },
    include: { uploadedBy: { select: { name: true, role: true } } },
  })

  // Group by month
  const monthMap: Record<string, {
    sigefes: { count: number; last: string; user: string } | null
    subset: { last: string; user: string } | null
    sep: { last: string; user: string } | null
  }> = {}

  for (const u of uploads) {
    if (!monthMap[u.monthRef]) {
      monthMap[u.monthRef] = { sigefes: null, subset: null, sep: null }
    }
    const allForMonth = uploads.filter(x => x.monthRef === u.monthRef)
    if (!monthMap[u.monthRef].sigefes) {
      const latest = allForMonth.find(x => x.isLatest) || allForMonth[0]
      monthMap[u.monthRef].sigefes = {
        count: allForMonth.length,
        last: latest.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        user: `${latest.uploadedBy.name} (${latest.uploadedBy.role})`,
      }
    }
  }

  // Get SubsetInputs
  const subsets = await prisma.subsetInput.findMany({
    where: { isLatest: true },
    include: { createdBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })
  for (const s of subsets) {
    if (monthMap[s.monthRef]) {
      monthMap[s.monthRef].subset = {
        last: s.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        user: `${s.createdBy.name} (${s.createdBy.role})`,
      }
    }
  }

  // Get SepInputs
  const seps = await prisma.sepInput.findMany({
    where: { isLatest: true },
    include: { createdBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })
  for (const s of seps) {
    if (monthMap[s.monthRef]) {
      monthMap[s.monthRef].sep = {
        last: s.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        user: `${s.createdBy.name} (${s.createdBy.role})`,
      }
    }
  }

  const months = Object.entries(monthMap).map(([monthRef, data]) => ({
    monthRef,
    ...data,
    status: data.sigefes && data.subset && data.sep ? 'Consolidado' : 'Em andamento',
  }))

  return NextResponse.json({ months })
}
