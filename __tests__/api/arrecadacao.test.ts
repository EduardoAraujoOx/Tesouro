/**
 * Testes de integração para GET e POST /api/arrecadacao
 * Mocks: next-auth + @/lib/db/prisma
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
    subsetInput: { updateMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { GET, POST } from '@/app/api/arrecadacao/route'

const SESSION_ADMIN  = { user: { id: 'u1', name: 'Admin', role: 'ADMIN' } }
const SESSION_SUBSET = { user: { id: 'u2', name: 'Subset', role: 'SUBSET' } }
const SESSION_SEP    = { user: { id: 'u3', name: 'Sep', role: 'SEP' } }
const SESSION_VIEWER = { user: { id: 'u4', name: 'Viewer', role: 'VIEWER' } }

const mockLines = [
  { id: 'l1', rowOrder: 0, rowLabel: 'TESOURO', isGroup: true, isSubtotal: false, isTotal: false },
  { id: 'l2', rowOrder: 1, rowLabel: 'Recursos Ordinários', isGroup: false, isSubtotal: false, isTotal: false },
]

const mockUpload = { id: 'up-1', monthRef: '2026-04', lines: mockLines }

function makeGetReq(month?: string) {
  const url = new URL('http://localhost/api/arrecadacao')
  if (month) url.searchParams.set('month', month)
  return new NextRequest(url)
}

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/arrecadacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(prisma.financialLine.update).mockResolvedValue({} as any)
  jest.mocked(prisma.subsetInput.updateMany).mockResolvedValue({ count: 0 } as any)
  jest.mocked(prisma.subsetInput.create).mockResolvedValue({} as any)
  jest.mocked(prisma.auditLog.create).mockResolvedValue({} as any)
})

// ── GET — autenticação ─────────────────────────────────────────────────────────

describe('GET /api/arrecadacao — autenticação', () => {
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

describe('GET /api/arrecadacao — dados', () => {
  it('retorna lines e uploadId quando upload existe', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)

    const res = await GET(makeGetReq('2026-04'))
    const body = await res.json()
    expect(body.lines).toHaveLength(2)
    expect(body.uploadId).toBe('up-1')
    expect(body.monthRef).toBe('2026-04')
  })

  it('retorna lines vazio quando upload não existe', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(null)

    const res = await GET(makeGetReq('2026-04'))
    const body = await res.json()
    expect(body.lines).toEqual([])
  })

  it('inclui todas as linhas (grupos, detalhes, subtotais e totais)', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findFirst).mockResolvedValue(mockUpload as any)

    await GET(makeGetReq('2026-04'))
    const call = jest.mocked(prisma.sigefesUpload.findFirst).mock.calls[0][0] as any
    // Não deve haver filtro excluindo subtotais/totais
    expect(call?.include?.lines?.where).toBeUndefined()
  })
})

// ── POST — autenticação e autorização ─────────────────────────────────────────

describe('POST /api/arrecadacao — autenticação e autorização', () => {
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

  it('retorna 403 para role SEP (apenas ADMIN/SUBSET podem gravar VI)', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_SEP)
    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(403)
  })

  it('aceita role ADMIN', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN)
    jest.mocked(prisma.sigefesUpload.findUnique).mockResolvedValue({ monthRef: '2026-04' } as any)

    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(200)
  })

  it('aceita role SUBSET', async () => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_SUBSET)
    jest.mocked(prisma.sigefesUpload.findUnique).mockResolvedValue({ monthRef: '2026-04' } as any)

    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(res.status).toBe(200)
  })
})

// ── POST — persistência ────────────────────────────────────────────────────────

describe('POST /api/arrecadacao — persistência', () => {
  beforeEach(() => {
    jest.mocked(getServerSession).mockResolvedValue(SESSION_SUBSET)
    jest.mocked(prisma.sigefesUpload.findUnique).mockResolvedValue({ monthRef: '2026-04' } as any)
  })

  it('chama financialLine.update para cada valor', async () => {
    const values = [
      { lineId: 'l1', value: 50000 },
      { lineId: 'l2', value: 30000 },
    ]
    await POST(makePostReq({ uploadId: 'up-1', values }))
    expect(prisma.financialLine.update).toHaveBeenCalledTimes(2)
  })

  it('salva colVIAdjusted corretamente', async () => {
    const values = [{ lineId: 'l1', value: 99000, note: 'projeção março' }]
    await POST(makePostReq({ uploadId: 'up-1', values }))
    expect(prisma.financialLine.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { colVIAdjusted: 99000, colVINote: 'projeção março' },
    })
  })

  it('aceita value null (limpar o ajuste)', async () => {
    const values = [{ lineId: 'l1', value: null }]
    await POST(makePostReq({ uploadId: 'up-1', values }))
    expect(prisma.financialLine.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ colVIAdjusted: null }) })
    )
  })

  it('cria subsetInput com isLatest=true', async () => {
    await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    expect(prisma.subsetInput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isLatest: true, uploadId: 'up-1' }),
      })
    )
  })

  it('registra auditLog com ação UPDATE_VI', async () => {
    await POST(makePostReq({ uploadId: 'up-1', values: [{ lineId: 'l1', value: 100 }] }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'UPDATE_VI' }),
      })
    )
  })

  it('retorna success: true no body', async () => {
    const res = await POST(makePostReq({ uploadId: 'up-1', values: [] }))
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
