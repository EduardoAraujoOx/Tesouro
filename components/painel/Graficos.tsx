'use client'

import { useRef, useState, type ReactNode } from 'react'
import { milhoes, numero, pct } from '@/lib/formato'
import { ATU, EMP, INI, LIQ, PAGO, PLOA, execucaoPct, variacaoPct, type Item, type Soma } from './dados'

/* Cores por função (método de ênfase): 2027 em azul-marinho; 2026 em cinza, claro (autorizado) e escuro (empenhado).
   Variação: par divergente azul/rosa da logomarca (validado para daltonismo). Tudo por variáveis do tema, que trocam no alto contraste. */
export const COR = {
  ploa: 'rgb(var(--navy))',
  atualizada: 'rgb(var(--ink-soft) / 0.28)',
  contornoAtualizada: 'rgb(var(--ink-soft) / 0.55)',
  empenhado: 'rgb(var(--ink-soft) / 0.78)',
  alta: 'rgb(var(--serie3))',
  baixa: 'rgb(var(--serie2))',
}

export function Legenda({ itens }: { itens: { cor: string; rotulo: string; contorno?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-soft">
      {itens.map((i) => (
        <li key={i.rotulo} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm" style={{ background: i.cor, outline: i.contorno ? `1px solid ${i.contorno}` : undefined }} />
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}
export const LEGENDA_PARES = [
  { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Atualizada 2026' },
  { cor: COR.empenhado, rotulo: 'Empenhado 2026' },
  { cor: COR.ploa, rotulo: 'PLOA 2027' },
]

/** Cartão de painel com alternância entre gráfico e tabela (a tabela é a leitura exata e acessível do mesmo dado). */
export function Cartao({ titulo, legenda, grafico, tabela, direita, className = '' }: {
  titulo: string; legenda?: ReactNode; grafico: ReactNode; tabela?: ReactNode; direita?: ReactNode; className?: string
}) {
  const [vista, setVista] = useState<'grafico' | 'tabela'>('grafico')
  return (
    <section aria-label={titulo} className={`rounded-brand border border-line bg-paper p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-lead font-semibold">{titulo}</h2>
        <div className="flex items-center gap-2">
          {direita}
          {tabela !== undefined && <div role="group" aria-label={`Forma de ver: ${titulo}`} className="inline-flex overflow-hidden rounded-brand border border-line text-small print:hidden">
            {([['grafico', 'Gráfico'], ['tabela', 'Tabela']] as const).map(([v, r]) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
                className={`px-3 py-1 ${vista === v ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{r}</button>
            ))}
          </div>}
        </div>
      </div>
      {legenda && vista === 'grafico' && <div className="mt-2">{legenda}</div>}
      <div className="mt-3">{vista === 'grafico' || tabela === undefined ? grafico : tabela}</div>
    </section>
  )
}

function Dica({ v, rotulo, x, y }: { v: Soma; rotulo: string; x: number; y: number }) {
  const var_ = variacaoPct(v)
  const ex = execucaoPct(v)
  return (
    <div role="tooltip" className="pointer-events-none absolute z-20 w-64 rounded-brand border border-line bg-paper p-3 text-small shadow-lg" style={{ left: x, top: y }}>
      <div className="font-semibold text-ink">{rotulo}</div>
      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
        <dt className="text-ink-soft">PLOA 2027</dt><dd className="text-right font-semibold">{milhoes(v[PLOA])}</dd>
        <dt className="text-ink-soft">Inicial 2026</dt><dd className="text-right">{milhoes(v[INI])}</dd>
        <dt className="text-ink-soft">Atualizada 2026</dt><dd className="text-right">{milhoes(v[ATU])}</dd>
        <dt className="text-ink-soft">Empenhado 2026</dt><dd className="text-right">{milhoes(v[EMP])}{ex !== null ? ` (${numero(ex, 0)}%)` : ''}</dd>
        <dt className="text-ink-soft">Liquidado 2026</dt><dd className="text-right">{milhoes(v[LIQ])}</dd>
        <dt className="text-ink-soft">Pago 2026</dt><dd className="text-right">{milhoes(v[PAGO])}</dd>
        <dt className="text-ink-soft">PLOA ÷ atualizada</dt><dd className="text-right font-semibold">{var_ === null ? 'sem base' : pct(100 + var_, 0)}</dd>
      </dl>
      <div className="mt-1 text-label text-ink-soft">R$ milhões</div>
    </div>
  )
}

function useDica() {
  const caixa = useRef<HTMLDivElement>(null)
  const [d, setD] = useState<{ i: number; x: number; y: number } | null>(null)
  const posiciona = (i: number, cx: number, cy: number) => {
    const r = caixa.current?.getBoundingClientRect()
    if (!r) return
    const largura = r.width
    let x = cx - r.left + 14
    if (x + 256 > largura) x = Math.max(0, cx - r.left - 270)
    setD({ i, x, y: cy - r.top + 14 })
  }
  return { caixa, d, setD, posiciona }
}

/** Linhas com duas barras finas: 2026 (cinza: atualizada e empenhado) e 2027 (azul-marinho). */
export function BarrasPares({ itens, onEscolhe }: { itens: Item[]; onEscolhe?: (chave: string) => void }) {
  const { caixa, d, setD, posiciona } = useDica()
  const escala = Math.max(1, ...itens.flatMap((i) => [i.v[PLOA], i.v[ATU], i.v[EMP]]))
  const w = (x: number) => `${Math.max(0, Math.min(100, (x / escala) * 100))}%`
  return (
    <div ref={caixa} className="relative" onMouseLeave={() => setD(null)}>
      <div className="hidden items-center justify-end gap-3 pb-1 text-label text-ink-soft md:flex" aria-hidden="true">
        <span className="w-[4.5rem] text-right">Atual. 26</span><span className="w-[4.5rem] text-right">PLOA 27</span><span className="w-16 text-right">Δ%</span>
      </div>
      <ul className="border-t border-line">
        {itens.map((i, k) => {
          const v = i.v
          const dv = variacaoPct(v)
          return (
            <li key={i.chave} className="border-t border-line first:border-t-0">
              <div
                tabIndex={0}
                role={onEscolhe ? 'button' : undefined}
                onClick={onEscolhe ? () => onEscolhe(i.chave) : undefined}
                onKeyDown={onEscolhe ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEscolhe(i.chave) } } : undefined}
                onMouseMove={(e) => posiciona(k, e.clientX, e.clientY)}
                onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); posiciona(k, r.left + 40, r.top) }}
                onBlur={() => setD(null)}
                aria-label={onEscolhe ? undefined : `${i.rotulo}: PLOA 2027 ${milhoes(v[PLOA])} milhões; atualizada 2026 ${milhoes(v[ATU])}; empenhado 2026 ${milhoes(v[EMP])}`}
                className={`grid items-center gap-x-3 gap-y-1 py-2 md:grid-cols-[auto_1fr_4.5rem_4.5rem_4rem] ${onEscolhe ? 'cursor-pointer hover:bg-surface' : ''}`}
              >
                <div className="min-w-0 md:w-60">
                  <span className="block truncate text-small font-semibold text-ink">{i.rotulo}</span>
                  {i.sub && <span className="block truncate text-label normal-case tracking-normal text-ink-soft">{i.sub}</span>}
                </div>
                <div className="space-y-0.5" aria-hidden="true">
                  <div className="relative h-2">
                    <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: w(v[ATU]), background: COR.atualizada, outline: `1px solid ${COR.contornoAtualizada}`, outlineOffset: -1 }} />
                    <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: w(v[EMP]), background: COR.empenhado }} />
                  </div>
                  <div className="relative h-2">
                    <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: w(v[PLOA]), background: COR.ploa }} />
                  </div>
                </div>
                <span className="hidden text-right text-small tabular-nums text-ink-soft md:block">{milhoes(v[ATU], 0)}</span>
                <span className="hidden text-right text-small font-semibold tabular-nums md:block">{milhoes(v[PLOA], 0)}</span>
                <span className="hidden text-right text-small tabular-nums md:block">{dv === null ? 'novo' : `${dv > 0 ? '+' : dv < 0 ? '−' : ''}${numero(Math.abs(dv), 0)}%`}</span>
              </div>
            </li>
          )
        })}
      </ul>
      {d && itens[d.i] && <Dica v={itens[d.i].v} rotulo={itens[d.i].rotulo} x={d.x} y={d.y} />}
    </div>
  )
}

