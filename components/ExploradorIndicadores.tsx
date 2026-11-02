'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { GraficoExplorador, type ModoGrafico, type PontoGrafico, type SerieGrafico } from './GraficoExplorador'
import { IconChevron } from './Icons'
import type { Familia, Indicador } from '@/lib/indicadores'
import { numero } from '@/lib/formato'

const MAXIMO = 3
const GRUPOS: { id: Familia; nome: string }[] = [
  { id: 'lrf', nome: 'Limites da LRF' },
  { id: 'capag', nome: 'CAPAG' },
]
const SEGUNDOS_POR_GRAFICO = 9

type Nota = { id: string; ano: number; sub: number; texto: string }

/*
 * Hierarquia tipográfica do painel (a mesma do restante do portal):
 *  - título da página: serif, text-headline;
 *  - título de bloco: serif, text-title;
 *  - rótulo de grupo ou de controle: sans, text-label em caixa alta;
 *  - texto corrido: sans, text-body (a definição do indicador usa text-lead).
 */
const rotulo = 'text-label font-semibold uppercase text-ink-soft'

/** Miniatura da série, só decorativa: o valor e o nome já estão em texto. */
function Miniatura({ pontos }: { pontos: PontoGrafico[] }) {
  const v = pontos.map((p) => p.valor).filter((x): x is number => x !== null)
  if (v.length < 2) return null
  const min = Math.min(...v), max = Math.max(...v)
  const faixa = max - min || 1
  const W = 56, H = 20
  const d = pontos
    .map((p, i) => (p.valor === null ? '' : `${i === 0 ? 'M' : 'L'}${((i / (pontos.length - 1)) * W).toFixed(1)},${(H - 2 - ((p.valor - min) / faixa) * (H - 4)).toFixed(1)}`))
    .join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <path d={d} fill="none" className="stroke-current" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Painel quantitativo: título, definição em destaque e gráfico grande, com a lista de indicadores ao lado.
 * Trocar de indicador anima a transição; a apresentação automática passa pelos gráficos em sequência.
 * A escolha vai para o endereço da página, então pode ser compartilhada.
 */
export function ExploradorIndicadores({ indicadores, notas, classificacoes, geradoEm }: { indicadores: Indicador[]; notas: Nota[]; classificacoes: Record<number, string | null>; geradoEm: string }) {
  const uid = useId()
  const [familia, setFamilia] = useState<Familia>('lrf')
  const [ids, setIds] = useState<string[]>(['pessoal'])
  const [foco, setFoco] = useState<number | null>(null)
  const [modo, setModo] = useState<ModoGrafico>('barras')
  const [zero, setZero] = useState(true)
  const [mostrarLimites, setMostrarLimites] = useState(true)
  const [anoAnterior, setAnoAnterior] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [movimentoReduzido, setMovimentoReduzido] = useState(false)
  const [aviso, setAviso] = useState('')
  const [pronto, setPronto] = useState(false)
  const botoesLista = useRef<Record<string, HTMLButtonElement | null>>({})

  const daFamilia = useMemo(() => indicadores.filter((i) => i.familia === familia), [indicadores, familia])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const atualiza = () => setMovimentoReduzido(mq.matches)
    atualiza(); mq.addEventListener('change', atualiza)
    return () => mq.removeEventListener('change', atualiza)
  }, [])

  // lê a escolha do endereço, uma vez
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const f: Familia = q.get('g') === 'capag' ? 'capag' : 'lrf'
    const lista = indicadores.filter((i) => i.familia === f)
    const pedidos = (q.get('i') ?? '').split(',').filter((x) => lista.some((i) => i.id === x)).slice(0, MAXIMO)
    setFamilia(f)
    setIds(pedidos.length ? pedidos : [f === 'capag' ? 'endividamento' : 'pessoal'])
    if (q.get('v') === 'linha') { setModo('linha'); setZero(false) }
    if (q.get('z') === '1') setZero(true)
    if (q.get('z') === '0') setZero(false)
    setPronto(true)
  }, [indicadores])

  // grava a escolha no endereço
  useEffect(() => {
    if (!pronto) return
    const q = new URLSearchParams()
    q.set('g', familia)
    q.set('i', ids.join(','))
    if (modo === 'linha') q.set('v', 'linha')
    if (zero !== (modo === 'barras')) q.set('z', zero ? '1' : '0')
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}${window.location.hash}`)
  }, [pronto, familia, ids, modo, zero])

  const escolhidos = ids.map((id) => daFamilia.find((i) => i.id === id)).filter((i): i is Indicador => !!i)
  const principal = escolhidos[0]
  const comparando = escolhidos.length > 1
  const posicao = indicadores.findIndex((i) => i.id === principal.id)

  const series: SerieGrafico[] = escolhidos.map((i) => ({ id: i.id, curto: i.curto, acumulaNoAno: i.acumulaNoAno, pontos: i.pontos }))
  if (anoAnterior && !comparando) {
    series.push({
      id: 'anterior', curto: 'Mesmo período do ano anterior', anterior: true, acumulaNoAno: principal.acumulaNoAno,
      pontos: principal.pontos.map((p) => ({ ...p, valor: principal.pontos.find((q) => q.ano === p.ano - 1 && q.sub === p.sub)?.valor ?? null })),
    })
  }
  const n = series[0]?.pontos.length ?? 0
  const focoAtual = n === 0 ? 0 : Math.min(foco ?? n - 1, n - 1)
  const refs = !comparando && mostrarLimites ? principal.referencias : []
  const pontoFoco = series[0]?.pontos[focoAtual]
  const titulo = escolhidos.map((i) => i.curto).join(', ')

  const escolher = useCallback((id: string) => {
    const novo = indicadores.find((i) => i.id === id)
    if (!novo) return
    setFamilia(novo.familia)
    setIds([id]); setFoco(null)
  }, [indicadores])
  const andar = (passo: number) => escolher(indicadores[(posicao + passo + indicadores.length) % indicadores.length].id)

  // setas para cima e para baixo percorrem a lista de indicadores
  const teclarLista = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!passo) return
    e.preventDefault()
    const alvo = indicadores[(posicao + passo + indicadores.length) % indicadores.length]
    escolher(alvo.id)
    setTimeout(() => botoesLista.current[alvo.id]?.focus(), 0)
  }

  // apresentação automática: passa pelos gráficos em sequência (para ao pairar, ao focar ou com movimento reduzido)
  const girando = tocando && !pausado && !movimentoReduzido
  useEffect(() => {
    if (!girando) return
    const t = setInterval(() => andar(1), SEGUNDOS_POR_GRAFICO * 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girando, posicao])

  const adicionar = (id: string) => { if (id) { setIds((a) => (a.includes(id) || a.length >= MAXIMO ? a : [...a, id])); setFoco(null) } }
  const remover = (id: string) => { setIds((a) => (a.length > 1 ? a.filter((x) => x !== id) : a)); setFoco(null) }

  const baixarCsv = useCallback(() => {
    const base = series.filter((s) => !s.anterior)
    const cab = ['periodo', 'ano', ...escolhidos.map((i) => i.id + '_pct')]
    const linhas = base[0].pontos.map((p, k) => [p.extenso, p.ano, ...base.map((s) => s.pontos[k].valor ?? '')].join(','))
    const blob = new Blob(['﻿' + [cab.join(','), ...linhas].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `indicadores-es-${ids.join('-')}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    setAviso('Arquivo CSV gerado.')
  }, [escolhidos, series, ids])

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setAviso('Link copiado. Ele reproduz esta escolha.') }
    catch { setAviso('Não foi possível copiar. Copie o endereço na barra do navegador: ele já reproduz esta escolha.') }
  }

  const abrirMetodologia = () => { document.getElementById('metodo')?.setAttribute('open', '') }

  // resumo do ponto em foco, em uma linha
  const resumo = (() => {
    if (!pontoFoco) return ''
    const v = pontoFoco.valor
    const partes = [`${numero(v, 1)}% em ${pontoFoco.extenso}`]
    const nota = principal.pontos.find((p) => p.ano === pontoFoco.ano && p.sub === pontoFoco.sub)?.nota
    if (!comparando && nota) partes.push(`nota ${nota}`)
    if (!comparando && familia === 'capag' && classificacoes[pontoFoco.ano]) partes.push(`classificação geral da CAPAG: ${classificacoes[pontoFoco.ano]}`)
    const limite = !comparando ? principal.referencias.find((r) => r.estilo === 'limite') : undefined
    if (limite && v !== null) partes.push(`folga de ${numero(limite.valor - v, 1)} p.p. até o limite legal de ${numero(limite.valor, 0)}%`)
    const ant = focoAtual > 0 && !(series[0].acumulaNoAno && series[0].pontos[focoAtual - 1].ano !== pontoFoco.ano) ? series[0].pontos[focoAtual - 1].valor : null
    if (!comparando && v !== null && ant !== null) { const d = Math.round((v - ant) * 100) / 100; partes.push(`${d > 0 ? '+' : d < 0 ? '−' : ''}${numero(Math.abs(d), 1)} p.p. sobre o período anterior`) }
    return partes.join(' · ')
  })()

  const botao = 'inline-flex min-h-11 items-center justify-center rounded-brand px-4 text-small font-semibold'
  const seletor = 'h-11 w-full rounded-brand border border-ink-soft/50 bg-paper px-3 text-body text-ink'
  const trocarModo = (m: ModoGrafico) => { setModo(m); setZero(m === 'barras') }
  const ultimoValor = (i: Indicador) => [...i.pontos].reverse().find((p) => p.valor !== null)?.valor ?? null

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) setPausado(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false) }}
    >
      {/* ---------- Título e definição ---------- */}
      <h1 key={principal.id} className="anim-aparece text-headline"><span className="md:hidden">{principal.curto}</span><span className="hidden md:inline">{principal.nome}</span></h1>
      <p className="mt-2 max-w-4xl text-body text-ink md:text-lead">{principal.definicao}</p>
      <p className="mt-1 text-small text-ink-soft">{principal.subtitulo}. <strong className="font-semibold text-ink">Limite:</strong> {principal.limite}.</p>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* ---------- Gráfico ---------- */}
        <div className="min-w-0 lg:col-span-9">
          <div className="rounded-brand border border-line bg-paper p-3 md:p-5">
            <GraficoExplorador series={series} referencias={refs} foco={focoAtual} onFoco={setFoco} titulo={titulo} modo={modo} zero={zero} animKey={ids.join('+')} />
            {n > 1 && pontoFoco && (
              <div className="mt-1">
                <label htmlFor={`${uid}-foco`} className="sr-only">Período em foco</label>
                <input
                  id={`${uid}-foco`} type="range" min={0} max={n - 1} step={1} value={focoAtual}
                  onChange={(e) => setFoco(Number(e.target.value))}
                  aria-valuetext={`${pontoFoco.extenso}: ${series.filter((s) => !s.anterior).map((s) => `${s.curto} ${numero(s.pontos[focoAtual].valor, 2)}%`).join('; ')}`}
                  className="h-11 w-full" style={{ accentColor: 'rgb(var(--navy))' }}
                />
                <p className="flex justify-between text-small text-ink-soft"><span>{series[0].pontos[0].rotulo}</span><span className="hidden sm:inline">Arraste ou use as setas para percorrer os períodos</span><span>{series[0].pontos[n - 1].rotulo}</span></p>
              </div>
            )}
            <p className="mt-3 min-h-6 text-body font-medium text-ink" aria-live="polite">{resumo}</p>
            {notas.filter((x) => ids.includes(x.id)).map((x) => (
              <p key={x.id + x.ano + x.sub} className="mt-4 rounded-brand bg-surface p-4 text-small text-ink-soft"><strong className="text-ink">Nota sobre a série.</strong> {x.texto}</p>
            ))}
          </div>

          {/* ---------- Como ler, para quem não conhece o assunto ---------- */}
          <section aria-labelledby={`${uid}-entenda`} className="mt-4 rounded-brand border-l-4 border-navy bg-surface p-4 md:p-6">
            <h2 id={`${uid}-entenda`} className="text-title">Entenda este indicador</h2>
            <div className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
              <div>
                <p className={rotulo}>Como ler</p>
                <p className="mt-1 text-body text-ink">{principal.leitura}</p>
                <p className={`${rotulo} mt-4`}>Como é calculado</p>
                <p className="mt-1 text-body text-ink">{principal.formula}.</p>
                <p className={`${rotulo} mt-4`}>Limite e base legal</p>
                <p className="mt-1 text-body text-ink">{principal.limite}. {principal.base}.</p>
              </div>
              {principal.termos && principal.termos.length > 0 && (
                <div>
                  <p className={rotulo}>Termos usados</p>
                  <dl className="mt-1 space-y-3">
                    {principal.termos.map((t) => (
                      <div key={t.termo}>
                        <dt className="text-body font-semibold text-ink">{t.termo}</dt>
                        <dd className="text-body text-ink-soft">{t.texto}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
            <a href="#metodo" onClick={abrirMetodologia} className="mt-4 inline-block text-small font-semibold text-navy underline underline-offset-4">Ver a metodologia e a definição de todos os indicadores</a>
          </section>
        </div>

        {/* ---------- Indicadores e opções, ao lado do gráfico ---------- */}
        <aside aria-label="Indicadores e opções do gráfico" className="space-y-5 lg:col-span-3">
          {/* celular: seletor com anterior e próximo */}
          <div className="lg:hidden">
            <label htmlFor={`${uid}-var`} className={rotulo}>Indicador</label>
            <div className="mt-1 flex items-center gap-2">
              <select id={`${uid}-var`} value={principal.id} onChange={(e) => escolher(e.target.value)} className={seletor}>
                {GRUPOS.map((g) => (
                  <optgroup key={g.id} label={g.nome}>
                    {indicadores.filter((i) => i.familia === g.id).map((i) => <option key={i.id} value={i.id}>{i.curto}</option>)}
                  </optgroup>
                ))}
              </select>
              <button type="button" onClick={() => andar(-1)} className={`${botao} shrink-0 border border-line text-ink hover:bg-surface`}><IconChevron className="h-4 w-4 rotate-90" /><span className="sr-only">Indicador anterior</span></button>
              <button type="button" onClick={() => andar(1)} className={`${botao} shrink-0 border border-line text-ink hover:bg-surface`}><IconChevron className="h-4 w-4 -rotate-90" /><span className="sr-only">Próximo indicador</span></button>
            </div>
          </div>

          {/* computador: lista com valor atual e miniatura de cada indicador */}
          <div className="hidden space-y-4 lg:block" onKeyDown={teclarLista}>
            {GRUPOS.map((g) => (
              <div key={g.id} role="group" aria-label={g.nome}>
                <p className={`${rotulo} mb-1`} aria-hidden="true">{g.nome}</p>
                <ul className="divide-y divide-line border-y border-line">
                  {indicadores.filter((i) => i.familia === g.id).map((i) => {
                    const ativo = principal.id === i.id
                    return (
                      <li key={i.id}>
                        <button
                          ref={(el) => { botoesLista.current[i.id] = el }}
                          type="button" aria-pressed={ativo} onClick={() => escolher(i.id)}
                          className={`flex min-h-14 w-full items-center gap-3 border-l-4 px-3 py-2 text-left ${ativo ? 'border-navy bg-surface text-navy' : 'border-transparent text-ink-soft hover:bg-surface hover:text-ink'}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="sr-only">{g.nome}: </span>
                            <span className={`block text-body leading-tight ${ativo ? 'font-semibold text-ink' : ''}`}>{i.curto}</span>
                            <span className="block text-small tabular-nums">{numero(ultimoValor(i), 1)}% <span className="sr-only">no período mais recente</span></span>
                          </span>
                          <Miniatura pontos={i.pontos} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            <p className="text-small text-ink-soft">Use as setas para cima e para baixo para percorrer os indicadores.</p>
          </div>

          <fieldset className="border-t border-line pt-4">
            <legend className={`${rotulo} mb-2`}>Visualização</legend>
            <div className="grid grid-cols-2 overflow-hidden rounded-brand border border-navy">
              {(['barras', 'linha'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={modo === m} onClick={() => trocarModo(m)} className={`min-h-11 px-3 text-small font-semibold ${modo === m ? 'bg-navy text-on-navy' : 'bg-paper text-navy hover:bg-surface'}`}>{m === 'linha' ? 'Linha' : 'Barras'}</button>
              ))}
            </div>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-small">
              <input type="checkbox" checked={zero} onChange={(e) => setZero(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              Eixo vertical começa em zero
            </label>
          </fieldset>

          <fieldset className="border-t border-line pt-4">
            <legend className={`${rotulo} mb-1`}>Comparar com</legend>
            <label className={`flex min-h-11 items-center gap-3 text-small ${!comparando && principal.referencias.length ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="checkbox" checked={mostrarLimites && !comparando && principal.referencias.length > 0} disabled={comparando || principal.referencias.length === 0} onChange={(e) => setMostrarLimites(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              Limites legais
            </label>
            <label className={`flex min-h-11 items-center gap-3 text-small ${!comparando ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="checkbox" checked={anoAnterior && !comparando} disabled={comparando} onChange={(e) => setAnoAnterior(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              Mesmo período do ano anterior
            </label>
            {ids.length < MAXIMO && (
              <div className="mt-1">
                <label htmlFor={`${uid}-outro`} className="sr-only">Adicionar outro indicador do mesmo grupo</label>
                <select id={`${uid}-outro`} value="" onChange={(e) => adicionar(e.target.value)} className={seletor}>
                  <option value="">Outro indicador…</option>
                  {daFamilia.filter((i) => !ids.includes(i.id)).map((i) => <option key={i.id} value={i.id}>{i.curto}</option>)}
                </select>
              </div>
            )}
            {comparando && (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Indicadores adicionados à comparação">
                {escolhidos.slice(1).map((i) => (
                  <li key={i.id}><button type="button" onClick={() => remover(i.id)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-navy px-4 text-small font-semibold text-navy hover:bg-surface">{i.curto}<span aria-hidden="true">×</span><span className="sr-only">Remover da comparação</span></button></li>
                ))}
              </ul>
            )}
          </fieldset>

          <div className="flex items-center gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => andar(-1)} className={`${botao} hidden border border-line text-ink hover:bg-surface lg:inline-flex`}><IconChevron className="h-4 w-4 rotate-90" /><span className="sr-only">Indicador anterior</span></button>
            <button type="button" onClick={() => andar(1)} className={`${botao} hidden border border-line text-ink hover:bg-surface lg:inline-flex`}><IconChevron className="h-4 w-4 -rotate-90" /><span className="sr-only">Próximo indicador</span></button>
            {!movimentoReduzido && (
              <button type="button" aria-pressed={tocando} onClick={() => setTocando((v) => !v)} className={`${botao} flex-1 border border-navy text-navy hover:bg-surface`}>
                {tocando ? 'Pausar apresentação' : 'Apresentação automática'}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ---------- Ferramentas ---------- */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <button type="button" onClick={baixarCsv} className={`${botao} border border-navy text-navy hover:bg-surface`}>Baixar dados (CSV)</button>
        <button type="button" onClick={copiarLink} className={`${botao} border border-line text-ink hover:bg-surface`}>Copiar link</button>
        <p role="status" className="text-small text-ink-soft">{aviso}</p>
        <p className="ml-auto text-small text-ink-soft">Dados coletados em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}, atualizados automaticamente.</p>
      </div>

      <details className="group mt-4 border-y border-line py-1">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-body font-semibold text-ink">Ver os dados em tabela<span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">⌄</span></summary>
        <div className="mb-5 max-h-96 overflow-auto rounded-brand border border-line" role="region" aria-label={`Dados de ${titulo}`} tabIndex={0}>
          <table className="w-full min-w-[22rem] text-left text-small">
            <caption className="sr-only">{titulo}, série completa</caption>
            <thead className="sticky top-0 bg-surface">
              <tr><th scope="col" className="px-3 py-2">Período</th>{series.map((s) => <th key={s.id} scope="col" className="px-3 py-2 text-right">{s.curto} (%)</th>)}</tr>
            </thead>
            <tbody>
              {[...series[0].pontos.keys()].reverse().map((k) => (
                <tr key={k} className={`border-t border-line ${k === focoAtual ? 'bg-surface font-semibold' : ''}`}>
                  <th scope="row" className="px-3 py-1.5 font-normal">{series[0].pontos[k].extenso}</th>
                  {series.map((s) => <td key={s.id} className="px-3 py-1.5 text-right tabular-nums">{numero(s.pontos[k].valor, 2)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
