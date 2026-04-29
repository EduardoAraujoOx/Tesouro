import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ── Base data (Abril/2026 — valores reais do protótipo HTML) ─────────────────
interface BaseLine {
  rowOrder: number; level: number; rowLabel: string; groupKey: string
  isGroup: boolean; isSubtotal: boolean; isTotal: boolean
  colI: number; colII: number; colIII: number; colIV: number
  colVIII: number; colIX: number; colXI: number; colXII: number
}

const APR_LINES: BaseLine[] = [
  { rowOrder: 0, level: 0, rowLabel: 'RECURSOS ADMINISTRADOS PELO TESOURO (I)', groupKey: 'TESOURO', isGroup: true, isSubtotal: false, isTotal: false, colI: 2347935168.15, colII: 498399075.96, colIII: 0, colIV: 8252103740.53, colVIII: 2291431263.08, colIX: 0, colXI: 593307401.24, colXII: 121359760.58 },
  { rowOrder: 1, level: 1, rowLabel: 'Recursos Não Vinculados de Impostos', groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, colI: 1211139238.42, colII: 343900015.22, colIII: 0, colIV: 7275603611.63, colVIII: 1233510730.23, colIX: 0, colXI: 391605482.72, colXII: 114772385.58 },
  { rowOrder: 2, level: 1, rowLabel: 'Outros Recursos Não Vinculados - Administração Direta', groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, colI: 484332635.18, colII: 26755205.41, colIII: 0, colIV: 559043565.22, colVIII: 404616081.80, colIX: 0, colXI: 129844941.00, colXII: 0 },
  { rowOrder: 3, level: 1, rowLabel: 'Outros Recursos Não Vinculados - Precatórios - Ação Civil Originária 2178', groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, colI: 221456287.08, colII: 54724440.19, colIII: 0, colIV: 20140348.20, colVIII: 0, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 4, level: 1, rowLabel: 'Recursos Não Vinculados da Compesação de Impostos', groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, colI: 90186294.13, colII: 8960426.89, colIII: 0, colIV: 15457786.45, colVIII: 2382246.59, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 5, level: 1, rowLabel: 'Royalties do Petróleo - Destinação Não Vinculada', groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, colI: 290914330.67, colII: 62940352.09, colIII: 0, colIV: 381858429.03, colVIII: 648287918.46, colIX: 0, colXI: 71856977.52, colXII: 6587375.00 },
  { rowOrder: 6, level: 1, rowLabel: 'Recursos de Operações de Crédito - Reembolso de Despesas Executadas com Recurso do Tesouro', groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, colI: 48898241.18, colII: 618636.16, colIII: 0, colIV: 0, colVIII: 2634286.00, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 7, level: 0, rowLabel: 'DEMAIS RECURSOS - PODER EXECUTIVO (II)', groupKey: 'DEMAIS', isGroup: true, isSubtotal: false, isTotal: false, colI: 8169984509.36, colII: 926194616.24, colIII: 0, colIV: 4676054219.73, colVIII: 6011148984.77, colIX: 0, colXI: 77882374.00, colXII: 31515352.69 },
  { rowOrder: 8, level: 1, rowLabel: 'FEFIN', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 125371173.05, colII: 30266504.36, colIII: 0, colIV: 62516593.49, colVIII: 67460077.10, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 9, level: 1, rowLabel: 'FUNSES', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 2146284413.20, colII: 166629.05, colIII: 0, colIV: 27219570.05, colVIII: 233213673.28, colIX: 0, colXI: 77717374.00, colXII: 0 },
  { rowOrder: 10, level: 1, rowLabel: 'ROYALTIES DO PETRÓLEO - DESTINAÇÃO VINCULADA', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 159442857.10, colII: 3208164.95, colIII: 0, colIV: 9261688.77, colVIII: 47674066.16, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 11, level: 1, rowLabel: 'OUTROS RECURSOS NÃO VINCULADOS - ADMINISTRAÇÃO INDIRETA', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 263597468.31, colII: 16626212.11, colIII: 0, colIV: 230064779.88, colVIII: 175672708.39, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 12, level: 1, rowLabel: 'RECURSOS VINCULADOS A FUNDOS', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 387057152.96, colII: 19677978.16, colIII: 0, colIV: 138960436.94, colVIII: 103329153.20, colIX: 0, colXI: 165000.00, colXII: 0 },
  { rowOrder: 13, level: 1, rowLabel: 'RECURSOS VINCULADOS À EDUCAÇÃO', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 702221850.02, colII: 151220650.55, colIII: 0, colIV: 1699166864.58, colVIII: 1712235548.29, colIX: 0, colXI: 0, colXII: 22029289.82 },
  { rowOrder: 14, level: 1, rowLabel: 'RECURSOS VINCULADOS À SAUDE', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 452117830.14, colII: 111450518.94, colIII: 0, colIV: 2003123497.39, colVIII: 1320416010.47, colIX: 0, colXI: 0, colXII: 967865.87 },
  { rowOrder: 15, level: 1, rowLabel: 'RECURSOS DE OPERAÇÕES DE CRÉDITO', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 322882280.13, colII: 36222381.71, colIII: 0, colIV: 356783086.29, colVIII: 712946595.34, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 16, level: 1, rowLabel: 'RECURSOS VINCULADOS À ASSISTÊNCIA SOCIAL', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 6773432.01, colII: 163600.27, colIII: 0, colIV: 190501.99, colVIII: 2691155.67, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 17, level: 1, rowLabel: 'DEMAIS VINCULAÇÕES DECORRENTES DE TRANSFERÊNCIAS', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 481071101.12, colII: 35816103.52, colIII: 0, colIV: 28205496.16, colVIII: 322871562.97, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 18, level: 1, rowLabel: 'RECURSOS DA CONTRIBUIÇÃO DE INTERVENÇÃO NO DOMÍNIO ECONÔMICO - CIDE', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 32406555.94, colII: 121453.28, colIII: 0, colIV: 0, colVIII: 0, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 19, level: 1, rowLabel: 'RECURSOS VINCULADOS AO TRÂNSITO - MULTAS', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 160359780.68, colII: 3861821.92, colIII: 0, colIV: 41810662.88, colVIII: 58150609.22, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 20, level: 1, rowLabel: 'RECURSOS PROVENIENTES DE TAXAS DE CONTROLE E FISCALIZAÇÃO AMBIENTAL DO ES', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 43158946.12, colII: 4261880.75, colIII: 0, colIV: 6310853.45, colVIII: 10545478.81, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 21, level: 1, rowLabel: 'RECURSOS DE ALIENAÇÃO DE BENS', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 47618690.18, colII: 3751535.73, colIII: 0, colIV: 0, colVIII: 16351727.00, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 22, level: 1, rowLabel: 'RECURSOS VINCULADOS AO FUNDO DE COMBATE E ERRADICAÇÃO DA POBREZA', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 183087801.18, colII: 14750533.15, colIII: 0, colIV: 12927322.22, colVIII: 45726690.12, colIX: 0, colXI: 0, colXII: 8518197.00 },
  { rowOrder: 23, level: 1, rowLabel: 'DEMAIS RECURSOS VINCULADOS - ROMPIMENTO DA BARRAGEM DE FUNDÃO/MARIANA', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 2124304461.54, colII: 44863999.69, colIII: 0, colIV: 59512865.64, colVIII: 1171179922.75, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 24, level: 1, rowLabel: 'DEMAIS RECURSOS VINCULADOS', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 87839284.56, colII: 5375216.98, colIII: 0, colIV: 0, colVIII: 10684006.00, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 25, level: 1, rowLabel: 'RECURSOS EXTRAORÇAMENTÁRIOS', groupKey: 'DEMAIS', isGroup: false, isSubtotal: false, isTotal: false, colI: 444389431.12, colII: 444389431.12, colIII: 0, colIV: 0, colVIII: 0, colIX: 0, colXI: 0, colXII: 0 },
  { rowOrder: 26, level: 0, rowLabel: 'SUBTOTAL (III=I+II)', groupKey: 'SUBTOTAL', isGroup: false, isSubtotal: true, isTotal: false, colI: 10517919677.51, colII: 1424593692.20, colIII: 0, colIV: 12928157960.26, colVIII: 8302580247.85, colIX: 0, colXI: 671189775.24, colXII: 152875113.27 },
  { rowOrder: 27, level: 0, rowLabel: 'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL (IV)', groupKey: 'PREVIDENCIA', isGroup: true, isSubtotal: false, isTotal: false, colI: 10315675622.62, colII: 39050757.21, colIII: 0, colIV: 699302944.75, colVIII: 92946650.61, colIX: 0, colXI: 813977240.00, colXII: 0 },
  { rowOrder: 28, level: 0, rowLabel: 'TOTAL (V=III+IV)', groupKey: 'TOTAL', isGroup: false, isSubtotal: false, isTotal: true, colI: 20833595300.13, colII: 1463644449.41, colIII: 0, colIV: 13627460905.01, colVIII: 8395526898.46, colIX: 0, colXI: 1485167015.24, colXII: 152875113.27 },
]

