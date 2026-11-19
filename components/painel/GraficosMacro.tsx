'use client'

import { useRef, useState } from 'react'
import { milhoes, numero } from '@/lib/formato'
import { COR } from './Graficos'

export type Serie = { rotulo: string; cor: string; contorno?: string }
export type ItemSerie = { chave: string; rotulo: string; sub?: string; v: number[] }

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
export const fmtPct = (x: number | null | undefined, casas = 1) => (x === undefined ? '–' : x === null ? 'novo' : `${sinal(x)}${numero(Math.abs(x), casas)}%`)
/** Variação nominal e real (deflacionada pelo IPCA do ano de destino), em %. */
export function variacoes(base: number, alvo: number, ipca: number): { nominal: number | null | undefined; real: number | null | undefined } {
  if (!base && !alvo) return { nominal: undefined, real: undefined }
  if (!base) return { nominal: null, real: null }
  const nominal = (alvo / base - 1) * 100
  return { nominal, real: ((1 + nominal / 100) / (1 + ipca) - 1) * 100 }
}

function useDica() {
  const caixa = useRef<HTMLDivElement>(null)
  const [d, setD] = useState<{ i: number; x: number; y: number } | null>(null)
  const posiciona = (i: number, cx: number, cy: number) => {
    const r = caixa.current?.getBoundingClientRect()
    if (!r) return
    let x = cx - r.left + 14
    if (x + 264 > r.width) x = Math.max(0, cx - r.left - 280)
    setD({ i, x, y: cy - r.top + 14 })
  }
  return { caixa, d, setD, posiciona }
}

/** Linhas com até quatro barras finas (uma por série) e colunas de valor e variação (nominal e real) entre duas séries. */
export function BarrasSeries({ itens, series, base, alvo, ipca, rotuloBase, rotuloAlvo, semReal = false, rotuloDelta = 'Δ%' }: {
  itens: ItemSerie[]; series: Serie[]; base: number; alvo: number; ipca: number; rotuloBase: string; rotuloAlvo: string; semReal?: boolean; rotuloDelta?: string
}) {
  const { caixa, d, setD, posiciona } = useDica()
  const escala = Math.max(1, ...itens.flatMap((i) => i.v.map((x) => Math.abs(x))))
  const w = (x: number) => `${Math.max(0, Math.min(100, (Math.abs(x) / escala) * 100))}%`
  return (
    <div ref={caixa} className="relative" onMouseLeave={() => setD(null)}>
      <div className="hidden items-center justify-end gap-3 pb-1 text-label text-ink-soft md:flex" aria-hidden="true">
        <span className="w-[4.5rem] text-right">{rotuloBase}</span><span className="w-[4.5rem] text-right">{rotuloAlvo}</span><span className="w-14 text-right">{rotuloDelta}</span>{!semReal && <span className="w-14 text-right">Real</span>}
      </div>
      <ul className="border-t border-line">
        {itens.map((i, k) => {
          const vr = variacoes(i.v[base], i.v[alvo], ipca)
          return (
            <li key={i.chave} className="border-t border-line first:border-t-0">
              <div
                tabIndex={0}
                onMouseMove={(e) => posiciona(k, e.clientX, e.clientY)}
                onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); posiciona(k, r.left + 40, r.top) }}
                onBlur={() => setD(null)}
                aria-label={`${i.rotulo}: ${series.map((s, j) => `${s.rotulo} ${milhoes(i.v[j])} milhões`).join('; ')}`}
                className={`grid items-center gap-x-3 gap-y-1 py-2 ${semReal ? 'md:grid-cols-[auto_1fr_4.5rem_4.5rem_3.5rem]' : 'md:grid-cols-[auto_1fr_4.5rem_4.5rem_3.5rem_3.5rem]'}`}
              >
                <div className="min-w-0 md:w-56">
                  <span className="block truncate text-small font-semibold text-ink">{i.rotulo}</span>
                  {i.sub && <span className="block truncate text-label text-ink-soft">{i.sub}</span>}
                </div>
                <div className="space-y-0.5" aria-hidden="true">
                  {series.map((s, j) => (
                    <div key={s.rotulo} className="relative h-1.5">
                      <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: w(i.v[j]), background: s.cor, outline: s.contorno ? `1px solid ${s.contorno}` : undefined, outlineOffset: -1 }} />
                    </div>
                  ))}
                </div>
                <span className="hidden text-right text-small tabular-nums text-ink-soft md:block">{milhoes(i.v[base], 0)}</span>
                <span className="hidden text-right text-small font-semibold tabular-nums md:block">{milhoes(i.v[alvo], 0)}</span>
                <span className="hidden text-right text-small tabular-nums md:block">{fmtPct(vr.nominal)}</span>
                {!semReal && <span className="hidden text-right text-small tabular-nums text-ink-soft md:block">{fmtPct(vr.real)}</span>}
              </div>
            </li>
          )
        })}
      </ul>
      {d && itens[d.i] && (
        <div role="tooltip" className="pointer-events-none absolute z-20 w-64 rounded-brand border border-line bg-paper p-3 text-small shadow-lg" style={{ left: d.x, top: d.y }}>
          <div className="font-semibold text-ink">{itens[d.i].rotulo}</div>
          <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
            {series.map((s, j) => (<div key={s.rotulo} className="contents"><dt className="text-ink-soft">{s.rotulo}</dt><dd className="text-right">{milhoes(itens[d.i].v[j])}</dd></div>))}
            <dt className="text-ink-soft">{rotuloAlvo} sobre {rotuloBase}</dt>
            <dd className="text-right font-semibold">{fmtPct(variacoes(itens[d.i].v[base], itens[d.i].v[alvo], ipca).nominal)}</dd>
            <dt className="text-ink-soft">Variação real</dt>
            <dd className="text-right">{fmtPct(variacoes(itens[d.i].v[base], itens[d.i].v[alvo], ipca).real)}</dd>
          </dl>
          <div className="mt-1 text-label text-ink-soft">R$ milhões</div>
        </div>
      )}
    </div>
  )
}

