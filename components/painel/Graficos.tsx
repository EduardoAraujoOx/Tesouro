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
    <section aria-label={titulo} className={`min-w-0 rounded-brand border border-line bg-paper p-3 sm:p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-body font-semibold md:text-lead">{titulo}</h2>
        <div className="flex items-center gap-2 print:hidden">
          {direita}
          {tabela !== undefined && <div role="group" aria-label={`Forma de ver: ${titulo}`} className="inline-flex overflow-hidden rounded-brand border border-line text-small">
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

/** Caixa de dica (só em telas com ponteiro: no celular os valores já aparecem na própria linha). */
export function CaixaDica({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div role="tooltip" className="pointer-events-none absolute z-20 hidden w-64 rounded-brand border border-line bg-paper p-3 text-small shadow-lg md:block" style={{ left: x, top: y }}>
      {children}
    </div>
  )
}

function Dica({ v, rotulo, x, y }: { v: Soma; rotulo: string; x: number; y: number }) {
  const var_ = variacaoPct(v)
  const ex = execucaoPct(v)
  return (
    <CaixaDica x={x} y={y}>
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
    </CaixaDica>
  )
}

export function useDica() {
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

/* ---------- Linhas de barras: o mesmo desenho para todos os gráficos de comparação ---------- */
export type Barra = { segs: { v: number; cor: string; contorno?: string }[] }
/** `larg` é a largura da coluna de valor, em rem, na tela larga. */
export type ValorCol = { rotulo: string; texto: string; larg: number; forte?: boolean; suave?: boolean }
export type LinhaBarras = { chave: string; rotulo: string; sub?: string; barras: Barra[]; valores: ValorCol[]; aria?: string }

/**
 * Cada linha traz o rótulo, as barras e as colunas de valor. Na tela larga: rótulo | barras | colunas alinhadas.
 * No celular: rótulo, barras e, embaixo, os mesmos valores na horizontal com seus nomes (nada se perde).
 */
export function LinhasBarras({ linhas, escala, onEscolhe, dica }: {
  linhas: LinhaBarras[]; escala: number; onEscolhe?: (chave: string) => void; dica?: (i: number, x: number, y: number) => ReactNode
}) {
  const { caixa, d, setD, posiciona } = useDica()
  const w = (x: number) => `${Math.max(0, Math.min(100, (Math.abs(x) / escala) * 100))}%`
  const colunas = linhas[0]?.valores ?? []
  const cols = `minmax(0,min(19rem,36%)) minmax(0,1fr) ${colunas.map((c) => `${c.larg}rem`).join(' ')}`
  return (
    <div ref={caixa} className="relative" onMouseLeave={() => setD(null)} style={{ ['--cols' as string]: cols }}>
      <div className="hidden items-center justify-end gap-3 pb-1 text-label text-ink-soft md:flex" aria-hidden="true">
        {colunas.map((c) => <span key={c.rotulo} className="text-right" style={{ width: `${c.larg}rem` }}>{c.rotulo}</span>)}
      </div>
      <ul className="border-t border-line">
        {linhas.map((l, k) => (
          <li key={l.chave} className="border-t border-line first:border-t-0">
            <div
              tabIndex={0}
              role={onEscolhe ? 'button' : undefined}
              onClick={onEscolhe ? () => onEscolhe(l.chave) : undefined}
              onKeyDown={onEscolhe ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEscolhe(l.chave) } } : undefined}
              onMouseMove={dica ? (e) => posiciona(k, e.clientX, e.clientY) : undefined}
              onFocus={dica ? (e) => { const r = e.currentTarget.getBoundingClientRect(); posiciona(k, r.left + 40, r.top) } : undefined}
              onBlur={() => setD(null)}
              aria-label={onEscolhe ? undefined : l.aria}
              className={`grid grid-cols-1 items-center gap-x-3 gap-y-1.5 py-2.5 md:[grid-template-columns:var(--cols)] md:py-2 print:py-[3px] ${onEscolhe ? 'cursor-pointer hover:bg-surface' : ''}`}
            >
              <div className="min-w-0">
                <span title={l.rotulo} className="line-clamp-3 text-small font-semibold leading-snug text-ink md:line-clamp-2 print:line-clamp-1">{l.rotulo}</span>
                {l.sub && <span className="block truncate print:hidden text-label normal-case tracking-normal text-ink-soft">{l.sub}</span>}
              </div>
              <div className="space-y-0.5" aria-hidden="true">
                {l.barras.map((b, j) => (
                  <div key={j} className="relative h-2 print:h-1.5">
                    {b.segs.map((sg, m) => (
                      <span key={m} className="absolute inset-y-0 left-0 rounded-r" style={{ width: w(sg.v), background: sg.cor, outline: sg.contorno ? `1px solid ${sg.contorno}` : undefined, outlineOffset: -1 }} />
                    ))}
                  </div>
                ))}
              </div>
              {l.valores.map((c) => (
                <span key={c.rotulo} className={`hidden text-right text-small tabular-nums md:block ${c.forte ? 'font-semibold text-ink' : c.suave ? 'text-ink-soft' : ''}`}>{c.texto}</span>
              ))}
              <p className="grid gap-x-2 text-small tabular-nums md:hidden" style={{ gridTemplateColumns: `repeat(${l.valores.length}, minmax(0, 1fr))` }} aria-hidden="true">
                {l.valores.map((c) => (
                  <span key={c.rotulo} className="block">
                    <span className="block text-label normal-case leading-tight tracking-normal text-ink-soft">{c.rotulo}</span>
                    <span className={c.forte ? 'font-semibold text-ink' : c.suave ? 'text-ink-soft' : 'text-ink'}>{c.texto}</span>
                  </span>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {d && linhas[d.i] && dica?.(d.i, d.x, d.y)}
    </div>
  )
}

const fmtDelta = (dv: number | null) => (dv === null ? 'novo' : `${dv > 0 ? '+' : dv < 0 ? '−' : ''}${numero(Math.abs(dv), 0)}%`)

/** Linhas com duas barras finas: 2026 (cinza: atualizada e empenhado) e 2027 (azul-marinho). */
export function BarrasPares({ itens, onEscolhe }: { itens: Item[]; onEscolhe?: (chave: string) => void }) {
  const escala = Math.max(1, ...itens.flatMap((i) => [i.v[PLOA], i.v[ATU], i.v[EMP]]))
  const linhas: LinhaBarras[] = itens.map((i) => ({
    chave: i.chave, rotulo: i.rotulo, sub: i.sub,
    aria: `${i.rotulo}: PLOA 2027 ${milhoes(i.v[PLOA])} milhões; atualizada 2026 ${milhoes(i.v[ATU])}; empenhado 2026 ${milhoes(i.v[EMP])}`,
    barras: [
      { segs: [{ v: i.v[ATU], cor: COR.atualizada, contorno: COR.contornoAtualizada }, { v: i.v[EMP], cor: COR.empenhado }] },
      { segs: [{ v: i.v[PLOA], cor: COR.ploa }] },
    ],
    valores: [
      { rotulo: 'Atual. 26', texto: milhoes(i.v[ATU], 0), larg: 4.5, suave: true },
      { rotulo: 'PLOA 27', texto: milhoes(i.v[PLOA], 0), larg: 4.5, forte: true },
      { rotulo: 'Δ%', texto: fmtDelta(variacaoPct(i.v)), larg: 4 },
    ],
  }))
  return <LinhasBarras linhas={linhas} escala={escala} onEscolhe={onEscolhe} dica={(k, x, y) => <Dica v={itens[k].v} rotulo={itens[k].rotulo} x={x} y={y} />} />
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
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 md:items-center gap-y-1.5 py-2.5 md:grid-cols-[minmax(0,min(19rem,36%))_minmax(0,1fr)_4.5rem] md:py-2 print:py-[3px]"
              >
                <div className="min-w-0">
                  <span title={i.rotulo} className="line-clamp-3 text-small font-semibold leading-snug text-ink md:line-clamp-2 print:line-clamp-1">{i.rotulo}</span>
                  {i.sub && <span className="block truncate print:hidden text-label normal-case tracking-normal text-ink-soft">{i.sub}</span>}
                </div>
                <span className="text-right text-small font-semibold tabular-nums md:order-3">{x >= 0 ? '+' : '−'}{milhoes(Math.abs(x), 0)}</span>
                <div className="relative col-span-2 h-3 md:order-2 md:col-span-1" aria-hidden="true">
                  <span className="absolute inset-y-0 w-px bg-ink-soft/60" style={{ left: `${zeroPct}%` }} />
                  <span className="absolute inset-y-0.5" style={{
                    left: x >= 0 ? `${zeroPct}%` : `${zeroPct - (-x / amplitude) * 100}%`,
                    width: `${(Math.abs(x) / amplitude) * 100}%`,
                    background: x >= 0 ? COR.alta : COR.baixa,
                    borderRadius: x >= 0 ? '0 4px 4px 0' : '4px 0 0 4px',
                  }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {d && itens[d.i] && <Dica v={itens[d.i].v} rotulo={itens[d.i].rotulo} x={d.x} y={d.y} />}
    </div>
  )
}

export type Coluna<T> = { rotulo: string; valor: (x: T) => ReactNode; alinha?: 'left' | 'right' }
/**
 * Tabela com cabeçalho fixo, primeira coluna fixa (no celular a rolagem horizontal deixa sempre à vista o que cada linha é)
 * e sombra nas bordas quando há mais conteúdo para rolar.
 */
export function TabelaItens<T extends { chave: string }>({ itens, colunas, legenda }: { itens: T[]; colunas: Coluna<T>[]; legenda: string }) {
  return (
    <div tabIndex={0} role="region" aria-label={legenda} className="rola max-h-[32rem] overflow-auto rounded-brand border border-line">
      <table className="w-full min-w-max text-left text-small">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>{colunas.map((c, j) => (
            <th key={c.rotulo} scope="col" className={`sticky top-0 bg-surface px-3 py-2 font-semibold ${j === 0 ? 'left-0 z-20 min-w-[8.5rem]' : 'z-10 whitespace-nowrap text-right'}`}>{c.rotulo}</th>
          ))}</tr>
        </thead>
        <tbody>
          {itens.map((it) => (
            <tr key={it.chave} className="border-t border-line">
              {colunas.map((c, j) => j === 0
                ? <th key={c.rotulo} scope="row" className="sticky left-0 z-[1] min-w-[8.5rem] max-w-[11rem] whitespace-normal bg-paper px-3 py-1.5 align-top font-normal shadow-[1px_0_0_rgb(var(--line))] md:max-w-[30rem]">{c.valor(it)}</th>
                : <td key={c.rotulo} className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{c.valor(it)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