/** Barras divergentes centradas em zero: aumento (azul) e redução (rosa) da PLOA sobre a atualizada de 2026. */
export function BarrasVariacao({ itens }: { itens: Item[] }) {
  const { caixa, d, setD, posiciona } = useDica()
  const dif = (i: Item) => i.v[PLOA] - i.v[ATU]
  const max = Math.max(1, ...itens.map((i) => Math.max(0, dif(i))))
  const min = Math.min(-1, ...itens.map((i) => Math.min(0, dif(i))))
  const amplitude = max - min
  const zeroPct = (-min / amplitude) * 100
  return (
    <div ref={caixa} className="relative" onMouseLeave={() => setD(null)}>
      <ul>
        {itens.map((i, k) => {
          const x = dif(i)
          return (
            <li key={i.chave} className="border-t border-line first:border-t-0">
              <div
                tabIndex={0}
                onMouseMove={(e) => posiciona(k, e.clientX, e.clientY)}
                onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); posiciona(k, r.left + 40, r.top) }}
                onBlur={() => setD(null)}
                aria-label={`${i.rotulo}: PLOA 2027 menos atualizada 2026 igual a ${x >= 0 ? 'mais' : 'menos'} ${milhoes(Math.abs(x))} milhões`}
                className="grid items-center gap-x-3 gap-y-1 py-2 md:grid-cols-[auto_1fr_4.5rem]"
              >
                <div className="min-w-0 md:w-56">
                  <span className="block truncate text-small font-semibold text-ink">{i.rotulo}</span>
                  {i.sub && <span className="block truncate text-label normal-case tracking-normal text-ink-soft">{i.sub}</span>}
                </div>
                <div className="relative h-3" aria-hidden="true">
                  <span className="absolute inset-y-0 w-px bg-ink-soft/60" style={{ left: `${zeroPct}%` }} />
                  <span className="absolute inset-y-0.5" style={{
                    left: x >= 0 ? `${zeroPct}%` : `${zeroPct - (-x / amplitude) * 100}%`,
                    width: `${(Math.abs(x) / amplitude) * 100}%`,
                    background: x >= 0 ? COR.alta : COR.baixa,
                    borderRadius: x >= 0 ? '0 4px 4px 0' : '4px 0 0 4px',
                  }} />
                </div>
                <span className="text-right text-small font-semibold tabular-nums">{x >= 0 ? '+' : '−'}{milhoes(Math.abs(x), 0)}</span>
              </div>
            </li>
          )
        })}
      </ul>
      {d && itens[d.i] && <Dica v={itens[d.i].v} rotulo={itens[d.i].rotulo} x={d.x} y={d.y} />}
    </div>
  )
}