/** Colunas lado a lado por ano (ou cenário): receita contra despesa, com o resultado embaixo de cada grupo. */
export function ColunasReceitaDespesa({ grupos }: { grupos: { rotulo: string; receita: number; despesa: number }[] }) {
  const max = Math.max(...grupos.flatMap((g) => [g.receita, g.despesa]))
  const bi = (x: number) => numero(x / 1e9, 1)
  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-4" role="img" aria-label={`Receita e despesa: ${grupos.map((g) => `${g.rotulo} receita ${bi(g.receita)} bilhões, despesa ${bi(g.despesa)} bilhões`).join('; ')}`}>
        {grupos.map((g) => (
          <div key={g.rotulo} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-52 w-full items-end justify-center gap-1">
              {[{ v: g.receita, cor: COR.ploa }, { v: g.despesa, cor: COR.empenhado }].map((b, j) => (
                <div key={j} className="flex h-full w-full max-w-[2.75rem] flex-col items-center justify-end">
                  <span className="mb-0.5 text-label tabular-nums text-ink">{bi(b.v)}</span>
                  <span className="block w-full" style={{ height: `${(b.v / max) * 82}%`, background: b.cor, borderRadius: '4px 4px 0 0' }} />
                </div>
              ))}
            </div>
            <span className="mt-1 text-center text-small font-semibold text-ink">{g.rotulo}</span>
            <span className={`text-label tabular-nums ${g.receita - g.despesa < -1e6 ? 'text-serie2' : 'text-ink-soft'}`}>
              {Math.abs(g.receita - g.despesa) < 1e6 ? 'equilíbrio' : `${sinal(g.receita - g.despesa)}${bi(Math.abs(g.receita - g.despesa))}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Doze colunas por mês: o ano anterior (cinza) e o corrente (azul-marinho), sem inventar os meses que faltam. */
export function ColunasMeses({ anterior, corrente, rotuloAnterior, rotuloCorrente }: {
  anterior: (number | null)[]; corrente: (number | null)[]; rotuloAnterior: string; rotuloCorrente: string
}) {
  const max = Math.max(1, ...anterior.map((x) => x ?? 0), ...corrente.map((x) => x ?? 0))
  return (
    <div role="img" aria-label={`Arrecadação mensal de ${rotuloAnterior} e ${rotuloCorrente}, em R$ milhões`}>
      <div className="flex h-56 items-stretch gap-1 sm:gap-2">
        {MESES.map((m, i) => (
          <div key={m} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-0.5">
              {[{ v: anterior[i], cor: COR.atualizada, ct: COR.contornoAtualizada, r: rotuloAnterior }, { v: corrente[i], cor: COR.ploa, ct: undefined, r: rotuloCorrente }].map((b) => (
                <span key={b.r} title={b.v === null ? `${m}/${b.r}: sem dado` : `${m}/${b.r}: R$ ${milhoes(b.v)} mi`} className="block w-full max-w-[1.25rem]"
                  style={{ height: b.v === null ? 0 : `${(b.v / max) * 100}%`, background: b.cor, outline: b.ct ? `1px solid ${b.ct}` : undefined, outlineOffset: -1, borderRadius: '3px 3px 0 0' }} />
              ))}
            </div>
            <span className="mt-1 text-label text-ink-soft">{m}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
