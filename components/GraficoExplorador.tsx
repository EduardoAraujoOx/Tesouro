'use client'

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { numero } from '@/lib/formato'

export type PontoGrafico = { ano: number; sub: number; rotulo: string; extenso: string; valor: number | null; parcial?: boolean }
export type SerieGrafico = { id: string; curto: string; pontos: PontoGrafico[]; acumulaNoAno?: boolean; anterior?: boolean }
export type ReferenciaGrafico = { rotulo: string; valor: number; estilo: 'limite' | 'alerta' | 'prudencial'; texto?: string }
export type ModoGrafico = 'linha' | 'barras'

/** Estilos que se distinguem sem depender de cor: traço, marcador e cor. O quarto é a série do ano anterior. */
export const ESTILOS = [
  { traco: 'stroke-navy', preenchimento: 'fill-navy', dash: undefined as string | undefined, marcador: 'circulo' as const },
  { traco: 'stroke-serie2', preenchimento: 'fill-serie2', dash: '9 5', marcador: 'quadrado' as const },
  { traco: 'stroke-serie3', preenchimento: 'fill-serie3', dash: '2 5', marcador: 'triangulo' as const },
  { traco: 'stroke-ink-soft', preenchimento: 'fill-ink-soft', dash: '5 4', marcador: 'circulo' as const },
]
const ANTERIOR = 3

// classes literais, para o Tailwind gerar cada uma
const CLASSE_REF = {
  limite: { traco: 'stroke-limite', texto: 'fill-limite', caixa: 'fill-limite/15 stroke-limite' },
  prudencial: { traco: 'stroke-prudencial', texto: 'fill-prudencial', caixa: 'fill-prudencial/15 stroke-prudencial' },
  alerta: { traco: 'stroke-alerta', texto: 'fill-alerta', caixa: 'fill-alerta/15 stroke-alerta' },
} as const
const TRACO_REF = { limite: '7 4', prudencial: '4 3', alerta: '1.5 3' } as const

type Marcador = (typeof ESTILOS)[number]['marcador']

function Forma({ tipo, x, y, r, className }: { tipo: Marcador; x: number; y: number; r: number; className: string }) {
  if (tipo === 'quadrado') return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} className={className} />
  if (tipo === 'triangulo') return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} className={className} />
  return <circle cx={x} cy={y} r={r} className={className} />
}

export function AmostraSerie({ estilo }: { estilo: number }) {
  const e = ESTILOS[estilo]
  return (
    <svg width="34" height="14" aria-hidden="true" className="shrink-0">
      <line x1="0" x2="34" y1="7" y2="7" className={e.traco} strokeWidth="2.5" strokeDasharray={e.dash} />
      <Forma tipo={e.marcador} x={17} y={7} r={4} className={e.preenchimento} />
    </svg>
  )
}

/** Afasta rótulos que ficariam um sobre o outro, mantendo a ordem vertical. */
function espalha(ys: number[], minimo: number, topo: number, base: number): number[] {
  const ordem = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  for (let k = 1; k < ordem.length; k++) if (ordem[k].y - ordem[k - 1].y < minimo) ordem[k].y = ordem[k - 1].y + minimo
  const excesso = ordem.length ? ordem[ordem.length - 1].y - base : 0
  if (excesso > 0) ordem.forEach((o) => { o.y -= excesso })
  ordem.forEach((o) => { o.y = Math.max(topo, o.y) })
  const saida = [...ys]
  ordem.forEach((o) => { saida[o.i] = o.y })
  return saida
}

/**
 * Gráfico do painel: linhas (com área sob a série única) ou barras, limites legais com rótulo na ponta,
 * rótulo do valor no ponto em foco e transição animada ao trocar de variável (`animKey`).
 * O ponto em foco muda com o ponteiro ou, no teclado e em leitores de tela, com o controle deslizante do pai.
 */
