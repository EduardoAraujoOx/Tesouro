'use client'

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { numero } from '@/lib/formato'

export type PontoGrafico = { ano: number; sub: number; rotulo: string; extenso: string; valor: number | null }
export type SerieGrafico = { id: string; curto: string; pontos: PontoGrafico[]; acumulaNoAno?: boolean }
export type ReferenciaGrafico = { rotulo: string; valor: number; estilo: 'limite' | 'alerta' | 'prudencial' }

/** Três estilos que se distinguem sem depender de cor: traço, marcador e cor. */
export const ESTILOS = [
  { traco: 'stroke-navy', preenchimento: 'fill-navy', dash: undefined as string | undefined, marcador: 'circulo' as const },
  { traco: 'stroke-serie2', preenchimento: 'fill-serie2', dash: '9 5', marcador: 'quadrado' as const },
  { traco: 'stroke-serie3', preenchimento: 'fill-serie3', dash: '2 5', marcador: 'triangulo' as const },
]

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

/**
 * Gráfico de linhas do explorador. O leitor escolhe o ponto em foco com o ponteiro ou, no teclado e em leitores de tela,
 * com o controle deslizante que fica abaixo do gráfico (pai). A tabela equivalente fica no pai.
 */
export function GraficoExplorador({ series, referencias, foco, onFoco, titulo, unidade = '%' }: {
  series: SerieGrafico[]
  referencias: ReferenciaGrafico[]
  foco: number
  onFoco: (i: number) => void
  titulo: string
  unidade?: string
}) {
  const id = useId()
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(720)

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = series[0]?.pontos.length ?? 0
  const W = largura
  const H = Math.round(Math.max(300, Math.min(620, W * 0.46)))
  const ml = 50, mr = 16, mt = 18, mb = 38
  const todos = series.flatMap((s) => s.pontos.map((p) => p.valor)).filter((v): v is number => v !== null)
  if (n === 0 || todos.length === 0) return <p className="rounded-brand bg-surface p-4 text-body text-ink-soft">Sem dados no período escolhido.</p>

  const vmin = Math.min(...todos), vmax = Math.max(...todos)
  const visiveis = referencias.filter((r) => r.valor <= vmax * 2 + 5)
  const topo = Math.max(vmax, ...visiveis.map((r) => r.valor))
  const base = Math.min(vmin, 0)
  const folga = (topo - base || 1) * 0.08
  const y0 = base - (vmin < 0 ? folga : 0), y1 = topo + folga
  const X = (i: number) => (n === 1 ? (ml + W - mr) / 2 : ml + (i * (W - ml - mr)) / (n - 1))
  const Y = (v: number) => mt + (1 - (v - y0) / (y1 - y0)) * (H - mt - mb)

  const passo = (() => { const bruto = (y1 - y0) / 5; const pot = Math.pow(10, Math.floor(Math.log10(bruto))); const f = bruto / pot; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pot })()
  const ticks: number[] = []
  for (let t = Math.ceil(y0 / passo) * passo; t <= y1 + 1e-9; t += passo) ticks.push(Math.round(t * 1000) / 1000)

  const refPontos = series[0].pontos
  let ultimoX = -999
  const rotulosX = refPontos
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.sub === 1)
    .filter(({ i }) => { const x = X(i); if (x - ultimoX >= 46) { ultimoX = x; return true } return false })

  function caminho(s: SerieGrafico) {
    return s.pontos.map((p, i) => {
      if (p.valor === null) return ''
      const anterior = s.pontos[i - 1]
      const abre = i === 0 || anterior.valor === null || (s.acumulaNoAno && anterior.ano !== p.ano)
      return `${abre ? 'M' : 'L'}${X(i).toFixed(1)},${Y(p.valor).toFixed(1)}`
    }).join(' ')
  }

  function mover(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    onFoco(Math.max(0, Math.min(n - 1, Math.round(((x - ml) / (W - ml - mr)) * (n - 1)))))
  }

  const resumo = `${titulo}. ` + series.map((s) => {
    const v = s.pontos.filter((p) => p.valor !== null)
    if (!v.length) return `${s.curto}: sem dados.`
    const a = v[0], b = v[v.length - 1]
    const valores = v.map((p) => p.valor as number)
    return `${s.curto}: de ${numero(a.valor, 1)}${unidade} em ${a.extenso} para ${numero(b.valor, 1)}${unidade} em ${b.extenso}; mínimo ${numero(Math.min(...valores), 1)}${unidade}, máximo ${numero(Math.max(...valores), 1)}${unidade}.`
  }).join(' ')

  return (
    <figure>
      <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-small text-ink" aria-label="Legenda do gráfico">
        {series.map((s, k) => (
          <li key={s.id} className="inline-flex items-center gap-2 font-semibold"><AmostraSerie estilo={k} />{s.curto}</li>
        ))}
        {referencias.map((r) => (
          <li key={r.rotulo} className="inline-flex items-center gap-2 text-ink-soft">
            <svg width="34" height="14" aria-hidden="true"><line x1="0" x2="34" y1="7" y2="7" className="stroke-ink-soft" strokeWidth="1.5" strokeDasharray={r.estilo === 'limite' ? '6 4' : r.estilo === 'prudencial' ? '4 3' : '1.5 3'} /></svg>
            {r.rotulo} {numero(r.valor, r.valor % 1 ? 2 : 0)}{unidade}{visiveis.includes(r) ? '' : ' (fora da escala)'}
          </li>
        ))}
      </ul>

      <div ref={caixa} className="w-full">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={`${id}-t`}
          className="block max-w-full cursor-crosshair select-none"
          style={{ touchAction: 'pan-y' }}
          onPointerMove={mover}
          onPointerDown={mover}
        >
          <title id={`${id}-t`}>{resumo}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ml} x2={W - mr} y1={Y(t)} y2={Y(t)} className="stroke-line" strokeWidth={1} strokeOpacity={0.55} />
              <text x={ml - 8} y={Y(t) + 4} textAnchor="end" className="fill-ink-soft" style={{ fontSize: 12 }}>{numero(t, passo < 1 ? 1 : 0)}</text>
            </g>
          ))}
          {visiveis.map((r) => (
            <g key={r.rotulo}>
              <line x1={ml} x2={W - mr} y1={Y(r.valor)} y2={Y(r.valor)} className="stroke-ink-soft" strokeWidth={1.5} strokeDasharray={r.estilo === 'limite' ? '6 4' : r.estilo === 'prudencial' ? '4 3' : '1.5 3'} />
              {r.estilo === 'limite' && <text x={W - mr} y={Y(r.valor) - 6} textAnchor="end" className="fill-ink-soft" style={{ fontSize: 12 }}>{r.rotulo} {numero(r.valor, 0)}{unidade}</text>}
            </g>
          ))}
          {/* ponto em foco */}
          <line x1={X(foco)} x2={X(foco)} y1={mt} y2={H - mb} className="stroke-ink-soft" strokeWidth={1.25} strokeDasharray="3 3" />
          {series.map((s, k) => (
            <path key={s.id} d={caminho(s)} fill="none" className={ESTILOS[k].traco} strokeWidth={2.5} strokeDasharray={ESTILOS[k].dash} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((s, k) => s.pontos.map((p, i) => p.valor !== null && (
            <Forma key={`${s.id}-${i}`} tipo={ESTILOS[k].marcador} x={X(i)} y={Y(p.valor)} r={i === foco ? 6 : n > 14 ? 2.5 : 3.5} className={`${ESTILOS[k].preenchimento} ${i === foco ? 'stroke-paper' : ''}`} />
          )))}
          {rotulosX.map(({ p, i }) => (
            <text key={p.rotulo} x={X(i)} y={H - 14} textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 12 }}>{p.ano}</text>
          ))}
        </svg>
      </div>
    </figure>
  )
}
