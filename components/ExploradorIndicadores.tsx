'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { AmostraSerie, GraficoExplorador, type SerieGrafico } from './GraficoExplorador'
import { IconExternal } from './Icons'
import { FAMILIAS, type Familia, type Indicador } from '@/lib/indicadores'
import { numero } from '@/lib/formato'

const MAXIMO = 3

type Nota = { id: string; ano: number; sub: number; texto: string }

/**
 * Explorador do painel fiscal: o leitor escolhe o grupo, até três indicadores e o período; vê a série em gráfico grande,
 * percorre os períodos pelo controle deslizante (funciona no teclado e em leitores de tela), consulta a tabela e baixa os dados.
 * A escolha vai para o endereço da página, então pode ser compartilhada.
 */
export function ExploradorIndicadores({ indicadores, notas }: { indicadores: Indicador[]; notas: Nota[] }) {
  const uid = useId()
  const [familia, setFamilia] = useState<Familia>('lrf')
  const [ids, setIds] = useState<string[]>(FAMILIAS.lrf.padrao)
  const [de, setDe] = useState<number | null>(null)
  const [ate, setAte] = useState<number | null>(null)
  const [foco, setFoco] = useState<number | null>(null)
  const [referencias, setReferencias] = useState(true)
  const [aviso, setAviso] = useState('')
  const [pronto, setPronto] = useState(false)

  const daFamilia = useMemo(() => indicadores.filter((i) => i.familia === familia), [indicadores, familia])
  const anos = useMemo(() => Array.from(new Set(daFamilia[0].pontos.map((p) => p.ano))), [daFamilia])
  const anoMin = anos[0], anoMax = anos[anos.length - 1]
  const deAtual = de ?? anoMin
  const ateAtual = ate ?? anoMax

  // lê a escolha do endereço, uma vez
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const f = q.get('g') === 'capag' ? 'capag' : 'lrf'
    const lista = indicadores.filter((i) => i.familia === f)
    const pedidos = (q.get('i') ?? '').split(',').filter((x) => lista.some((i) => i.id === x)).slice(0, MAXIMO)
    const a = lista[0].pontos.map((p) => p.ano)
    const dentro = (v: string | null) => { const n = Number(v); return Number.isInteger(n) && n >= a[0] && n <= a[a.length - 1] ? n : null }
    setFamilia(f)
    setIds(pedidos.length ? pedidos : FAMILIAS[f].padrao)
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
  const series: SerieGrafico[] = escolhidos.map((i) => ({
    id: i.id,
    curto: i.curto,
    acumulaNoAno: i.acumulaNoAno,
    pontos: i.pontos.filter((p) => p.ano >= deAtual && p.ano <= ateAtual),
  }))
  const n = series[0]?.pontos.length ?? 0
  const focoAtual = n === 0 ? 0 : Math.min(foco ?? n - 1, n - 1)
  const unico = escolhidos.length === 1 ? escolhidos[0] : null
  const refs = unico && referencias ? unico.referencias : []

  const trocarFamilia = (f: Familia) => { setFamilia(f); setIds(FAMILIAS[f].padrao); setDe(null); setAte(null); setFoco(null) }
  const alternar = (id: string) => {
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
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setAviso('Arquivo CSV gerado.')
  }, [escolhidos, series, ids, deAtual, ateAtual])

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setAviso('Link copiado. Ele reproduz esta escolha de indicadores e período.')
    } catch {
      setAviso('Não foi possível copiar. Copie o endereço na barra do navegador: ele já reproduz esta escolha.')
    }
  }

  const notasVisiveis = notas.filter((x) => ids.includes(x.id) && x.ano >= deAtual && x.ano <= ateAtual)
  const titulo = escolhidos.map((i) => i.curto).join(', ')
  const pontoFoco = series[0]?.pontos[focoAtual]
  const caixa = 'rounded-brand border border-line p-4'

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* ------------ Controles ------------ */}
      <div className="order-2 space-y-6 lg:order-1 lg:col-span-4">
        <fieldset className={caixa}>
          <legend className="px-1 text-small font-semibold">1. Grupo de indicadores</legend>
          <div className="mt-1 space-y-1">
            {(Object.values(FAMILIAS)).map((f) => (
              <label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-surface">
                <input type="radio" name={`${uid}-grupo`} checked={familia === f.id} onChange={() => trocarFamilia(f.id)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--navy))]" />
                <span><span className="block text-body font-semibold">{f.nome}</span><span className="block text-small text-ink-soft">{f.descricao}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={caixa}>
          <legend className="px-1 text-small font-semibold">2. Indicadores (até {MAXIMO})</legend>
          <div className="mt-1 space-y-1">
            {daFamilia.map((i) => {
              const marcado = ids.includes(i.id)
              const bloqueado = !marcado && ids.length >= MAXIMO
              const k = ids.indexOf(i.id)
              return (
                <label key={i.id} className={`flex min-h-11 items-start gap-3 rounded-md px-2 py-2 ${bloqueado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface'}`}>
                  <input type="checkbox" checked={marcado} disabled={bloqueado} onChange={() => alternar(i.id)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--navy))]" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-body font-medium">{i.curto}{marcado && k >= 0 && <AmostraSerie estilo={k} />}</span>
                    <span className="block text-small text-ink-soft">{i.periodicidade === 'anual' ? 'Anual' : 'Quadrimestral'}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {ids.length >= MAXIMO && <p className="mt-2 px-1 text-small text-ink-soft">Máximo de {MAXIMO} indicadores no gráfico. Desmarque um para escolher outro.</p>}
        </fieldset>

        <fieldset className={caixa}>
          <legend className="px-1 text-small font-semibold">3. Período</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-de`} className="block text-small text-ink-soft">De</label>
              <select id={`${uid}-de`} value={deAtual} onChange={(e) => mudarDe(Number(e.target.value))} className="mt-1 h-11 w-full rounded-brand border border-ink-soft/50 bg-paper px-3 text-body text-ink">
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-ate`} className="block text-small text-ink-soft">Até</label>
              <select id={`${uid}-ate`} value={ateAtual} onChange={(e) => mudarAte(Number(e.target.value))} className="mt-1 h-11 w-full rounded-brand border border-ink-soft/50 bg-paper px-3 text-body text-ink">
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          {familia === 'lrf' && (
            <label className={`mt-3 flex min-h-11 items-start gap-3 rounded-md px-1 py-2 ${unico ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="checkbox" checked={referencias} disabled={!unico} onChange={(e) => setReferencias(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--navy))]" />
              <span className="text-body">Mostrar limites legais<span className="block text-small text-ink-soft">{unico ? 'Limite, alerta e prudencial, quando houver.' : 'Disponível quando há um só indicador no gráfico.'}</span></span>
            </label>
          )}
        </fieldset>
      </div>

      {/* ------------ Gráfico e leitura ------------ */}
      <div className="order-1 min-w-0 lg:order-2 lg:col-span-8">
        <h3 className="text-title">{titulo}</h3>
        <p className="mt-1 text-small text-ink-soft">
          {unico ? unico.leitura : `${escolhidos[0].leitura.split('.')[0]}.`} Período: {deAtual} a {ateAtual}.
        </p>

        <div className="mt-5">
          <GraficoExplorador series={series} referencias={refs} foco={focoAtual} onFoco={setFoco} titulo={titulo} />
        </div>

        {n > 0 && pontoFoco && (
          <div className={`${caixa} mt-4`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <label htmlFor={`${uid}-foco`} className="text-label font-semibold uppercase text-ink-soft">Período em foco</label>
              <p className="text-body font-semibold" aria-live="polite">{pontoFoco.extenso}</p>
            </div>
            <input
              id={`${uid}-foco`}
              type="range"
              min={0}
              max={Math.max(0, n - 1)}
              step={1}
              value={focoAtual}
              disabled={n < 2}
              onChange={(e) => setFoco(Number(e.target.value))}
              aria-valuetext={`${pontoFoco.extenso}: ${series.map((s) => `${s.curto} ${numero(s.pontos[focoAtual].valor, 2)}%`).join('; ')}`}
              className="mt-2 h-11 w-full"
              style={{ accentColor: 'rgb(var(--navy))' }}
            />
            <p className="flex justify-between text-small text-ink-soft"><span>{series[0].pontos[0].rotulo}</span><span>{series[0].pontos[n - 1].rotulo}</span></p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {series.map((s, k) => {
                const v = s.pontos[focoAtual].valor
                const ant = focoAtual > 0 && !(s.acumulaNoAno && s.pontos[focoAtual - 1].ano !== s.pontos[focoAtual].ano) ? s.pontos[focoAtual - 1].valor : null
                const delta = v !== null && ant !== null ? Math.round((v - ant) * 100) / 100 : null
                const limite = unico?.referencias.find((r) => r.estilo === 'limite')
                return (
                  <div key={s.id} className="rounded-brand bg-surface p-3">
                    <dt className="flex items-center gap-2 text-small font-semibold"><AmostraSerie estilo={k} />{s.curto}</dt>
                    <dd className="mt-1 text-title font-semibold text-navy">{numero(v, 2)}%</dd>
                    <dd className="text-small text-ink-soft">
                      {delta !== null && <>{delta > 0 ? '+' : delta < 0 ? '−' : ''}{numero(Math.abs(delta), 2)} p.p. sobre o período anterior</>}
                      {limite && v !== null && <><br />Folga de {numero(limite.valor - v, 1)} p.p. até o limite de {numero(limite.valor, 0)}%</>}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )}

        {notasVisiveis.map((x) => (
          <p key={x.id + x.ano + x.sub} className="mt-4 rounded-brand bg-surface p-4 text-small text-ink-soft">
            <strong className="text-ink">Nota sobre a série.</strong> {x.texto}
          </p>
        ))}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={baixarCsv} className="inline-flex min-h-11 items-center rounded-brand bg-navy px-5 text-body font-semibold text-on-navy hover:bg-navy-deep">Baixar dados (CSV)</button>
          <button type="button" onClick={copiarLink} className="inline-flex min-h-11 items-center rounded-brand border border-navy px-5 text-body font-semibold text-navy hover:bg-surface">Copiar link desta escolha</button>
          <p role="status" className="text-small text-ink-soft">{aviso}</p>
        </div>

        <details className="mt-5">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-body font-semibold text-navy underline underline-offset-4">Ver os dados em tabela</summary>
          <div className="mt-2 max-h-96 overflow-auto rounded-brand border border-line" role="region" aria-label={`Dados de ${titulo}`} tabIndex={0}>
            <table className="w-full min-w-[22rem] text-left text-small">
              <caption className="sr-only">{titulo}, de {deAtual} a {ateAtual}</caption>
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <th scope="col" className="px-3 py-2">Período</th>
                  {series.map((s) => <th key={s.id} scope="col" className="px-3 py-2 text-right">{s.curto} (%)</th>)}
                </tr>
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {escolhidos.map((i) => (
            <article key={i.id} className={caixa}>
              <h4 className="!font-sans text-body font-semibold !text-ink">{i.nome}</h4>
              <p className="mt-2 text-small text-ink-soft">{i.oQue}</p>
              <p className="mt-3 text-small text-ink-soft"><strong className="text-ink">Fonte:</strong> {i.fonte}. <strong className="text-ink">Base:</strong> {i.base}.</p>
            </article>
          ))}
        </div>
        <p className="mt-4 inline-flex items-center gap-1 text-small text-ink-soft"><IconExternal className="h-3.5 w-3.5" aria-hidden="true" /> Os valores são os oficiais, sem ajuste do portal. A metodologia está mais abaixo nesta página.</p>
      </div>
    </div>
  )
}
