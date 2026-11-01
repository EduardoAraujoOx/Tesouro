import { NextResponse } from 'next/server'
import { areaPorId, rotuloArea } from '@/lib/areas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Recebe mensagens do Fale conosco e as encaminha por e-mail à área escolhida.
 * Nada é guardado no portal. Configuração por variáveis de ambiente (Vercel):
 *   RESEND_API_KEY        chave do serviço de e-mail (Resend)
 *   CONTATO_REMETENTE     remetente verificado no serviço, ex.: "Tesouro Estadual <contato@dominio.gov.br>"
 *   CONTATO_EMAIL_PADRAO  destino quando a área não tem e-mail próprio (ex.: caixa da Subsecretaria)
 *   CONTATO_MODO_TESTE=1  só valida e devolve protocolo, sem enviar (uso em desenvolvimento)
 */

const LIMITES = { nome: 120, email: 160, orgao: 160, assunto: 140, mensagem: 3000 }
const tentativas = new Map<string, number[]>() // melhor esforço: por instância, não substitui um serviço antirrobô

const limpa = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, max) : '')
const umaLinha = (v: string) => v.replace(/[\r\n]+/g, ' ').trim()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function protocolo() {
  const d = new Date()
  const data = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  return `TES-${data}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function excedeu(ip: string) {
  const agora = Date.now()
  const recentes = (tentativas.get(ip) ?? []).filter((t) => agora - t < 10 * 60_000)
  recentes.push(agora)
  tentativas.set(ip, recentes)
  return recentes.length > 5
}

export async function POST(req: Request) {
  // só aceita pedidos vindos do próprio site
  const origem = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origem && host && new URL(origem).host !== host) return NextResponse.json({ erro: 'origem' }, { status: 403 })
  if (Number(req.headers.get('content-length') ?? 0) > 20_000) return NextResponse.json({ erro: 'tamanho' }, { status: 413 })

  let corpo: Record<string, unknown>
  try { corpo = await req.json() } catch { return NextResponse.json({ erro: 'formato' }, { status: 400 }) }

  // armadilha para robôs: campo escondido preenchido ou envio rápido demais; responde "ok" sem enviar
  const t = Number(corpo.t)
  if (limpa(corpo.site, 50) || (Number.isFinite(t) && Date.now() - t < 3000)) return NextResponse.json({ ok: true, protocolo: protocolo() })

  const ip = (req.headers.get('x-forwarded-for') ?? 'desconhecido').split(',')[0].trim()
  if (excedeu(ip)) return NextResponse.json({ erro: 'limite' }, { status: 429 })

  const nome = limpa(corpo.nome, LIMITES.nome)
  const email = limpa(corpo.email, LIMITES.email)
  const orgao = limpa(corpo.orgao, LIMITES.orgao)
  const assunto = limpa(corpo.assunto, LIMITES.assunto)
  const mensagem = limpa(corpo.mensagem, LIMITES.mensagem)
  const area = areaPorId(limpa(corpo.subgerencia, 30) || limpa(corpo.gerencia, 30) || 'subset')
  const erros: Record<string, string> = {}
  if (!area) erros.gerencia = 'Escolha para quem enviar.'
  if (nome.length < 3) erros.nome = 'Informe seu nome.'
  if (!EMAIL.test(email)) erros.email = 'Informe um e-mail válido.'
  if (assunto.length < 5) erros.assunto = 'Informe o assunto.'
  if (mensagem.length < 20) erros.mensagem = 'Escreva a mensagem com pelo menos 20 caracteres.'
  if (corpo.aceite !== true) erros.aceite = 'É preciso concordar com o uso dos dados para responder.'
  if (Object.keys(erros).length || !area) return NextResponse.json({ erro: 'validacao', campos: erros }, { status: 422 })

  const numero = protocolo()
  if (process.env.CONTATO_MODO_TESTE === '1') return NextResponse.json({ ok: true, protocolo: numero, destino: rotuloArea(area), teste: true })

  const chave = process.env.RESEND_API_KEY
  const remetente = process.env.CONTATO_REMETENTE
  const destino = area.email ?? process.env.CONTATO_EMAIL_PADRAO
  if (!chave || !remetente || !destino) return NextResponse.json({ erro: 'indisponivel' }, { status: 503 })

  const texto = [
    `Protocolo: ${numero}`,
    `Para: ${rotuloArea(area)}`,
    '',
    `Nome: ${nome}`,
    `E-mail: ${email}`,
    `Órgão ou instituição: ${orgao || 'não informado'}`,
    `Assunto: ${assunto}`,
    '',
    mensagem,
    '',
    '--',
    'Mensagem enviada pelo formulário Fale conosco do portal do Tesouro Estadual. Responda a este e-mail para falar com quem escreveu.',
  ].join('\n')

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remetente, to: [destino], reply_to: email, subject: `[Fale conosco] ${umaLinha(assunto)} (${numero})`, text: texto }),
    })
    if (!r.ok) return NextResponse.json({ erro: 'envio' }, { status: 502 })
  } catch {
    return NextResponse.json({ erro: 'envio' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, protocolo: numero, destino: rotuloArea(area) })
}
