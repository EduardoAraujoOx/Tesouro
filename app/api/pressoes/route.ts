import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const month = new URL(req.url).searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const upload = await prisma.sigefesUpload.findFirst({
    where: { monthRef: month, isLatest: true },
    include: { lines: { orderBy: { rowOrder: 'asc' }, where: { isSubtotal: false, isTotal: false } } },
  })

  if (!upload) return NextResponse.json({ lines: [], monthRef: month })
  return NextResponse.json({ lines: upload.lines, monthRef: month, uploadId: upload.id })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  if (!['ADMIN', 'SEP'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { uploadId, values } = body as { uploadId: string; values: { lineId: string; value: number | null; note?: string }[] }

  await Promise.all(
    values.map(({ lineId, value, note }) =>
      prisma.financialLine.update({
        where: { id: lineId },
        data: { colIXAdjusted: value, colIXNote: note || null },
      })
    )
  )

  const upload = await prisma.sigefesUpload.findUnique({ where: { id: uploadId }, select: { monthRef: true } })
  if (upload) {
    await prisma.sepInput.updateMany({ where: { uploadId, isLatest: true }, data: { isLatest: false } })
    await prisma.sepInput.create({
      data: { uploadId, monthRef: upload.monthRef, isLatest: true, createdById: session.user.id },
    })
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'SepInput', entityId: uploadId,
      action: 'UPDATE_IX', newValue: `${values.length} linhas atualizadas`,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
