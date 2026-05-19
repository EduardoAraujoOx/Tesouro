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
  const months = Array.from(new Set(uploads.map(u => u.monthRef)))

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

  // Build 3-level tree using rowOrder sequence + level field (0/1/2)
  type Line = typeof upload.lines[number]
  type TreeNode = Line & { children: TreeNode[] }
  function buildTree(flatLines: Line[]): TreeNode[] {
    const result: TreeNode[] = []
    const stack: TreeNode[] = []
    for (const line of flatLines) {
      const node: TreeNode = { ...line, children: [] }
      while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop()
      if (stack.length === 0) result.push(node)
      else stack[stack.length - 1].children.push(node)
      stack.push(node)
    }
    return result
  }

  const rows = buildTree(upload.lines)

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
