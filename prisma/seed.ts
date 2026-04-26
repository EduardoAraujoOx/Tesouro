import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.subsetInput.deleteMany()
  await prisma.sepInput.deleteMany()
  await prisma.financialLine.deleteMany()
  await prisma.sigefesUpload.deleteMany()
  await prisma.user.deleteMany()

  const hash = await bcrypt.hash('Sistema@2026', 12)

  // Users
  const admin = await prisma.user.create({
    data: { name: 'Administrador', email: 'admin@sefaz.es.gov.br', passwordHash: hash, role: 'ADMIN' },
  })
  const subset = await prisma.user.create({
    data: { name: 'Eduardo Araújo', email: 'subset@sefaz.es.gov.br', passwordHash: hash, role: 'SUBSET' },
  })
  const sefaz = await prisma.user.create({
    data: { name: 'Ana Lima', email: 'sefaz@sefaz.es.gov.br', passwordHash: hash, role: 'SEFAZ' },
  })
  const sep = await prisma.user.create({
    data: { name: 'Carlos Pereira', email: 'sep@sefaz.es.gov.br', passwordHash: hash, role: 'SEP' },
  })
  await prisma.user.create({
    data: { name: 'Consulta', email: 'consulta@sefaz.es.gov.br', passwordHash: hash, role: 'CONSULTA' },
  })

  console.log('✅ 5 usuários criados')

  // SigefesUpload records (empty — lines added separately)
  await prisma.sigefesUpload.create({
    data: {
      monthRef: '2026-02',
      referenceDate: '28/02/2026',
      fileName: 'controle_art42_fev2026.xlsx',
      isLatest: true,
      uploadedById: subset.id,
      createdAt: new Date('2026-03-04T11:20:00'),
    },
  })

  await prisma.sigefesUpload.create({
    data: {
      monthRef: '2026-03',
      referenceDate: '31/03/2026',
      fileName: 'controle_art42_mar2026.xlsx',
      isLatest: true,
      uploadedById: subset.id,
      createdAt: new Date('2026-04-02T17:10:00'),
    },
  })

  await prisma.sigefesUpload.create({
    data: {
      monthRef: '2026-04',
      referenceDate: '22/04/2026',
      fileName: 'controle_art42_reestruturado_v2.xlsx',
      isLatest: true,
      uploadedById: subset.id,
      createdAt: new Date('2026-05-07T08:41:00'),
    },
  })

  console.log('✅ 3 SigefesUploads criados (Fev, Mar, Abr/2026)')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
