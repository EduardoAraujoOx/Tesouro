'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { AmostraSerie, GraficoExplorador, type SerieGrafico } from './GraficoExplorador'
import type { Familia, Indicador } from '@/lib/indicadores'
import { numero } from '@/lib/formato'

const MAXIMO = 3
const GRUPOS: { id: Familia; nome: string }[] = [
  { id: 'lrf', nome: 'Limites da LRF' },
  { id: 'capag', nome: 'CAPAG' },
]
const PADRAO: Record<Familia, string> = { lrf: 'pessoal', capag: 'endividamento' }

type Nota = { id: string; ano: number; sub: number; texto: string }

/**
 * Painel quantitativo: o gráfico é o centro da página. Uma barra de indicadores troca o gráfico com um clique;
 * os números do período em foco ficam logo acima dele e acompanham o ponteiro ou o controle deslizante.
 * A escolha vai para o endereço da página, então pode ser compartilhada.
 */
export function ExploradorIndicadores({ indicadores, notas, classificacoes }: { indicadores: Indicador[]; notas: Nota[]; classificacoes: Record<number, string | null> }) {
  const uid = useId()
  const [familia, setFamilia] = useState<Familia>('lrf')
  const [ids, setIds] = useState<string[]>([PADRAO.lrf])
  const [de, setDe] = useState<number | null>(null)
  const [ate, setAte] = useState<number | null>(null)
  const [foco, setFoco] = useState<number | null>(null)
  const [referencias, setReferencias] = useState(true)
  const [aviso, setAviso] = useState('')
  const [pronto, setPronto] = useState(false)

  const daFamilia = useMemo(() => indicadores.filter((i) => i.familia === familia), [indicadores, familia])
  const anos = useMemo(() => Array.from(new Set(daFamilia[0].pontos.map((p) => p.ano))), [daFamilia])
  const deAtual = de ?? anos[0]
  const ateAtual = ate ?? anos[anos.length - 1]

  // lê a escolha do endereço, uma vez
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const f: Familia = q.get('g') === 'capag' ? 'capag' : 'lrf'
    const lista = indicadores.filter((i) => i.familia === f)
    const pedidos = (q.get('i') ?? '').split(',').filter((x) => lista.some((i) => i.id === x)).slice(0, MAXIMO)
    const a = lista[0].pontos.map((p) => p.ano)
    const dentro = (v: string | null) => { const n = Number(v); return Number.isInteger(n) && n >= a[0] && n <= a[a.length - 1] ? n : null }
    setFamilia(f)
    setIds(pedidos.length ? pedidos : [PADRAO[f]])
    setDe(dentro(q.get('de')))
    setAte(dentro(q.get('ate')))
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
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}${window.location.hash}`)
  }, [pronto, familia, ids, de, ate])

  const escolhidos = ids.map((id) => daFamilia.find((i) => i.id === id)).filter((i): i is Indicador => !!i)
  const principal = escolhidos[0]
  const series: SerieGrafico[] = escolhidos.map((i) => ({
    id: i.id, curto: i.curto, acumulaNoAno: i.acumulaNoAno,
    pontos: i.pontos.filter((p) => p.ano >= deAtual && p.ano <= ateAtual),
  }))
  const n = series[0]?.pontos.length ?? 0
  const focoAtual = n === 0 ? 0 : Math.min(foco ?? n - 1, n - 1)
  const unico = escolhidos.length === 1 ? principal : null
  const refs = unico && referencias ? unico.referencias : []
  const pontoFoco = series[0]?.pontos[focoAtual]
  const titulo = escolhidos.map((i) => i.curto).join(', ')

  // escolher um indicador na barra troca o gráfico; a comparação é opcional e fica à parte
  const escolher = (f: Familia, id: string) => { setFamilia(f); setIds([id]); setFoco(null); if (f !== familia) { setDe(null); setAte(null) } }
  const comparar = (id: string) => {
    setIds((atual) => (atual.includes(id) ? (atual.length > 1 ? atual.filter((x) => x !== id) : atual) : atual.length < MAXIMO ? [...atual, id] : atual))
    setFoco(null)
  }
  const mudarDe = (v: number) => { setDe(v); if (v > ateAtual) setAte(v); setFoco(null) }
  const mudarAte = (v: number) => { setAte(v); if (v < deAtual) setDe(v); setFoco(null) }

  const baixarCsv = useCallback(() => {
    const cab = ['periodo', 'ano', ...escolhidos.map((i) => i.id + '_pct')]
    const linhas = series[0].pontos.map((p, k) => [p.extenso, p.ano, ...series.map((s) => s.pontos[k].valor ?? '')].join(','))
    const blob = new Blob(['﻿' + [cab.join(','), ...linhas].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `indicadores-es-${ids.join('-')}-${deAtual}-${ateAtual}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    setAviso('Arquivo CSV gerado.')
  }, [escolhidos, series, ids, deAtual, ateAtual])

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setAviso('Link copiado. Ele reproduz esta escolha.') }
    catch { setAviso('Não foi possível copiar. Copie o endereço na barra do navegador: ele já reproduz esta escolha.') }
  }

  const notasVisiveis = notas.filter((x) => ids.includes(x.id) && x.ano >= deAtual && x.ano <= ateAtual)
  const botao = 'inline-flex min-h-11 items-center rounded-brand px-4 text-small font-semibold'
  const seletor = 'h-11 rounded-brand border border-ink-soft/50 bg-paper px-3 text-body text-ink'

  return (
    <div>
      {/* ---------- Barra de indicadores: um clique troca o gráfico ---------- */}
      <div role="group" aria-label="Indicador exibido no gráfico" className="relative -mx-5 flex gap-x-6 gap-y-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {GRUPOS.map((g) => (
          <div key={g.id} className="flex shrink-0 items-center gap-2">
            <span className="text-label font-semibold uppercase text-ink-soft" aria-hidden="true">{g.nome}</span>
            {indicadores.filter((i) => i.familia === g.id).map((i) => {
              const ativo = principal?.id === i.id
              return (
                <button
                  key={i.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => escolher(g.id, i.id)}
                  className={`${botao} relative shrink-0 border ${ativo ? 'border-navy bg-navy text-on-navy' : 'border-line bg-paper text-ink hover:bg-surface'}`}
                >
                  <span className="sr-only">{g.nome}: </span>{i.curto}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
      {/* ---------- Números do período em foco ---------- */}
      <div className="order-2 lg:col-span-3">
      {n > 0 && pontoFoco && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1" aria-live="polite">
          {series.map((s, k) => {
            const v = s.pontos[focoAtual].valor
            const ant = focoAtual > 0 && !(s.acumulaNoAno && s.pontos[focoAtual - 1].ano !== s.pontos[focoAtual].ano) ? s.pontos[focoAtual - 1].valor : null
            const delta = v !== null && ant !== null ? Math.round((v - ant) * 100) / 100 : null
            const limite = unico?.referencias.find((r) => r.estilo === 'limite')
            const nota = escolhidos[k].pontos.find((p) => p.ano === pontoFoco.ano && p.sub === pontoFoco.sub)?.nota
            return (
              <div key={s.id} className="rounded-brand border border-line p-4">
                <p className="flex items-center gap-2 text-small font-semibold text-ink-soft"><AmostraSerie estilo={k} />{s.curto}</p>
                <p className="mt-1 font-serif text-display font-semibold leading-none text-navy">{numero(v, 1)}%</p>
                <p className="mt-2 text-small text-ink-soft">
                  {pontoFoco.extenso}
                  {nota && <> · nota {nota}</>}
                </p>
              </div>
            )
          })}
          {unico && (
            <>
              <div className="rounded-brand border border-line p-4">
                <p className="text-small font-semibold text-ink-soft">{familia === 'lrf' ? 'Limite legal' : 'Classificação geral da CAPAG'}</p>
                {familia === 'lrf' ? (
                  <>
                    <p className="mt-1 font-serif text-display font-semibold leading-none text-ink">{unico.referencias.find((r) => r.estilo === 'limite') ? `${numero(unico.referencias.find((r) => r.estilo === 'limite')!.valor, 0)}%` : 'sem limite'}</p>
                    <p className="mt-2 text-small text-ink-soft">
                      {(() => { const l = unico.referencias.find((r) => r.estilo === 'limite'); const v = pontoFoco.valor; return l && v !== null ? `Folga de ${numero(l.valor - v, 1)} pontos percentuais` : 'Sem folga calculável' })()}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-serif text-display font-semibold leading-none text-ink">{classificacoes[pontoFoco.ano] ?? 'sem nota'}</p>
                    <p className="mt-2 text-small text-ink-soft">Edição {pontoFoco.ano}</p>
                  </>
                )}
              </div>
              <div className="rounded-brand border border-line p-4">
                <p className="text-small font-semibold text-ink-soft">Variação</p>
                {(() => {
                  const v = pontoFoco.valor
                  const ant = focoAtual > 0 && !(series[0].acumulaNoAno && series[0].pontos[focoAtual - 1].ano !== pontoFoco.ano) ? series[0].pontos[focoAtual - 1].valor : null
                  const d = v !== null && ant !== null ? Math.round((v - ant) * 100) / 100 : null
                  return (
                    <>
                      <p className="mt-1 font-serif text-display font-semibold leading-none text-ink">{d === null ? 'sem base' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${numero(Math.abs(d), 1)}`}</p>
                      <p className="mt-2 text-small text-ink-soft">{d === null ? 'Primeiro período da série' : 'pontos percentuais sobre o período anterior'}</p>
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {/* ---------- Gráfico ---------- */}
      <div id={`${uid}-grafico`} className="order-1 min-w-0 lg:col-span-9">
        <GraficoExplorador series={series} referencias={refs} foco={focoAtual} onFoco={setFoco} titulo={titulo} />
        {n > 1 && pontoFoco && (
          <div className="mt-2">
            <label htmlFor={`${uid}-foco`} className="sr-only">Período em foco</label>
            <input
              id={`${uid}-foco`}
              type="range" min={0} max={n - 1} step={1} value={focoAtual}
              onChange={(e) => setFoco(Number(e.target.value))}
              aria-valuetext={`${pontoFoco.extenso}: ${series.map((s) => `${s.curto} ${numero(s.pontos[focoAtual].valor, 2)}%`).join('; ')}`}
              className="h-11 w-full"
              style={{ accentColor: 'rgb(var(--navy))' }}
            />
            <p className="flex justify-between text-small text-ink-soft"><span>{series[0].pontos[0].rotulo}</span><span>Arraste ou use as setas para percorrer os períodos</span><span>{series[0].pontos[n - 1].rotulo}</span></p>
          </div>
        )}

        {notasVisiveis.map((x) => (
          <p key={x.id + x.ano + x.sub} className="mt-4 rounded-brand bg-surface p-4 text-small text-ink-soft"><strong className="text-ink">Nota sobre a série.</strong> {x.texto}</p>
        ))}
      </div>
      </div>

      {/* ---------- Ferramentas ---------- */}
      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4 border-t border-line pt-5">
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor={`${uid}-de`} className="block text-small text-ink-soft">De</label>
            <select id={`${uid}-de`} value={deAtual} onChange={(e) => mudarDe(Number(e.target.value))} className={seletor}>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </div>
          <div>
            <label htmlFor={`${uid}-ate`} className="block text-small text-ink-soft">Até</label>
            <select id={`${uid}-ate`} value={ateAtual} onChange={(e) => mudarAte(Number(e.target.value))} className={seletor}>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </div>
        </div>
        {familia === 'lrf' && (
          <label className={`flex min-h-11 items-center gap-2 text-body ${unico ? 'cursor-pointer' : 'opacity-60'}`}>
            <input type="checkbox" checked={referencias} disabled={!unico} onChange={(e) => setReferencias(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
            Mostrar limites legais
          </label>
        )}
        <details className="group relative">
          <summary className={`${botao} cursor-pointer list-none border border-line text-ink hover:bg-surface`}>Comparar com outros indicadores</summary>
          <fieldset className="absolute left-0 z-20 mt-2 w-[min(18rem,calc(100vw-2.5rem))] rounded-brand border border-line bg-paper p-3 shadow-lg">
            <legend className="sr-only">Indicadores no gráfico (até {MAXIMO})</legend>
            {daFamilia.map((i) => {
              const marcado = ids.includes(i.id)
              const bloqueado = !marcado && ids.length >= MAXIMO
              return (
                <label key={i.id} className={`flex min-h-11 items-center gap-3 px-1 ${bloqueado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={marcado} disabled={bloqueado || (marcado && ids.length === 1)} onChange={() => comparar(i.id)} className="h-5 w-5 accent-[rgb(var(--navy))]" />
                  <span className="flex items-center gap-2 text-body">{i.curto}{marcado && <AmostraSerie estilo={ids.indexOf(i.id)} />}</span>
                </label>
              )
            })}
            <p className="mt-1 px-1 text-small text-ink-soft">Até {MAXIMO} indicadores do mesmo grupo.</p>
          </fieldset>
        </details>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={baixarCsv} className={`${botao} border border-navy text-navy hover:bg-surface`}>Baixar dados (CSV)</button>
          <button type="button" onClick={copiarLink} className={`${botao} border border-line text-ink hover:bg-surface`}>Copiar link</button>
        </div>
        <p role="status" className="basis-full text-small text-ink-soft">{aviso}</p>
      </div>

      {/* ---------- Texto de apoio, recolhido ---------- */}
      <div className="mt-6 divide-y divide-line border-y border-line">
        <details className="group py-1">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-body font-semibold text-ink">Sobre {escolhidos.length > 1 ? 'os indicadores' : 'este indicador'}<span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">⌄</span></summary>
          <div className="grid gap-5 pb-5 md:grid-cols-2">
            {escolhidos.map((i) => (
              <article key={i.id}>
                <h2 className="!font-sans text-body font-semibold !text-ink">{i.nome}</h2>
                <p className="mt-1 text-body text-ink-soft">{i.oQue}</p>
                <p className="mt-2 text-small text-ink-soft"><strong className="text-ink">Como ler:</strong> {i.leitura}</p>
                <p className="mt-1 text-small text-ink-soft"><strong className="text-ink">Fonte:</strong> {i.fonte}. <strong className="text-ink">Base:</strong> {i.base}.</p>
              </article>
            ))}
          </div>
        </details>
        <details className="group py-1">
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
    </div>
  )
}
