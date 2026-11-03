'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { GraficoExplorador, type ModoGrafico, type SerieGrafico } from './GraficoExplorador'
import { IconBank, IconBars, IconCalendar, IconChevron, IconCoins, IconDoc, IconInfo, IconPie, IconShield, IconTarget } from './Icons'
import type { Familia, Indicador } from '@/lib/indicadores'
import { numero } from '@/lib/formato'

const MAXIMO = 3
const SEGUNDOS_POR_GRAFICO = 9

/** Categorias do painel. Cada uma é uma fonte oficial; novas categorias entram aqui quando houver coletor. */
const CATEGORIAS: { id: Familia; nome: string; curto: string; Icone: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'orcamento', nome: 'Orçamento', curto: 'Orçamento', Icone: IconBars },
  { id: 'arrecadacao', nome: 'Arrecadação', curto: 'Arrecadação', Icone: IconCalendar },
  { id: 'lrf', nome: 'Limites da LRF', curto: 'Limites (LRF)', Icone: IconShield },
  { id: 'caixa', nome: 'Caixa e obrigações', curto: 'Caixa', Icone: IconCoins },
  { id: 'capag', nome: 'Capacidade (CAPAG)', curto: 'CAPAG', Icone: IconTarget },
  { id: 'previdencia', nome: 'Previdência', curto: 'Previdência', Icone: IconBank },
  { id: 'funcoes', nome: 'Despesas por função', curto: 'Funções', Icone: IconPie },
]
const PADRAO: Record<Familia, string> = { orcamento: 'receita', arrecadacao: 'icms', lrf: 'pessoal', caixa: 'caixa-apos', capag: 'endividamento', previdencia: 'aportes', funcoes: 'minimo-educacao' }
const FAMILIAS_VALIDAS: Familia[] = ['orcamento', 'arrecadacao', 'lrf', 'caixa', 'capag', 'previdencia', 'funcoes']

type Nota = { id: string; ano: number; sub: number; texto: string }

/*
 * Hierarquia tipográfica do painel (a mesma do restante do portal):
 *  - título da página: serif, text-headline;
 *  - título de bloco: serif, text-title;
 *  - rótulo de grupo ou de controle: sans, text-label em caixa alta;
 *  - texto corrido: sans, text-body.
 */
const rotulo = 'text-label font-semibold uppercase text-ink-soft'

/**
 * Painel quantitativo: categorias em chips, seletor de indicador, gráfico grande à esquerda e, à direita, a explicação
 * do indicador (o que é, por que importa, como ler e fonte). Trocar de indicador anima a transição.
 * A escolha vai para o endereço da página, então pode ser compartilhada.
 */
