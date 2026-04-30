/**
 * Testes de integração para GET /api/dashboard
 * Mocks: next-auth (getServerSession) + @/lib/db/prisma
 */

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    sigefesUpload: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { GET } from '@/app/api/dashboard/route'

const mockSession = { user: { id: 'u1', name: 'Auditor', role: 'ADMIN' } }

const mockUpload = {
  id: 'upload-1',
  monthRef: '2026-04',
  referenceDate: '30/04/2026',
  createdAt: new Date('2026-04-30T10:00:00Z'),
  uploadedBy: { name: 'João' },
  lines: [
    {
      id: 'line-1', rowOrder: 0, rowLabel: 'RECURSOS DO TESOURO',
      groupKey: 'TESOURO', isGroup: true, isSubtotal: false, isTotal: false, level: 0,
      colI: 1000, colII: 0, colIII: 0, colIV: 0, colV: 1000,
      colVI: 0, colVIAdjusted: null, colVII: 0, colVIII: 0,
      colIX: 0, colIXAdjusted: null, colX: 0, colXI: 0, colXII: 0,
    },
    {
      id: 'line-2', rowOrder: 1, rowLabel: 'Recursos Ordinários',
      groupKey: 'TESOURO', isGroup: false, isSubtotal: false, isTotal: false, level: 1,
      colI: 500, colII: 0, colIII: 0, colIV: 0, colV: 500,
      colVI: 0, colVIAdjusted: null, colVII: 0, colVIII: 0,
      colIX: 0, colIXAdjusted: null, colX: 0, colXI: 0, colXII: 0,
    },
  ],
}

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/dashboard')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

beforeEach(() => jest.clearAllMocks())

// ── Autenticação ───────────────────────────────────────────────────────────────

describe('GET /api/dashboard — autenticação', () => {
  it('retorna 401 quando sessão ausente', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('retorna 200 quando sessão válida', async () => {
    jest.mocked(getServerSession).mockResolvedValue(mockSession)
    jest.mocked(prisma.sigefesUpload.findMany).mockResolvedValue([
      { monthRef: '2026-04', referenceDate: '30/04/2026', createdAt: new Date(), uploadedBy: { name: 'João' } },
    ] as any)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)

    const res = await GET(makeReq({ month: '2026-04' }))
    expect(res.status).toBe(200)
  })
})

// ── Sem dados ──────────────────────────────────────────────────────────────────

describe('GET /api/dashboard — sem dados', () => {
  it('retorna months vazio quando não há uploads', async () => {
    jest.mocked(getServerSession).mockResolvedValue(mockSession)
    jest.mocked(prisma.sigefesUpload.findMany).mockResolvedValue([])

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.months).toEqual([])
    expect(body.rows).toEqual([])
    expect(body.referenceDate).toBeNull()
  })

  it('retorna rows vazio quando mês solicitado não existe', async () => {
    jest.mocked(getServerSession).mockResolvedValue(mockSession)
    jest.mocked(prisma.sigefesUpload.findMany).mockResolvedValue([
      { monthRef: '2026-03', referenceDate: null, createdAt: new Date(), uploadedBy: { name: 'João' } },
    ] as any)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(null)

    const res = await GET(makeReq({ month: '2026-04' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toEqual([])
  })
})

// ── Estrutura de dados ─────────────────────────────────────────────────────────

describe('GET /api/dashboard — estrutura de resposta', () => {
  beforeEach(() => {
    jest.mocked(getServerSession).mockResolvedValue(mockSession)
    jest.mocked(prisma.sigefesUpload.findMany).mockResolvedValue([
      { monthRef: '2026-04', referenceDate: '30/04/2026', createdAt: new Date(), uploadedBy: { name: 'João' } },
    ] as any)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)
  })

  it('retorna lista de meses disponíveis', async () => {
    const res = await GET(makeReq({ month: '2026-04' }))
    const body = await res.json()
    expect(body.months).toContain('2026-04')
  })

  it('retorna referenceDate corretamente', async () => {
    const res = await GET(makeReq({ month: '2026-04' }))
    const body = await res.json()
    expect(body.referenceDate).toBe('30/04/2026')
  })

  it('retorna uploadedAt formatado', async () => {
    const res = await GET(makeReq({ month: '2026-04' }))
    const body = await res.json()
    expect(body.uploadedAt).toBeDefined()
    expect(typeof body.uploadedAt).toBe('string')
  })

  it('linhas de grupo têm children array', async () => {
    const res = await GET(makeReq({ month: '2026-04' }))
    const body = await res.json()
    const groupRow = body.rows.find((r: any) => r.isGroup)
    expect(groupRow).toBeDefined()
    expect(Array.isArray(groupRow.children)).toBe(true)
  })

  it('filhos do grupo têm groupKey correspondente', async () => {
    const res = await GET(makeReq({ month: '2026-04' }))
    const body = await res.json()
    const groupRow = body.rows.find((r: any) => r.isGroup)
    groupRow.children.forEach((child: any) => {
      expect(child.groupKey).toBe(groupRow.groupKey)
    })
  })

  it('usa o mês mais recente quando month param não fornecido', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    expect(prisma.sigefesUpload.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ monthRef: '2026-04' }) })
    )
  })
})
