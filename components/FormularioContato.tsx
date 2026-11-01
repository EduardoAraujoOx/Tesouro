'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { areaPorId, gerencias, rotuloArea, subgerenciasDe } from '@/lib/areas'

type Campos = { gerencia: string; subgerencia: string; nome: string; email: string; orgao: string; assunto: string; mensagem: string; aceite: boolean }
type Erros = Partial<Record<keyof Campos, string>>
type Estado = { tipo: 'preenchendo' } | { tipo: 'enviando' } | { tipo: 'ok'; protocolo: string; destino: string } | { tipo: 'falha'; motivo: 'indisponivel' | 'limite' | 'envio' }

const VAZIO: Campos = { gerencia: 'subset', subgerencia: '', nome: '', email: '', orgao: '', assunto: '', mensagem: '', aceite: false }
const MAX_MENSAGEM = 3000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validar(c: Campos): Erros {
  const e: Erros = {}
  if (c.nome.trim().length < 3) e.nome = 'Informe seu nome.'
  if (!EMAIL.test(c.email.trim())) e.email = 'Informe um e-mail válido, como nome@exemplo.com.br.'
  if (c.assunto.trim().length < 5) e.assunto = 'Informe o assunto, com pelo menos 5 caracteres.'
  if (c.mensagem.trim().length < 20) e.mensagem = 'Escreva a mensagem com pelo menos 20 caracteres.'
  if (!c.aceite) e.aceite = 'Marque a caixa para concordar com o uso dos dados.'
  return e
}

const entrada = 'mt-1 w-full rounded-brand border border-ink-soft/50 bg-paper px-3 text-body text-ink placeholder:text-ink-soft'

/**
 * Formulário do Fale conosco: o leitor escolhe a área (Subsecretaria, gerência e subgerência) e escreve a mensagem.
 * Acessível: rótulos visíveis, erros ligados aos campos, resumo de erros com foco e confirmação anunciada.
 */