export function ExploradorIndicadores({ indicadores, notas, classificacoes, geradoEm, precosEm }: { indicadores: Indicador[]; notas: Nota[]; classificacoes: Record<number, string | null>; geradoEm: string; precosEm: string }) {
  const uid = useId()
  const [familia, setFamilia] = useState<Familia>('orcamento')
  const [ids, setIds] = useState<string[]>([PADRAO.orcamento])
  const [foco, setFoco] = useState<number | null>(null)
  const [modo, setModo] = useState<ModoGrafico>('barras')
  const [zero, setZero] = useState(true)
  const [mostrarLimites, setMostrarLimites] = useState(true)
  const [anoAnterior, setAnoAnterior] = useState(false)
  const [comReferencia, setComReferencia] = useState(true)
  const [corrigir, setCorrigir] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [movimentoReduzido, setMovimentoReduzido] = useState(false)
  const [aviso, setAviso] = useState('')
  const [pronto, setPronto] = useState(false)

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
    const g = q.get('g') as Familia
    const f: Familia = FAMILIAS_VALIDAS.includes(g) ? g : 'orcamento'
    const lista = indicadores.filter((i) => i.familia === f)
    const pedidos = (q.get('i') ?? '').split(',').filter((x) => lista.some((i) => i.id === x)).slice(0, MAXIMO)
    setFamilia(f)
    setIds(pedidos.length ? pedidos : [PADRAO[f]])
    setCorrigir(q.has('c') ? q.get('c') === '1' : f === 'caixa')
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
    if (corrigir !== (familia === 'caixa')) q.set('c', corrigir ? '1' : '0')
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}${window.location.hash}`)
  }, [pronto, familia, ids, modo, zero, corrigir])

  const escolhidos = ids.map((id) => daFamilia.find((i) => i.id === id)).filter((i): i is Indicador => !!i)
  const principal = escolhidos[0]
  const comparando = escolhidos.length > 1
  const posicao = indicadores.findIndex((i) => i.id === principal.id)

  const podeCorrigir = escolhidos.every((i) => i.pontos.some((p) => p.deflator !== undefined))
  const corrige = corrigir && podeCorrigir
  const aplica = (pts: Indicador['pontos']) => (corrige ? pts.map((p) => (p.valor === null || p.deflator === undefined ? p : { ...p, valor: p.valor * p.deflator })) : pts)
  const series: SerieGrafico[] = escolhidos.map((i) => ({ id: i.id, curto: i.curto, acumulaNoAno: i.acumulaNoAno, pontos: aplica(i.pontos) }))
  if (comReferencia && !comparando && principal.comparacao) {
    series.push({ id: 'referencia', curto: principal.comparacao.curto, anterior: true, acumulaNoAno: false, pontos: aplica(principal.comparacao.pontos) })
  }
  if (anoAnterior && !comparando && (familia === 'lrf' || familia === 'capag')) {
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
  const ultimoPonto = [...principal.pontos].reverse().find((p) => p.valor !== null)

  const escolher = useCallback((id: string) => {
    const novo = indicadores.find((i) => i.id === id)
    if (!novo) return
    if (novo.familia !== familia) setCorrigir(novo.familia === 'caixa')
    setFamilia(novo.familia)
    setIds([id]); setFoco(null)
  }, [indicadores, familia])
  const andar = (passo: number) => escolher(indicadores[(posicao + passo + indicadores.length) % indicadores.length].id)
  const escolherCategoria = (f: Familia) => { if (f !== familia) { setFamilia(f); setIds([PADRAO[f]]); setFoco(null); setZero(modo === 'barras'); setCorrigir(f === 'caixa') } }

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
    const cab = ['periodo', 'ano', ...escolhidos.map((i) => i.id + (reais ? (corrige ? '_bilhoes_reais_precos_correntes_ipca' : '_bilhoes_reais') : '_pct'))]
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

  const reais = principal.unidade === 'R$ bi'
  const sufixo = reais ? ' bi' : '%'
  const moeda = (v: number | null) => (v === null ? 'sem dado' : reais ? `R$ ${numero(v, Math.abs(v) < 10 ? 2 : 1)} bi` : `${numero(v, 1)}%`)

  // resumo do ponto em foco, em uma linha
  const resumo = (() => {
    if (!pontoFoco) return ''
    const v = pontoFoco.valor
    const partes = [`${moeda(v)} em ${pontoFoco.extenso}`]
    const ref = !comparando ? series.find((x) => x.id === 'referencia')?.pontos[focoAtual]?.valor ?? null : null
    if (ref !== null && v !== null && principal.comparacao) {
      if (principal.comparacao.tipo === 'ano-anterior') {
        if (ref !== 0) { const d = (v / ref - 1) * 100; partes.push(`${d > 0 ? '+' : d < 0 ? '−' : ''}${numero(Math.abs(d), 1)}% em termos reais sobre o mesmo período do ano anterior (${moeda(ref)} a preços corrigidos)`) }
      } else if (ref !== 0) partes.push(`${principal.comparacao.curto.toLowerCase()}: ${moeda(ref)} (${numero((v / ref) * 100, 1)}%)`)
    }
    if (pontoFoco.parcial) partes.push('valor parcial do ano')
    const nota = principal.pontos.find((p) => p.ano === pontoFoco.ano && p.sub === pontoFoco.sub)?.nota
    if (!comparando && nota) partes.push(`nota ${nota}`)
    if (!comparando && familia === 'capag' && classificacoes[pontoFoco.ano]) partes.push(`classificação geral da CAPAG: ${classificacoes[pontoFoco.ano]}`)
    const limite = !comparando && familia !== 'capag' ? principal.referencias.find((r) => r.estilo === 'limite') : undefined
    if (limite && v !== null) partes.push(principal.sentido === 'minimo' ? `${numero(v - limite.valor, 1)} p.p. acima do mínimo constitucional de ${numero(limite.valor, 0)}%` : `folga de ${numero(limite.valor - v, 1)} p.p. até o limite legal de ${numero(limite.valor, 0)}%`)
    const ant = reais ? null : focoAtual > 0 && !(series[0].acumulaNoAno && series[0].pontos[focoAtual - 1].ano !== pontoFoco.ano) ? series[0].pontos[focoAtual - 1].valor : null
    if (!comparando && v !== null && ant !== null) { const d = Math.round((v - ant) * 100) / 100; partes.push(`${d > 0 ? '+' : d < 0 ? '−' : ''}${numero(Math.abs(d), 1)} p.p. sobre o período anterior`) }
    return partes.join(' · ')
  })()

  const botao = 'inline-flex min-h-10 items-center justify-center rounded-brand px-3 text-small font-semibold'
  const seletor = 'h-10 w-full rounded-brand border border-ink-soft/50 bg-paper px-3 text-small font-semibold text-ink md:text-body'
  const trocarModo = (m: ModoGrafico) => { setModo(m); setZero(m === 'barras') }

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) setPausado(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false) }}
    >
      {/* ---------- Categorias ---------- */}
      <div role="group" aria-label="Categoria de indicadores" className="relative -mx-5 flex gap-1 overflow-x-auto border-b border-line px-5 md:mx-0 md:px-0">
        {CATEGORIAS.map(({ id, nome, curto, Icone }) => {
          const ativo = familia === id
          return (
            <button
              key={id} type="button" aria-pressed={ativo} onClick={() => escolherCategoria(id)}
              className={`relative -mb-px inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-2.5 text-small font-semibold md:text-body ${ativo ? 'border-navy text-navy' : 'border-transparent text-ink-soft hover:text-ink'}`}
            >
              <Icone className="h-5 w-5" aria-hidden="true" /><span className="md:hidden">{curto}</span><span className="hidden md:inline">{nome}</span>
            </button>
          )
        })}
      </div>

      {/* ---------- Seletor de indicador ---------- */}
      <div className="mt-3 flex items-center gap-2 md:mt-4 md:gap-3">
        <label htmlFor={`${uid}-var`} className="sr-only md:not-sr-only md:text-small md:font-semibold md:text-ink-soft">Indicador:</label>
        <select id={`${uid}-var`} value={principal.id} onChange={(e) => escolher(e.target.value)} className={`${seletor} min-w-0 flex-1 md:max-w-md md:flex-none`}>
          {daFamilia.map((i) => <option key={i.id} value={i.id}>{i.curto}</option>)}
        </select>
        <button type="button" onClick={() => andar(-1)} className={`${botao} shrink-0 border border-line text-ink hover:bg-surface`}><IconChevron className="h-4 w-4 rotate-90" aria-hidden="true" /><span className="sr-only">Indicador anterior</span></button>
        <button type="button" onClick={() => andar(1)} className={`${botao} shrink-0 border border-line text-ink hover:bg-surface`}><IconChevron className="h-4 w-4 -rotate-90" /><span className="sr-only">Próximo indicador</span></button>
        <a href="#sobre-indicador" className={`${botao} hidden shrink-0 text-navy hover:bg-surface md:inline-flex`}><IconInfo className="h-6 w-6" aria-hidden="true" /><span className="sr-only">Ver o que é este indicador</span></a>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 border-t border-line pt-5 lg:grid-cols-12 lg:gap-10">
        {/* ---------- Gráfico ---------- */}
        <div className="min-w-0 lg:col-span-8">
          <div>
            <div className="min-w-0">
              <h2 key={principal.id} className="anim-aparece text-title md:text-headline"><span className="md:hidden">{principal.curto}</span><span className="hidden md:inline">{principal.nome}</span></h2>
              <p className="mt-1 text-small text-ink-soft md:text-body">{principal.subtitulo}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-small text-ink-soft">{reais ? 'R$ bilhões' : 'Valores em %'}</p>
  <div className="flex shrink-0 items-center gap-2">
    <div className="grid grid-cols-2 overflow-hidden rounded-brand border border-navy" role="group" aria-label="Visualização">
      {(['barras', 'linha'] as const).map((m) => (
        <button key={m} type="button" aria-pressed={modo === m} onClick={() => trocarModo(m)} className={`min-h-9 px-3 text-small font-semibold ${modo === m ? 'bg-navy text-on-navy' : 'bg-paper text-navy hover:bg-surface'}`}>{m === 'linha' ? 'Linha' : 'Barras'}</button>
      ))}
    </div>
    <details className="relative">
      <summary className={`${botao} min-h-9 cursor-pointer list-none border border-line text-ink hover:bg-surface`}>Opções</summary>
      <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2.5rem))] space-y-3 rounded-brand border border-line bg-paper p-4 shadow-lg">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-small">
          <input type="checkbox" checked={zero} onChange={(e) => setZero(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
          Eixo vertical começa em zero
        </label>
        <fieldset className="border-t border-line pt-3">
          <legend className={`${rotulo} mb-1`}>Comparar com</legend>
          {principal.referencias.length > 0 && (
            <label className={`flex min-h-11 items-center gap-3 text-small ${!comparando ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="checkbox" checked={mostrarLimites && !comparando} disabled={comparando} onChange={(e) => setMostrarLimites(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              {familia === 'capag' ? 'Faixas das notas' : principal.sentido === 'minimo' ? 'Mínimo constitucional' : 'Limites legais'}
            </label>
          )}
          {principal.comparacao && (
            <label className={`flex min-h-11 items-center gap-3 text-small ${!comparando ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="checkbox" checked={comReferencia && !comparando} disabled={comparando} onChange={(e) => setComReferencia(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              {principal.comparacao.curto}
            </label>
          )}
          {podeCorrigir && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-small">
              <input type="checkbox" checked={corrigir} onChange={(e) => setCorrigir(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              Valores a preços de {precosEm} (IPCA)
            </label>
          )}
          {(familia === 'lrf' || familia === 'capag') && (
            <label className={`flex min-h-11 items-center gap-3 text-small ${!comparando ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="checkbox" checked={anoAnterior && !comparando} disabled={comparando} onChange={(e) => setAnoAnterior(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
              Mesmo período do ano anterior
            </label>
          )}
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
        {!movimentoReduzido && (
          <button type="button" aria-pressed={tocando} onClick={() => setTocando((v) => !v)} className={`${botao} w-full border border-navy text-navy hover:bg-surface`}>
            {tocando ? 'Pausar apresentação' : 'Apresentação automática'}
          </button>
        )}
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <button type="button" onClick={baixarCsv} className={`${botao} border border-navy text-navy hover:bg-surface`}>Baixar dados (CSV)</button>
          <button type="button" onClick={copiarLink} className={`${botao} border border-line text-ink hover:bg-surface`}>Copiar link</button>
        </div>
        <p role="status" className="text-small text-ink-soft">{aviso}</p>
      </div>
    </details>
  </div>
            </div>
            {corrige && <p className="mb-1 text-small font-semibold text-ink">Valores a preços de {precosEm} (IPCA)</p>}
            <GraficoExplorador series={series} referencias={refs} foco={focoAtual} onFoco={setFoco} titulo={titulo} modo={modo} zero={zero} animKey={ids.join('+')} unidade={sufixo} />
            {n > 1 && pontoFoco && (
              <div className="mt-1">
                <label htmlFor={`${uid}-foco`} className="sr-only">Período em foco</label>
                <input
                  id={`${uid}-foco`} type="range" min={0} max={n - 1} step={1} value={focoAtual}
                  onChange={(e) => setFoco(Number(e.target.value))}
                  aria-valuetext={`${pontoFoco.extenso}: ${series.filter((s) => !s.anterior).map((s) => `${s.curto} ${moeda(s.pontos[focoAtual].valor)}`).join('; ')}`}
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
        </div>

        {/* ---------- Explicação do indicador ---------- */}
        <aside id="sobre-indicador" aria-label={`Sobre o indicador ${principal.curto}`} className="scroll-mt-4 divide-y divide-line lg:col-span-4 lg:border-l lg:border-line lg:pl-8">
          <div className="flex gap-4 pb-5">
            <IconInfo className="mt-1 h-8 w-8 shrink-0 text-navy" aria-hidden="true" />
            <div>
              <h3 className="text-title">O que é?</h3>
              <p className="mt-1 text-body text-ink">{principal.definicao}</p>
            </div>
          </div>
          <div className="flex gap-4 py-5">
            <IconTarget className="mt-1 h-8 w-8 shrink-0 text-navy" aria-hidden="true" />
            <div>
              <h3 className="text-title">Por que importa?</h3>
              <p className="mt-1 text-body text-ink">{principal.porQueImporta}</p>
            </div>
          </div>
          <div className="flex gap-4 py-5">
            <IconDoc className="mt-0.5 h-8 w-8 shrink-0 text-navy" aria-hidden="true" />
            <p className="text-body text-ink"><strong>Fonte:</strong> {principal.fonte}.</p>
          </div>
          <details className="group pt-1">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 text-body font-semibold text-navy">Como ler, cálculo, limite legal e termos<span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">⌄</span></summary>
            <div className="space-y-4 pb-3">
              <div><p className={rotulo}>Como ler</p><p className="mt-1 text-body text-ink">{principal.leitura}</p></div>
              <div><p className={rotulo}>Como é calculado</p><p className="mt-1 text-body text-ink">{principal.formula}.</p></div>
              <div><p className={rotulo}>Limite e base legal</p><p className="mt-1 text-body text-ink">{principal.limite}. {principal.base}.</p></div>
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
          </details>
        </aside>
      </div>

      {/* ---------- Último dado e metodologia ---------- */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4">
        <p className="flex flex-wrap items-center gap-x-2 text-body text-ink">
          <IconCalendar className="h-6 w-6 text-navy" aria-hidden="true" />
          <strong>Último dado disponível:</strong> {ultimoPonto?.extenso ?? 'sem dado'}
          <span className="text-small text-ink-soft">· coletado em {new Date(geradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}, atualizado automaticamente</span>
        </p>
        <a href="#metodo" onClick={abrirMetodologia} className="inline-flex items-center gap-2 text-body font-semibold text-navy underline underline-offset-4">Metodologia<span aria-hidden="true">→</span></a>
      </div>

      <details className="group mt-4 border-y border-line py-1">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-body font-semibold text-ink">Ver os dados em tabela<span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">⌄</span></summary>
        <div className="mb-5 max-h-96 overflow-auto rounded-brand border border-line" role="region" aria-label={`Dados de ${titulo}`} tabIndex={0}>
          <table className="w-full min-w-[22rem] text-left text-small">
            <caption className="sr-only">{titulo}, série completa</caption>
            <thead className="sticky top-0 bg-surface">
              <tr><th scope="col" className="px-3 py-2">Período</th>{series.map((s) => <th key={s.id} scope="col" className="px-3 py-2 text-right">{s.curto} ({reais ? 'R$ bi' : '%'})</th>)}</tr>
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
