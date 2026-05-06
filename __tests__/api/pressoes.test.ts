/**
 * Testes de integração para GET e POST /api/pressoes
 * Mocks: next-auth + @/lib/db/prisma
 *
 * Pressões (colIX) são gerenciadas pelo perfil SEP, enquanto
 * Arrecadação (colVI) é gerenciada pelo SUBSET. Esta é a diferença
 * central entre as duas rotas.
 */

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    sigefesUpload: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    financialLine: { update: jest.fn() },
    sepInput: { updateMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { GET, POST } from '@/app/api/pressoes/route'

const SESSION_ADMIN  = { user: { id: 'u1', name: 'Admin', role: 'ADMIN' } }
const SESSION_SEP    = { user: { id: 'u2', name: 'Sep', role: 'SEP' } }
const SESSION_SUBSET = { user: { id: 'u3', name: 'Subset', role: 'SUBSET' } }
const SESSION_VIEWER = { user: { id: 'u4', name: 'Viewer', role: 'VIEWER' } }

const mockUpload = {
  id: 'up-1',
  monthRef: '2026-04',
  lines: [
    { id: 'l1', rowOrder: 0, rowLabel: 'TESOURO', isGroup: true, isSubtotal: false, isTotal: false },
    { id: 'l2', rowOrder: 1, rowLabel: 'Recursos Ordinários', isGroup: false, isSubtotal: false, isTotal: false },
  ],
}

function makeGetReq(month?: string) {
  const url = new URL('http://localhost/api/pressoes')
  if (month) url.searchParams.set('month', month)
  return new NextRequest(url)
}

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/pressoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(prisma.financialLine.update).mockResolvedValue({} as any)
  jest.mocked(prisma.sepInput.updateMany).mockResolvedValue({ count: 0 } as any)
  jest.mocked(prisma.sepInput.create).mockResolvedValue({} as any)
  jest.mocked(prisma.auditLog.create).mockResolvedValue({} as any)
})

// ── GET — autenticação ─────────────────────────────────────────────────────────

describe('GET /api/pressoes — autenticação', () => {
  it('retorna 401 sem sessão', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(makeGetReq())
    expect(res.status).toBe(401)
  })

  it('retorna 200 com sessão válida', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)
    const res = await GET(makeGetReq('2026-04'))
    expect(res.status).toBe(200)
  })
})

// ── GET — dados ────────────────────────────────────────────────────────────────

describe('GET /api/pressoes — dados', () => {
  it('retorna lines e uploadId quando upload existe', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)

    const res = await GET(makeGetReq('2026-04'))
    const body = await res.json()
    expect(body.lines).toHaveLength(2)
    expect(body.uploadId).toBe('up-1')
    expect(body.monthRef).toBe('2026-04')
  })

  it('retorna lines vazio quando nenhum upload existe', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(null)

    const res = await GET(makeGetReq())
    const body = await res.json()
    expect(body.lines).toEqual([])
  })

  it('busca upload mais recente quando month param não fornecido', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)

    await GET(makeGetReq())
    expect(prisma.sigefesUpload.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isLatest: true } })
    )
  })
})

// ── POST — autorização por role ────────────────────────────────────────────────

describe('POST /api/pressoes — autorização por role', () => {
  it('retorna 401 sem sessão', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 para role VIEWER', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_VIEWER)
    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(403)
  })

  it('retorna 403 para role SUBSET (apenas ADMIN/SEP podem gravar IX)', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_SUBSET)
    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(403)
  })

  it('aceita role ADMIN', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findUnique).mockResolvedValue({ monthRef: '2026-04' } as any)

    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(200)
  })

  it('aceita role SEP', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_SEP)
    jest.mocked(prisma.sigefesUpload.findUnique).mockResolvedValue({ monthRef: '2026-04' } as any)

    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(200)
  })
})

// ── POST — persistência ────────────────────────────────────────────────────────

describe('POST /api/pressoes — persistência', () => {
  beforeEach(() => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_SEP)
    jest.mocked(prisma.sigefesUpload.findUnique).mockResolvedValue({ monthRef: '2026-04' } as any)
  })

  it('chama financialLine.update para cada valor', async () => {
    const values = [{ lineId: 'l1', value: 80000 }, { lineId: 'l2', value: 40000 }]
    await POST(makePostReq({ uploadId: 'up-1', values }))
    expect(prisma.financialLine.update).toHaveBeenCalledTimes(2)
  })

  it('salva colIXAdjusted (não colVIAdjusted)', async () => {
    const values = [{ lineId: 'l1', value: 75000, note: 'folha março' }]
    await POST(makePostReq({ uploadId: 'up-1', values }))
    expect(prisma.financialLine.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { colIXAdjusted: 75000, colIXNote: 'folha março' },
    })
  })

  it('não salva colVIAdjusted (separação de responsabilidade SUBSET vs SEP)', async () => {
    await POST(makePostReq({ uploadId: 'up-1', values: [{ lineId: 'l1', value: 1 }] }))
    const call = jest.mocked(prisma.financialLine.update).mock.calls[0][0]
    expect(call.data).not.toHaveProperty('colVIAdjusted')
  })

  it('cria sepInput com isLatest=true', async () => {
    await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(prisma.sepInput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isLatest: true, uploadId: 'up-1' }),
      })
    )
  })

  it('registra auditLog com ação UPDATE_IX', async () => {
    await POST(makePostReq({ uploadId: 'up-1', values: [{ lineId: 'l1', value: 1 }] }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'UPDATE_IX' }),
      })
    )
  })

  it('retorna success: true no body', async () => {
    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