export function FormularioContato({ habilitado }: { habilitado: boolean }) {
  const uid = useId()
  const [c, setC] = useState<Campos>(VAZIO)
  const [erros, setErros] = useState<Erros>({})
  const [estado, setEstado] = useState<Estado>({ tipo: 'preenchendo' })
  const inicio = useRef(0)
  const resumo = useRef<HTMLDivElement>(null)
  const confirmacao = useRef<HTMLDivElement>(null)
  const [site, setSite] = useState('') // armadilha para robôs

  useEffect(() => { inicio.current = Date.now() }, [])
  useEffect(() => { if (estado.tipo === 'ok') confirmacao.current?.focus() }, [estado.tipo])

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setC((a) => ({ ...a, [k]: v }))
  const subs = c.gerencia === 'subset' ? [] : subgerenciasDe(c.gerencia)
  const destino = areaPorId(c.subgerencia || c.gerencia)
  const id = (k: string) => `${uid}-${k}`

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    const e = validar(c)
    setErros(e)
    if (Object.keys(e).length) { setTimeout(() => resumo.current?.focus(), 0); return }
    setEstado({ tipo: 'enviando' })
    try {
      const r = await fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...c, site, t: inicio.current }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.ok) return setEstado({ tipo: 'ok', protocolo: j.protocolo, destino: j.destino ?? (destino ? rotuloArea(destino) : '') })
      if (r.status === 422 && j.campos) { setErros(j.campos); setEstado({ tipo: 'preenchendo' }); return setTimeout(() => resumo.current?.focus(), 0) }
      setEstado({ tipo: 'falha', motivo: r.status === 503 ? 'indisponivel' : r.status === 429 ? 'limite' : 'envio' })
    } catch {
      setEstado({ tipo: 'falha', motivo: 'envio' })
    }
  }

  if (estado.tipo === 'ok') {
    return (
      <div ref={confirmacao} tabIndex={-1} role="status" className="rounded-brand border-2 border-navy p-6 md:p-8">
        <h2 className="text-section">Mensagem enviada</h2>
        <span className="accent-bar" aria-hidden="true" />
        <p className="mt-4 text-lead">Sua mensagem foi encaminhada para <strong>{estado.destino}</strong>.</p>
        <p className="mt-3 text-body text-ink-soft">Protocolo: <strong className="text-ink">{estado.protocolo}</strong>. Guarde o número. A resposta será enviada para o e-mail que você informou.</p>
        <button type="button" onClick={() => { setC(VAZIO); setErros({}); setEstado({ tipo: 'preenchendo' }); inicio.current = Date.now() }} className="mt-6 inline-flex min-h-11 items-center rounded-brand border border-navy px-5 text-body font-semibold text-navy hover:bg-surface">
          Enviar outra mensagem
        </button>
      </div>
    )
  }

  const lista = Object.entries(erros) as [keyof Campos, string][]
  const campo = (k: keyof Campos) => ({ 'aria-invalid': erros[k] ? true : undefined, 'aria-describedby': erros[k] ? id(`${k}-erro`) : undefined })
  const msgErro = (k: keyof Campos) => erros[k] && <p id={id(`${k}-erro`)} className="mt-1 text-small font-semibold text-ink">{erros[k]}</p>

  return (
    <form onSubmit={enviar} noValidate aria-describedby={lista.length ? id('resumo') : undefined}>
      {!habilitado && (
        <p role="note" className="mb-6 rounded-brand bg-surface p-4 text-small text-ink-soft">
          <strong className="text-ink">Envio em implantação.</strong> Você já pode escolher a área e escrever, mas as mensagens ainda não estão sendo entregues por este formulário. Para falar com o Tesouro agora, use o telefone ou o canal da SEFAZ ao lado.
        </p>
      )}
      {lista.length > 0 && (
        <div ref={resumo} id={id('resumo')} tabIndex={-1} role="alert" className="mb-6 rounded-brand border-2 border-navy p-4">
          <p className="text-body font-semibold">Corrija {lista.length === 1 ? 'o campo abaixo' : `os ${lista.length} campos abaixo`} para enviar:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
            {lista.map(([k, m]) => <li key={k}><a href={`#${id(k)}`} className="font-medium text-navy underline underline-offset-4">{m}</a></li>)}
          </ul>
        </div>
      )}

      <fieldset>
        <legend className="text-title font-semibold">Para quem é a mensagem?</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={id('gerencia')} className="block text-small font-semibold">Subsecretaria ou gerência</label>
            <select id={id('gerencia')} value={c.gerencia} onChange={(e) => setC((a) => ({ ...a, gerencia: e.target.value, subgerencia: '' }))} className={`${entrada} h-12`}>
              <option value="subset">Subsecretaria do Tesouro Estadual (SUBSET)</option>
              {gerencias.map((g) => <option key={g.id} value={g.id}>{g.nome} ({g.sigla})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id('subgerencia')} className="block text-small font-semibold">Subgerência</label>
            <select id={id('subgerencia')} value={c.subgerencia} onChange={(e) => set('subgerencia', e.target.value)} disabled={subs.length === 0} className={`${entrada} h-12 disabled:opacity-60`}>
              <option value="">{subs.length === 0 ? 'Não se aplica' : 'Qualquer assunto da gerência'}</option>
              {subs.map((s) => <option key={s.id} value={s.id}>{s.nome} ({s.sigla})</option>)}
            </select>
          </div>
        </div>
        {destino && (
          <p className="mt-3 rounded-brand bg-surface p-4 text-small text-ink-soft" aria-live="polite">
            <strong className="text-ink">{rotuloArea(destino)}.</strong> {destino.assuntos}
          </p>
        )}
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-title font-semibold">Seus dados</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={id('nome')} className="block text-small font-semibold">Nome <span className="font-normal text-ink-soft">(obrigatório)</span></label>
            <input id={id('nome')} value={c.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" maxLength={120} className={`${entrada} h-12`} {...campo('nome')} />
            {msgErro('nome')}
          </div>
          <div>
            <label htmlFor={id('email')} className="block text-small font-semibold">E-mail <span className="font-normal text-ink-soft">(obrigatório, para a resposta)</span></label>
            <input id={id('email')} type="email" value={c.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" maxLength={160} className={`${entrada} h-12`} {...campo('email')} />
            {msgErro('email')}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id('orgao')} className="block text-small font-semibold">Órgão ou instituição <span className="font-normal text-ink-soft">(opcional)</span></label>
            <input id={id('orgao')} value={c.orgao} onChange={(e) => set('orgao', e.target.value)} autoComplete="organization" maxLength={160} className={`${entrada} h-12`} />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-title font-semibold">Mensagem</legend>
        <div className="mt-3">
          <label htmlFor={id('assunto')} className="block text-small font-semibold">Assunto <span className="font-normal text-ink-soft">(obrigatório)</span></label>
          <input id={id('assunto')} value={c.assunto} onChange={(e) => set('assunto', e.target.value)} maxLength={140} className={`${entrada} h-12`} {...campo('assunto')} />
          {msgErro('assunto')}
        </div>
        <div className="mt-4">
          <label htmlFor={id('mensagem')} className="block text-small font-semibold">Sua mensagem <span className="font-normal text-ink-soft">(obrigatório)</span></label>
          <textarea id={id('mensagem')} value={c.mensagem} onChange={(e) => set('mensagem', e.target.value)} rows={8} maxLength={MAX_MENSAGEM} className={`${entrada} py-3`} {...campo('mensagem')} />
          <p className="mt-1 text-small text-ink-soft" aria-live="off">{c.mensagem.length} de {MAX_MENSAGEM} caracteres. Não informe senhas nem dados bancários.</p>
          {msgErro('mensagem')}
        </div>
      </fieldset>

      {/* Campo escondido: pessoas não o veem nem o alcançam; robôs costumam preenchê-lo */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Não preencha este campo<input tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} name="site" /></label>
      </div>

      <div className="mt-6">
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input id={id('aceite')} type="checkbox" checked={c.aceite} onChange={(e) => set('aceite', e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--navy))]" {...campo('aceite')} />
          <span className="text-body">Concordo que o Tesouro Estadual use meu nome e e-mail apenas para responder a esta mensagem. <span className="text-ink-soft">O portal não guarda a mensagem: ela é encaminhada por e-mail à área escolhida.</span></span>
        </label>
        {msgErro('aceite')}
      </div>

      {estado.tipo === 'falha' && (
        <p role="alert" className="mt-6 rounded-brand border-2 border-navy p-4 text-body">
          {estado.motivo === 'indisponivel' && 'O envio por este formulário ainda não está disponível. Sua mensagem continua aqui; copie o texto e use o telefone ou o canal da SEFAZ.'}
          {estado.motivo === 'limite' && 'Foram feitos muitos envios em pouco tempo. Aguarde alguns minutos e tente de novo.'}
          {estado.motivo === 'envio' && 'Não foi possível enviar agora. Sua mensagem continua aqui; tente novamente em instantes.'}
        </p>
      )}

      <button type="submit" disabled={estado.tipo === 'enviando'} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-brand bg-navy px-8 text-body font-semibold text-on-navy hover:bg-navy-deep disabled:opacity-70">
        {estado.tipo === 'enviando' ? 'Enviando…' : 'Enviar mensagem'}
      </button>
    </form>
  )
}