export function GraficoExplorador({ series, referencias, foco, onFoco, titulo, modo = 'linha', zero = true, animKey = '', unidade = '%' }: {
  series: SerieGrafico[]
  referencias: ReferenciaGrafico[]
  foco: number
  onFoco: (i: number) => void
  titulo: string
  modo?: ModoGrafico
  zero?: boolean
  animKey?: string
  unidade?: string
}) {
  const id = useId().replace(/:/g, '')
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(720)
  const [alturaTela, setAlturaTela] = useState(0)

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    // espaço vertical que sobra da posição do gráfico até o fim da tela, para o eixo não ficar cortado
    const mede = () => setAlturaTela(window.innerHeight - (el.getBoundingClientRect().top + window.scrollY))
    mede()
    window.addEventListener('resize', mede)
    return () => { ro.disconnect(); window.removeEventListener('resize', mede) }
  }, [])

  const n = series[0]?.pontos.length ?? 0
  const W = largura
  const largo = W >= 760
  const cabe = alturaTela > 0 ? alturaTela - 96 : 460
  const H = Math.round(Math.max(300, Math.min(580, W * 0.46, cabe)))
  const ml = 52, mt = 14, mb = 36
  const mr = referencias.length && largo ? 160 : 18
  const todos = series.flatMap((s) => s.pontos.map((p) => p.valor)).filter((v): v is number => v !== null)
  if (n === 0 || todos.length === 0) return <p className="rounded-brand bg-surface p-4 text-body text-ink-soft">Sem dados no período escolhido.</p>

  const vmin = Math.min(...todos), vmax = Math.max(...todos)
  const nf = (v: number, casas = 1) => (unidade === '%' ? numero(v, casas) : numero(v, Math.abs(v) < 10 ? 2 : 1))
  const textoRef = (r: ReferenciaGrafico) => r.texto ?? `${{ limite: 'Legal', prudencial: 'Prudencial', alerta: 'Alerta' }[r.estilo]} ${numero(r.valor, r.valor % 1 ? 1 : 0)}${unidade}`
  const visiveis = referencias.filter((r) => r.valor <= vmax * 2 + 5)
  const topo = Math.max(zero ? Math.max(vmax, 0) : vmax, ...visiveis.map((r) => r.valor))
  const base = zero ? Math.min(vmin, 0) : Math.min(vmin, ...visiveis.map((r) => r.valor))
  const folga = (topo - base || 1) * 0.1
  const y0 = zero ? base - (vmin < 0 ? folga : 0) : base - folga, y1 = topo + folga
  const passoX = (W - ml - mr) / n
  const X = (i: number) => ml + (i + 0.5) * passoX
  const Y = (v: number) => mt + (1 - (v - y0) / (y1 - y0)) * (H - mt - mb)
  const Y0 = Y(zero ? Math.max(y0, Math.min(0, y1)) : y0)

  const passo = (() => { const bruto = (y1 - y0) / 6; const pot = Math.pow(10, Math.floor(Math.log10(bruto))); const f = bruto / pot; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pot })()
  const ticks: number[] = []
  for (let t = Math.ceil(y0 / passo) * passo; t <= y1 + 1e-9; t += passo) ticks.push(Math.round(t * 1000) / 1000)

  // rótulos do eixo horizontal: um por ponto quando cada ponto é um ano (ou um mês do mesmo ano) e cabem;
  // nas séries por quadrimestre, o ano no primeiro quadrimestre de cada ano
  const refPontos = series[0].pontos
  const nAnos = new Set(refPontos.map((p) => p.ano)).size
  const umPorPonto = nAnos === refPontos.length || nAnos === 1
  // anos em colunas apertadas viram '’25' para caberem todos
  const textoX = (p: PontoGrafico) => (umPorPonto ? (passoX < 34 && /^\d{4}\*?$/.test(p.rotulo) ? `’${p.rotulo.slice(2)}` : p.rotulo) : String(p.ano))
  const larguraX = (p: PontoGrafico) => textoX(p).length * 6.4 + 4
  let ultimoX = -999, ultimaL = 0
  const rotulosX = refPontos
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => umPorPonto || p.sub === 1)
    .filter(({ p, i }) => {
      const x = X(i), l = larguraX(p)
      if (x - ultimoX >= (ultimaL + l) / 2 + 3) { ultimoX = x; ultimaL = l; return true }
      return false
    })

  const caminho = (s: SerieGrafico) => s.pontos.map((p, i) => {
    if (p.valor === null) return ''
    const anterior = s.pontos[i - 1]
    const abre = i === 0 || anterior.valor === null || (s.acumulaNoAno && anterior.ano !== p.ano)
    return `${abre ? 'M' : 'L'}${X(i).toFixed(1)},${Y(p.valor).toFixed(1)}`
  }).join(' ')

  const unica = series.filter((x) => !x.anterior).length === 1 && !series[0].anterior
  const comArea = modo === 'linha' && unica
  const validos = series[0].pontos.map((p, i) => ({ p, i })).filter(({ p }) => p.valor !== null)
  const area = comArea && validos.length > 1 && !series[0].acumulaNoAno
    ? `${caminho(series[0])} L${X(validos[validos.length - 1].i).toFixed(1)},${Y0.toFixed(1)} L${X(validos[0].i).toFixed(1)},${Y0.toFixed(1)} Z`
    : null

  // rótulos dos limites, à direita do gráfico, sem sobreposição
  const rotulosRef = largo
    ? (() => {
        const ys = espalha(visiveis.map((r) => Y(r.valor)), 24, mt + 10, H - mb - 10)
        return visiveis.map((r, k) => ({ r, y: ys[k], texto: textoRef(r) }))
      })()
    : []

  // rótulos de valor no ponto em foco
  const comPilula = series.map((s, k) => ({ s, k })).filter(({ s }) => !s.anterior && s.pontos[foco]?.valor != null)
  const ysPilula = espalha(comPilula.map(({ s }) => Y(s.pontos[foco].valor as number) - 18), 26, mt, H - mb)

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    onFoco(Math.max(0, Math.min(n - 1, Math.floor((x - ml) / passoX))))
  }

  const resumo = `${titulo}. ${referencias.length ? `Limites: ${referencias.map((r) => textoRef(r)).join(', ')}. ` : ''}` + series.filter((s) => !s.anterior).map((s) => {
    const v = s.pontos.filter((p) => p.valor !== null)
    if (!v.length) return `${s.curto}: sem dados.`
    const a = v[0], b = v[v.length - 1]
    const valores = v.map((p) => p.valor as number)
    return `${s.curto}: de ${nf(a.valor as number)}${unidade} em ${a.extenso} para ${nf(b.valor as number)}${unidade} em ${b.extenso}; mínimo ${nf(Math.min(...valores))}${unidade}, máximo ${nf(Math.max(...valores))}${unidade}.`
  }).join(' ')

  const larguraBarra = Math.min(46, (passoX * 0.72) / series.length)
  const xBarra = (i: number, k: number) => X(i) - (larguraBarra * series.length) / 2 + k * larguraBarra

  return (
    <figure>
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink empty:hidden" aria-label="Legenda do gráfico">
        {series.length > 1 && series.map((s, k) => (
          <li key={s.id} className="inline-flex items-center gap-2 font-semibold">{modo === 'barras' ? <svg width="14" height="14" aria-hidden="true" className="shrink-0"><rect x="1" y="1" width="12" height="12" rx="2" strokeWidth="1.25" className={s.anterior ? 'fill-serie3/25 stroke-serie3' : `${ESTILOS[k].preenchimento} stroke-transparent`} /></svg> : <AmostraSerie estilo={s.anterior ? ANTERIOR : k} />}{s.curto}</li>
        ))}
        {!zero && <li className="text-ink-soft">O eixo vertical não começa em zero</li>}
        {largo
          ? referencias.filter((r) => !visiveis.includes(r)).map((r) => (
              <li key={r.rotulo} className="inline-flex items-center gap-2 text-ink-soft">
                <svg width="34" height="14" aria-hidden="true"><line x1="0" x2="34" y1="7" y2="7" className={CLASSE_REF[r.estilo].traco} strokeWidth="2" strokeDasharray={TRACO_REF[r.estilo]} /></svg>
                {textoRef(r)} (fora da escala)
              </li>
            ))
          : referencias.length > 0 && (
              <li className="flex w-full flex-wrap gap-x-4 gap-y-1 text-label text-ink-soft" style={{ letterSpacing: 0 }}>
                {referencias.map((r) => (
                  <span key={r.rotulo} className="inline-flex items-center gap-1.5">
                    <svg width="20" height="10" aria-hidden="true"><line x1="0" x2="20" y1="5" y2="5" className={CLASSE_REF[r.estilo].traco} strokeWidth="2" strokeDasharray={TRACO_REF[r.estilo]} /></svg>
                    {textoRef(r)}
                  </span>
                ))}
              </li>
            )}
      </ul>

      <div ref={caixa} className="w-full">
        <svg
          width={W} height={H} viewBox={`0 0 ${W} ${H}`}
          role="img" aria-labelledby={`${id}-t`}
          className="block max-w-full cursor-crosshair select-none"
          style={{ touchAction: 'pan-y' }}
          onPointerMove={mover} onPointerDown={mover}
        >
          <title id={`${id}-t`}>{resumo}</title>
          <defs>
            <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="grad-topo" style={{ stopOpacity: 0.28 }} />
              <stop offset="100%" className="grad-topo" style={{ stopOpacity: 0.02 }} />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="grad-topo" />
              <stop offset="100%" className="grad-base" />
            </linearGradient>
          </defs>

          <g key={`eixos-${animKey}`} className="anim-aparece">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={ml} x2={W - mr} y1={Y(t)} y2={Y(t)} className="stroke-line" strokeWidth={1} strokeOpacity={0.55} />
                <text x={ml - 8} y={Y(t) + 4} textAnchor="end" className="fill-ink-soft" style={{ fontSize: 12 }}>{numero(Math.abs(t) < 1e-9 ? 0 : t, passo < 1 ? 1 : 0)}{unidade === '%' ? '%' : ''}</text>
              </g>
            ))}
            {visiveis.map((r) => (
              <line key={r.rotulo} x1={ml} x2={W - mr} y1={Y(r.valor)} y2={Y(r.valor)} className={CLASSE_REF[r.estilo].traco} strokeWidth={1.75} strokeDasharray={TRACO_REF[r.estilo]} />
            ))}
            {rotulosRef.map(({ r, y, texto }) => {
              const w = texto.length * 7.4 + 18
              return (
                <g key={r.rotulo}>
                  <rect x={W - mr + 8} y={y - 11} width={w} height={22} rx={5} className={CLASSE_REF[r.estilo].caixa} strokeWidth={1} />
                  <text x={W - mr + 17} y={y + 4} className={CLASSE_REF[r.estilo].texto} style={{ fontSize: 12, fontWeight: 600 }}>{texto}</text>
                </g>
              )
            })}
            {rotulosX.map(({ p, i }) => (
              <text key={`${p.ano}-${p.sub}`} x={X(i)} y={H - 14} textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 12 }}>{textoX(p)}</text>
            ))}
          </g>

          {/* ponto em foco */}
          <line x1={X(foco)} x2={X(foco)} y1={mt} y2={H - mb} className="stroke-ink-soft" strokeWidth={1.25} strokeDasharray="3 3" />

          {/* séries: o key refaz a animação quando o gráfico muda */}
          <g key={`series-${animKey}-${modo}`} className="anim-revela">
            {modo === 'barras'
              ? series.map((s, k) => s.pontos.map((p, i) => {
                  if (p.valor === null) return null
                  const yv = Y(p.valor)
                  const degrade = unica && k === 0
                  const ref = !!s.anterior
                  return (
                    <rect key={`${s.id}-${i}`} x={xBarra(i, k)} y={Math.min(yv, Y0)} width={larguraBarra - 1.5} height={Math.max(1, Math.abs(Y0 - yv))} rx={2}
                      fill={degrade && i !== foco ? `url(#${id}-b)` : undefined}
                      strokeWidth={ref ? 1.25 : undefined}
                      className={ref ? 'fill-serie3/25 stroke-serie3' : degrade ? (i === foco ? 'fill-navy' : '') : `${ESTILOS[k].preenchimento} ${i === foco ? '' : 'opacity-80'}`} />
                  )
                }))
              : (
                <>
                  {area && <path d={area} fill={`url(#${id}-g)`} />}
                  {series.map((s, k) => (
                    <path key={s.id} d={caminho(s)} fill="none" className={ESTILOS[s.anterior ? ANTERIOR : k].traco} strokeWidth={s.anterior ? 2 : 2.75} strokeDasharray={ESTILOS[s.anterior ? ANTERIOR : k].dash} strokeLinejoin="round" strokeLinecap="round" />
                  ))}
                  {series.map((s, k) => s.pontos.map((p, i) => p.valor !== null && (
                    <Forma key={`${s.id}-${i}`} tipo={ESTILOS[s.anterior ? ANTERIOR : k].marcador} x={X(i)} y={Y(p.valor)} r={i === foco ? 6 : s.anterior ? 0 : n > 14 ? 2.75 : 4} className={`${ESTILOS[s.anterior ? ANTERIOR : k].preenchimento} ${i === foco ? 'stroke-paper' : ''}`} />
                  )))}
                </>
              )}
          </g>

          {/* valores escritos sobre as barras: todos quando cabem; senão o maior, o menor e o mais recente */}
          {modo === 'barras' && unica && (() => {
            const vs = series[0].pontos.map((p, i) => ({ v: p.valor, i })).filter((x): x is { v: number; i: number } => x.v !== null)
            if (!vs.length) return null
            const todos = passoX >= (series.length > 1 ? 52 : 34)
            const destaque = new Set([vs.reduce((a, b) => (b.v > a.v ? b : a)).i, vs.reduce((a, b) => (b.v < a.v ? b : a)).i, vs[vs.length - 1].i])
            return (
              <g key={`rotulos-${animKey}`} className="anim-aparece" aria-hidden="true">
                {vs.filter((x) => x.i !== foco && (todos || destaque.has(x.i))).map((x) => (
                  <text key={x.i} x={series.length > 1 ? xBarra(x.i, 0) + (larguraBarra - 1.5) / 2 : X(x.i)} y={x.v >= 0 ? Y(x.v) - 6 : Y(x.v) + 15} textAnchor="middle" className="fill-ink" style={{ fontSize: 12, fontWeight: 600 }}>{nf(x.v)}</text>
                ))}
              </g>
            )
          })()}

          {/* rótulo do valor no ponto em foco */}
          {comPilula.map(({ s, k }, j) => {
            const v = s.pontos[foco].valor as number
            const texto = `${nf(v)}${unidade}`
            const w = texto.length * 7.6 + 18
            const x = Math.max(ml, Math.min(W - mr - w, X(foco) - w / 2))
            return (
              <g key={s.id} pointerEvents="none">
                <rect x={x} y={ysPilula[j]} width={w} height={24} rx={6} className={ESTILOS[k].preenchimento} />
                <text x={x + w / 2} y={ysPilula[j] + 16} textAnchor="middle" className="fill-on-navy" style={{ fontSize: 13, fontWeight: 700 }}>{texto}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </figure>
  )
}
