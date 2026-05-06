import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthParam = new URL(req.url).searchParams.get('month')

  const upload = await prisma.sigefesUpload.findFirst({
    where: monthParam ? { monthRef: monthParam, isLatest: true } : { isLatest: true },
    orderBy: { createdAt: 'desc' },
    include: { lines: { orderBy: { rowOrder: 'asc' } } },
  })

  if (!upload) return NextResponse.json({ lines: [], monthRef: monthParam ?? null })
  return NextResponse.json({ lines: upload.lines, monthRef: upload.monthRef, uploadId: upload.id })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  if (!['ADMIN', 'SUBSET'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { uploadId, values } = body as { uploadId: string; values: { lineId: string; value: number | null; note?: string }[] }

  // Update each line's colVIAdjusted
  await Promise.all(
    values.map(({ lineId, value, note }) =>
      prisma.financialLine.update({
        where: { id: lineId },
        data: {
          colVIAdjusted: value,
          colVINote: note || null,
        },
      })
    )
  )

  // Register SubsetInput
  const upload = await prisma.sigefesUpload.findUnique({ where: { id: uploadId }, select: { monthRef: true } })
  if (upload) {
    await prisma.subsetInput.updateMany({ where: { uploadId, isLatest: true }, data: { isLatest: false } })
    await prisma.subsetInput.create({
      data: { uploadId, monthRef: upload.monthRef, isLatest: true, createdById: session.user.id },
    })
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'SubsetInput', entityId: uploadId,
      action: 'UPDATE_VI', newValue: `${values.length} linhas atualizadas`,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
