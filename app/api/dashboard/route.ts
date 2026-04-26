import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  // Get all months with uploads
  const uploads = await prisma.sigefesUpload.findMany({
    where: { isLatest: true },
    select: { monthRef: true, referenceDate: true, createdAt: true, uploadedBy: { select: { name: true } } },
    orderBy: { monthRef: 'desc' },
  })
  const months = [...new Set(uploads.map(u => u.monthRef))]

  const targetMonth = month || months[0]
  if (!targetMonth) {
    return NextResponse.json({ months: [], rows: [], referenceDate: null, uploadedAt: null })
  }

  const upload = await prisma.sigefesUpload.findFirst({
    where: { monthRef: targetMonth, isLatest: true },
    include: {
      lines: { orderBy: { rowOrder: 'asc' } },
      uploadedBy: { select: { name: true } },
    },
  })

  if (!upload) {
    return NextResponse.json({ months, rows: [], referenceDate: null, uploadedAt: null })
  }

  // Build tree structure
  const lines = upload.lines
  const groupLines = lines.filter(l => l.isGroup || l.isSubtotal || l.isTotal)
  const detailLines = lines.filter(l => !l.isGroup && !l.isSubtotal && !l.isTotal)

  const rows = groupLines.map(g => ({
    ...g,
    children: g.isGroup ? detailLines.filter(d => d.groupKey === g.groupKey) : [],
  }))

  const uploadedAt = upload.createdAt.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return NextResponse.json({
    months,
    rows,
    referenceDate: upload.referenceDate,
    uploadedAt,
    uploader: upload.uploadedBy.name,
  })
}