export type Coluna<T> = { rotulo: string; valor: (x: T) => string; alinha?: 'left' | 'right' }
/** Tabela simples, com cabeçalhos de coluna, para a leitura exata dos mesmos itens do gráfico. */
export function TabelaItens<T extends { chave: string }>({ itens, colunas, legenda }: { itens: T[]; colunas: Coluna<T>[]; legenda: string }) {
  return (
    <div tabIndex={0} role="region" aria-label={legenda} className="max-h-[32rem] overflow-auto rounded-brand border border-line">
      <table className="w-full text-left text-small">
        <caption className="sr-only">{legenda}</caption>
        <thead className="sticky top-0 bg-surface">
          <tr>{colunas.map((c, j) => <th key={c.rotulo} scope="col" className={`px-3 py-2 ${j > 0 || c.alinha === 'right' ? 'text-right' : ''}`}>{c.rotulo}</th>)}</tr>
        </thead>
        <tbody>
          {itens.map((it) => (
            <tr key={it.chave} className="border-t border-line">
              {colunas.map((c, j) => j === 0
                ? <th key={c.rotulo} scope="row" className="px-3 py-1.5 font-normal">{c.valor(it)}</th>
                : <td key={c.rotulo} className="px-3 py-1.5 text-right tabular-nums">{c.valor(it)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
