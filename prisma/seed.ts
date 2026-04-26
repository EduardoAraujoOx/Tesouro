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

  // FinancialLines — Abril/2026
  const uploadAbr = await prisma.sigefesUpload.findFirstOrThrow({ where: { monthRef: '2026-04' } })

  await prisma.financialLine.createMany({
    data: [
      // rowOrder 0 — grupo
      {
        uploadId: uploadAbr.id, rowOrder: 0, level: 0,
        rowLabel: 'RECURSOS ADMINISTRADOS PELO TESOURO (I)',
        groupKey: 'TESOURO', isGroup: true, isSubtotal: false, isTotal: false,
        colI: 2347935168.15, colII: 498399075.96, colIII: 0, colIV: 8252103740.53,
        colV: -6402567648.34, colVI: 0, colVII: 0, colVIII: 2291431263.08,
        colIX: 0, colX: 0, colXI: 593307401.24, colXII: 121359760.58,
      },
      // rowOrder 1
      {
        uploadId: uploadAbr.id, rowOrder: 1, level: 1,
        rowLabel: 'Recursos Não Vinculados de Impostos',
        groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false,
        colI: 1211139238.42, colII: 343900015.22, colIII: 0, colIV: 7275603611.63,
        colV: -6408364388.43, colVI: 0, colVII: 0, colVIII: 1233510730.23,
        colIX: 0, colX: 0, colXI: 391605482.72, colXII: 114772385.58,
      },
      // rowOrder 2
      {
        uploadId: uploadAbr.id, rowOrder: 2, level: 1,
        rowLabel: 'Outros Recursos Não Vinculados - Administração Direta',
        groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false,
        colI: 484332635.18, colII: 26755205.41, colIII: 0, colIV: 559043565.22,
        colV: -101466135.45, colVI: 0, colVII: 0, colVIII: 404616081.80,
        colIX: 0, colX: 0, colXI: 129844941.00, colXII: 0,
      },
      // rowOrder 3
      {
        uploadId: uploadAbr.id, rowOrder: 3, level: 1,
        rowLabel: 'Outros Recursos Não Vinculados - Precatórios - Ação Civil Originária 2178',
        groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false,
        colI: 221456287.08, colII: 54724440.19, colIII: 0, colIV: 20140348.20,
        colV: 146591498.69, colVI: 0, colVII: 0, colVIII: 0,
        colIX: 0, colX: 0, colXI: 0, colXII: 0,
      },
      // rowOrder 4
      {
        uploadId: uploadAbr.id, rowOrder: 4, level: 1,
        rowLabel: 'Recursos Não Vinculados da Compesação de Impostos',
        groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false,
        colI: 90186294.13, colII: 8960426.89, colIII: 0, colIV: 15457786.45,
        colV: 65768080.79, colVI: 0, colVII: 0, colVIII: 2382246.59,
        colIX: 0, colX: 0, colXI: 0, colXII: 0,
      },
      // rowOrder 5
      {
        uploadId: uploadAbr.id, rowOrder: 5, level: 1,
        rowLabel: 'Royalties do Petróleo - Destinação Não Vinculada',
        groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false,
        colI: 290914330.67, colII: 62940352.09, colIII: 0, colIV: 381858429.03,
        colV: -153884450.45, colVI: 0, colVII: 0, colVIII: 648287918.46,
        colIX: 0, colX: 0, colXI: 71856977.52, colXII: 6587375.00,
      },
      // rowOrder 6
      {
        uploadId: uploadAbr.id, rowOrder: 6, level: 1,
        rowLabel: 'Recursos de Operações de Crédito - Reembolso de Despesas Executadas com Recurso do Tesouro',
        groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false,
        colI: 48898241.18, colII: 618636.16, colIII: 0, colIV: 0,
        colV: 48279605.02, colVI: 0, colVII: 0, colVIII: 2634286.00,
        colIX: 0, colX: 0, colXI: 0, colXII: 0,
      },
    ],
  })

  console.log('✅ 7 FinancialLines TESOURO (Abr/2026) criadas')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
