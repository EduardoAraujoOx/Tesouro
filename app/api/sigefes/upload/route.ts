import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { parseSigefesSpreadsheet } from '@/lib/importers/sigefesParser'
import { validateParsedData } from '@/lib/importers/sigefesValidator'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  if (!['ADMIN', 'SUBSET', 'SEFAZ'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler o arquivo enviado.' }, { status: 400 })
  }

  let parseResult: Awaited<ReturnType<typeof parseSigefesSpreadsheet>>
  try {
    parseResult = await parseSigefesSpreadsheet(buffer)
  } catch {
    return NextResponse.json({ error: 'Arquivo inválido ou corrompido. Envie uma exportação .xlsx do SIGEFES-ES.' }, { status: 422 })
  }

  if (parseResult.errors.length > 0) {
    return NextResponse.json({ error: parseResult.errors.join(' '), parseResult }, { status: 422 })
  }

  const validation = validateParsedData(parseResult.lines)

  // Return preview without persisting (parse=true param)
  const preview = formData.get('preview')
  if (preview === 'true') {
    return NextResponse.json({ parseResult, validation, fileName: file.name })
  }

  if (!validation.passed) {
    return NextResponse.json({ error: 'Validação crítica falhou.', validation }, { status: 422 })
  }

  const monthRef = parseResult.monthRef ?? (formData.get('monthRef') as string | null)
  if (!monthRef || !/^\d{4}-\d{2}$/.test(monthRef)) {
    return NextResponse.json({ error: 'Não foi possível extrair o mês de referência.' }, { status: 422 })
  }

  // Mark previous uploads as not latest
  await prisma.sigefesUpload.updateMany({
    where: { monthRef, isLatest: true },
    data: { isLatest: false },
  })

  // Create new upload with lines
  const upload = await prisma.sigefesUpload.create({
    data: {
      monthRef,
      referenceDate: parseResult.referenceDate,
      fileName: file.name,
      isLatest: true,
      uploadedById: session.user.id,
      lines: {
        create: parseResult.lines.map(l => ({
          rowOrder: l.rowOrder,
          rowLabel: l.rowLabel,
          groupKey: l.groupKey,
          isGroup: l.isGroup,
          isSubtotal: l.isSubtotal,
          isTotal: l.isTotal,
          level: l.level,
          colI: l.colI, colII: l.colII, colIII: l.colIII, colIV: l.colIV,
          colV: l.colV, colVI: l.colVI, colVII: l.colVII, colVIII: l.colVIII,
          colIX: l.colIX, colX: l.colX, colXI: l.colXI, colXII: l.colXII,
        })),
      },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      entityType: 'SigefesUpload',
      entityId: upload.id,
      action: 'UPLOAD_SIGEFES',
      newValue: `${file.name} — ${parseResult.lines.length} linhas`,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ success: true, uploadId: upload.id, monthRef, lines: parseResult.lines.length })
}
