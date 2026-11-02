'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { GraficoExplorador, type ModoGrafico, type SerieGrafico } from './GraficoExplorador'
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

/**
 * Painel quantitativo: título e gráfico grande no centro, seletor de variável, comparação, tipo de gráfico e a definição de
 * cada indicador logo abaixo. Trocar de variável anima a transição; a apresentação automática passa pelos gráficos em sequência.
 * A escolha vai para o endereço da página, então pode ser compartilhada.
 */
export function ExploradorIndicadores({ indicadores, notas, classificacoes, geradoEm }: { indicadores: Indicador[]; notas: Nota[]; classificacoes: Record<number, string | null>; geradoEm: string }) {
  const uid = useId()
  const [familia, setFamilia] = useState<Familia>('lrf')
  const [ids, setIds] = useState<string[]>(['pessoal'])
  const [de, setDe] = useState<number | null>(null)
  const [ate, setAte] = useState<number | null>(null)
  const [foco, setFoco] = useState<number | null>(null)
  const [modo, setModo] = useState<ModoGrafico>('barras')
  const [mostrarLimites, setMostrarLimites] = useState(true)
  const [anoAnterior, setAnoAnterior] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [movimentoReduzido, setMovimentoReduzido] = useState(false)
  const [aviso, setAviso] = useState('')
  const [pronto, setPronto] = useState(false)

  const daFamilia = useMemo(() => indicadores.filter((i) => i.familia === familia), [indicadores, familia])
  const anos = useMemo(() => Array.from(new Set(daFamilia[0].pontos.map((p) => p.ano))), [daFamilia])
  const deAtual = de ?? anos[0]
  const ateAtual = ate ?? anos[anos.length - 1]

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
    const a = lista[0].pontos.map((p) => p.ano)
    const dentro = (v: string | null) => { const n = Number(v); return Number.isInteger(n) && n >= a[0] && n <= a[a.length - 1] ? n : null }
    setFamilia(f)
    setIds(pedidos.length ? pedidos : [f === 'capag' ? 'endividamento' : 'pessoal'])
    setDe(dentro(q.get('de')))
    setAte(dentro(q.get('ate')))
    if (q.get('v') === 'linha') setModo('linha')
    setPronto(true)
  }, [indicadores])

  // grava a escolha no endereço
  useEffect(() => {
    if (!pronto) return
    const q = new URLSearchParams()
    q.set('g', familia)
    q.set('i', ids.join(','))
    if (de !== null) q.set('de', String(de))
    if (ate !== null) q.set('ate', String(ate))
    if (modo === 'linha') q.set('v', 'linha')
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}${window.location.hash}`)
  }, [pronto, familia, ids, de, ate, modo])

  const escolhidos = ids.map((id) => daFamilia.find((i) => i.id === id)).filter((i): i is Indicador => !!i)
  const principal = escolhidos[0]
  const comparando = escolhidos.length > 1
  const posicao = indicadores.findIndex((i) => i.id === principal.id)

  const series: SerieGrafico[] = escolhidos.map((i) => ({
    id: i.id, curto: i.curto, acumulaNoAno: i.acumulaNoAno,
    pontos: i.pontos.filter((p) => p.ano >= deAtual && p.ano <= ateAtual),
  }))
  if (anoAnterior && !comparando) {
    series.push({
      id: 'anterior', curto: 'Mesmo período do ano anterior', anterior: true, acumulaNoAno: principal.acumulaNoAno,
      pontos: series[0].pontos.map((p) => ({ ...p, valor: principal.pontos.find((q) => q.ano === p.ano - 1 && q.sub === p.sub)?.valor ?? null })),
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
    setFamilia((atual) => { if (atual !== novo.familia) { setDe(null); setAte(null) } return novo.familia })
    setIds([id]); setFoco(null)
  }, [indicadores])
  const andar = (passo: number) => escolher(indicadores[(posicao + passo + indicadores.length) % indicadores.length].id)

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
  const mudarDe = (v: number) => { setDe(v); if (v > ateAtual) setAte(v); setFoco(null) }
  const mudarAte = (v: number) => { setAte(v); if (v < deAtual) setDe(v); setFoco(null) }

  const baixarCsv = useCallback(() => {
    const base = series.filter((s) => !s.anterior)
    const cab = ['periodo', 'ano', ...escolhidos.map((i) => i.id + '_pct')]
    const linhas = base[0].pontos.map((p, k) => [p.extenso, p.ano, ...base.map((s) => s.pontos[k].valor ?? '')].join(','))
    const blob = new Blob(['﻿' + [cab.join(','), ...linhas].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `indicadores-es-${ids.join('-')}-${deAtual}-${ateAtual}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    setAviso('Arquivo CSV gerado.')
  }, [escolhidos, series, ids, deAtual, ateAtual])

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
  const caixa = 'flex flex-col gap-2 border-line md:border-l md:pl-6 first:md:border-l-0 first:md:pl-0'
  const rotuloCaixa = 'text-body font-semibold text-ink'

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) setPausado(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false) }}
    >
      <div className="flex flex-col">
      {/* ---------- Título e período ---------- */}
      <div className="order-1 grid grid-cols-[1fr_auto] items-start gap-x-4">
        <h1 key={principal.id} className="anim-aparece col-start-1 row-start-1 text-section md:text-headline"><span className="md:hidden">{principal.curto}</span><span className="hidden md:inline">{principal.nome}</span></h1>
        <details className="relative col-start-2 row-start-1 md:row-span-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-brand border border-line bg-paper px-3 py-1 hover:bg-surface md:min-h-14 md:px-4 md:py-2">
            <span className="text-left">
              <span className="hidden text-small text-ink-soft md:block">Período</span>
              <span className="block text-small font-semibold text-ink md:text-body">{deAtual} a {ateAtual}</span>
            </span>
            <IconChevron className="h-5 w-5 text-ink-soft" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-brand border border-line bg-paper p-4 shadow-lg">
            <p className="mb-2 text-small font-semibold text-ink">Período</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${uid}-de`} className="block text-small text-ink-soft">De</label>
                <select id={`${uid}-de`} value={deAtual} onChange={(e) => mudarDe(Number(e.target.value))} className={seletor}>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</select>
              </div>
              <div>
                <label htmlFor={`${uid}-ate`} className="block text-small text-ink-soft">Até</label>
                <select id={`${uid}-ate`} value={ateAtual} onChange={(e) => mudarAte(Number(e.target.value))} className={seletor}>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</select>
              </div>
            </div>
          </div>
        </details>
        <p className="col-span-2 row-start-2 mt-1 text-body text-ink-soft md:col-span-1">{principal.subtitulo}</p>
      </div>

      {/* ---------- Gráfico ---------- */}
      <div className="order-2 mt-4 rounded-brand border border-line bg-paper p-3 md:p-6">
        <GraficoExplorador series={series} referencias={refs} foco={focoAtual} onFoco={setFoco} titulo={titulo} modo={modo} animKey={ids.join('+')} />
        {n > 1 && pontoFoco && (
          <div className="mt-2">
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
        {notas.filter((x) => ids.includes(x.id) && x.ano >= deAtual && x.ano <= ateAtual).map((x) => (
          <p key={x.id + x.ano + x.sub} className="mt-4 rounded-brand bg-surface p-4 text-small text-ink-soft"><strong className="text-ink">Nota sobre a série.</strong> {x.texto}</p>
        ))}
      </div>
      </div>

      {/* ---------- Controles e definição ---------- */}
      <div className="mt-6 grid gap-6 md:grid-cols-12 md:gap-0">
        <div className={`${caixa} md:col-span-3`}>
          <label htmlFor={`${uid}-var`} className={rotuloCaixa}>Selecionar variável</label>
          <select id={`${uid}-var`} value={principal.id} onChange={(e) => escolher(e.target.value)} className={seletor}>
            {GRUPOS.map((g) => (
              <optgroup key={g.id} label={g.nome}>
                {indicadores.filter((i) => i.familia === g.id).map((i) => <option key={i.id} value={i.id}>{i.curto}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => andar(-1)} className={`${botao} border border-line text-ink hover:bg-surface`}><IconChevron className="h-4 w-4 rotate-90" /><span className="sr-only">Indicador anterior</span></button>
            <button type="button" onClick={() => andar(1)} className={`${botao} border border-line text-ink hover:bg-surface`}><IconChevron className="h-4 w-4 -rotate-90" /><span className="sr-only">Próximo indicador</span></button>
            {!movimentoReduzido && (
              <button type="button" aria-pressed={tocando} onClick={() => setTocando((v) => !v)} className={`${botao} flex-1 border border-navy text-navy hover:bg-surface`}>
                {tocando ? 'Pausar apresentação' : 'Apresentação automática'}
              </button>
            )}
          </div>
        </div>

        <fieldset className={`${caixa} md:col-span-3`}>
          <legend className={`${rotuloCaixa} mb-2`}>Comparar com</legend>
          <label className={`flex min-h-11 items-center gap-3 ${!comparando && principal.referencias.length ? 'cursor-pointer' : 'opacity-60'}`}>
            <input type="checkbox" checked={mostrarLimites && !comparando && principal.referencias.length > 0} disabled={comparando || principal.referencias.length === 0} onChange={(e) => setMostrarLimites(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
            Limites legais
          </label>
          <label className={`flex min-h-11 items-center gap-3 ${!comparando ? 'cursor-pointer' : 'opacity-60'}`}>
            <input type="checkbox" checked={anoAnterior && !comparando} disabled={comparando} onChange={(e) => setAnoAnterior(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
            Mesmo período do ano anterior
          </label>
          {ids.length < MAXIMO && (
            <div>
              <label htmlFor={`${uid}-outro`} className="sr-only">Adicionar outro indicador do mesmo grupo</label>
              <select id={`${uid}-outro`} value="" onChange={(e) => adicionar(e.target.value)} className={seletor}>
                <option value="">Outro indicador…</option>
                {daFamilia.filter((i) => !ids.includes(i.id)).map((i) => <option key={i.id} value={i.id}>{i.curto}</option>)}
              </select>
            </div>
          )}
          {comparando && (
            <ul className="flex flex-wrap gap-2" aria-label="Indicadores adicionados à comparação">
              {escolhidos.slice(1).map((i) => (
                <li key={i.id}><button type="button" onClick={() => remover(i.id)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-navy px-4 text-small font-semibold text-navy hover:bg-surface">{i.curto}<span aria-hidden="true">×</span><span className="sr-only">Remover da comparação</span></button></li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset className={`${caixa} md:col-span-2`}>
          <legend className={`${rotuloCaixa} mb-2`}>Visualização</legend>
          <div className="grid grid-cols-2 overflow-hidden rounded-brand border border-navy">
            {(['linha', 'barras'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)} className={`min-h-11 px-3 text-small font-semibold ${modo === m ? 'bg-navy text-on-navy' : 'bg-paper text-navy hover:bg-surface'}`}>{m === 'linha' ? 'Linha' : 'Barras'}</button>
            ))}
          </div>
        </fieldset>

        <div className={`${caixa} md:col-span-4`}>
          <p className={rotuloCaixa}>O que é?</p>
          <p className="text-body text-ink-soft">{principal.definicao}</p>
          <p className="text-small text-ink-soft"><strong className="text-ink">Como ler:</strong> {principal.leitura}</p>
          <a href="#metodo" onClick={abrirMetodologia} className="text-small font-semibold text-navy underline underline-offset-4">Ver detalhes da metodologia</a>
        </div>
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
            <caption className="sr-only">{titulo}, de {deAtual} a {ateAtual}</caption>
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