const r2 = (n: number) => Math.round(n * 100) / 100

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.subsetInput.deleteMany()
  await prisma.sepInput.deleteMany()
  await prisma.financialLine.deleteMany()
  await prisma.sigefesUpload.deleteMany()
  await prisma.user.deleteMany()

  const hash = await bcrypt.hash('Sistema@2026', 12)

  // ── Users ──────────────────────────────────────────────────────────────────
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

  // ── SigefesUpload — Abril/2026 ────────────────────────────────────────────
  const uploadAbr = await prisma.sigefesUpload.create({
    data: { monthRef: '2026-04', referenceDate: '22/04/2026', fileName: 'controle_art42_reestruturado_v2.xlsx', isLatest: true, uploadedById: subset.id, createdAt: new Date('2026-04-23T08:41:00') },
  })
  console.log('✅ SigefesUpload Abr/2026 criado')

  // ── FinancialLines — Abril/2026 (valores reais do protótipo) ──────────────
  await prisma.financialLine.createMany({
    data: APR_LINES.map(l => ({
      uploadId: uploadAbr.id,
      rowOrder: l.rowOrder, level: l.level,
      rowLabel: l.rowLabel, groupKey: l.groupKey,
      isGroup: l.isGroup, isSubtotal: l.isSubtotal, isTotal: l.isTotal,
      colI: l.colI, colII: l.colII, colIII: l.colIII, colIV: l.colIV,
      colV: r2(l.colI - l.colII - l.colIII - l.colIV),
      colVI: 0, colVII: 0, colVIII: l.colVIII,
      colIX: l.colIX, colX: 0, colXI: l.colXI, colXII: l.colXII,
    })),
  })
  console.log('✅ 29 FinancialLines Abr/2026 criadas (valores reais)')

  void sefaz; void sep; void admin

  console.log('\n✅ Seed concluído: 29 linhas financeiras — Abr/2026')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
