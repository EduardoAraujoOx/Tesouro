'use client'

import { useState, type ReactNode } from 'react'

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
/** Cartão de painel com alternância entre gráfico e tabela (a tabela é a leitura exata e acessível do mesmo dado). */
export function Cartao({ titulo, legenda, grafico, tabela, direita, className = '', children }: {
  titulo: string; legenda?: ReactNode; grafico?: ReactNode; tabela?: ReactNode; direita?: ReactNode; className?: string; children?: ReactNode
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
      <div className="mt-3">{vista === 'grafico' || tabela === undefined ? (grafico ?? children) : tabela}</div>
    </section>
  )
}

export type ColunaDelta<T> = { rotulo: string; valor: (x: T) => ReactNode; forte?: boolean }

/**
 * Tabela de variação: rótulo, uma barra divergente (azul = aumento, rosa = redução) e os números exatos ao lado.
 * A barra mostra uma coisa só, a diferença que importa; os valores ficam na tabela, arredondados.
 */
export function TabelaDelta<T extends { chave: string }>({ itens, colunas, delta, rotuloBarra, legenda, primeira }: {
  itens: T[]; colunas: ColunaDelta<T>[]; delta: (x: T) => number; rotuloBarra: string; legenda: string; primeira: (x: T) => ReactNode
}) {
  const max = Math.max(1, ...itens.map((i) => Math.max(0, delta(i))))
  const min = Math.min(-1, ...itens.map((i) => Math.min(0, delta(i))))
  const amplitude = max - min
  const zeroPct = (-min / amplitude) * 100
  const barraDe = (x: number) => (
    <div className="relative h-3 w-full min-w-[7rem]" aria-hidden="true">
      <span className="absolute inset-y-0 w-px bg-ink-soft/60" style={{ left: `${zeroPct}%` }} />
      <span className="absolute inset-y-0.5" style={{
        left: x >= 0 ? `${zeroPct}%` : `${zeroPct - (-x / amplitude) * 100}%`,
        width: `${(Math.abs(x) / amplitude) * 100}%`,
        background: x >= 0 ? COR.alta : COR.baixa,
        borderRadius: x >= 0 ? '0 4px 4px 0' : '4px 0 0 4px',
      }} />
    </div>
  )
  return (
    <>
    {/* celular: cada linha vira um bloco (nome, barra e os números com seus nomes), sem rolagem lateral */}
    <ul aria-label={legenda} className="divide-y divide-line border-y border-line md:hidden">
      {itens.map((it) => (
        <li key={it.chave} className="py-2.5">
          <div className="text-small">{primeira(it)}</div>
          <div className="mt-1.5">{barraDe(delta(it))}</div>
          <dl className="mt-1.5 grid gap-x-2 gap-y-1 text-small tabular-nums" style={{ gridTemplateColumns: `repeat(${colunas.length === 6 ? 3 : Math.min(colunas.length, 4)}, minmax(0, 1fr))` }}>
            {colunas.map((c) => (
              <div key={c.rotulo}>
                <dt className="text-label normal-case leading-tight tracking-normal text-ink-soft">{c.rotulo}</dt>
                <dd className={c.forte ? 'font-semibold text-ink' : ''}>{c.valor(it)}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
    <div tabIndex={0} role="region" aria-label={legenda} className="rola hidden overflow-x-auto rounded-brand border border-line md:block">
      <table className="w-full min-w-max text-left text-small">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-20 min-w-[9rem] bg-surface px-3 py-2 font-semibold">{rotuloBarra.split('|')[0]}</th>
            <th scope="col" className="sticky top-0 z-10 min-w-[8.5rem] bg-surface px-3 py-2 font-semibold">{rotuloBarra.split('|')[1]}</th>
            {colunas.map((c) => <th key={c.rotulo} scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-surface px-3 py-2 text-right font-semibold">{c.rotulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => {
            const barra = barraDe(delta(it))
            return (
              <tr key={it.chave} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-[1] min-w-[10rem] max-w-[12rem] whitespace-normal bg-paper px-3 py-1.5 align-middle font-normal shadow-[1px_0_0_rgb(var(--line))] md:max-w-[26rem]">{primeira(it)}</th>
                <td className="px-3 py-1.5" aria-hidden="true">{barra}</td>
                {colunas.map((c) => <td key={c.rotulo} className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${c.forte ? 'font-semibold' : ''}`}>{c.valor(it)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}

export type Coluna<T> = { rotulo: string; valor: (x: T) => ReactNode; alinha?: 'left' | 'right' }
/**
 * Tabela com cabeçalho fixo, primeira coluna fixa (no celular a rolagem horizontal deixa sempre à vista o que cada linha é)
 * e sombra nas bordas quando há mais conteúdo para rolar.
 */
export function TabelaItens<T extends { chave: string }>({ itens, colunas, legenda, altura = 'limitada' }: { itens: T[]; colunas: Coluna<T>[]; legenda: string; altura?: 'limitada' | 'livre' }) {
  return (
    <div tabIndex={0} role="region" aria-label={legenda} className={`rola overflow-auto rounded-brand border border-line ${altura === 'livre' ? '' : 'max-h-[32rem]'}`}>
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
