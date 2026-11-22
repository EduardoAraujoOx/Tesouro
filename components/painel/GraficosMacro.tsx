'use client'

import { milhoes, numero } from '@/lib/formato'
import { COR } from './Graficos'

export type ItemSerie = { chave: string; rotulo: string; sub?: string; v: number[] }

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
/** Variação em %; acima de 999% vira "> 999%" (variação sobre base minúscula não informa nada). */
export const fmtPct = (x: number | null | undefined, casas = 1) => (x === undefined ? '–' : x === null ? 'novo' : Math.abs(x) > 999 ? `> ${sinal(x)}999%` : `${sinal(x)}${numero(Math.abs(x), casas)}%`)
/** Variação nominal e real (deflacionada pelo IPCA do ano de destino), em %. */
export function variacoes(base: number, alvo: number, ipca: number): { nominal: number | null | undefined; real: number | null | undefined } {
  if (!base && !alvo) return { nominal: undefined, real: undefined }
  if (!base) return { nominal: null, real: null }
  const nominal = (alvo / base - 1) * 100
  return { nominal, real: ((1 + nominal / 100) / (1 + ipca) - 1) * 100 }
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Limite superior "redondo" (1, 2, 4, 6, 8 ou 10 vezes uma potência de dez): as quatro divisões do eixo caem em números limpos. */
function topoBonito(max: number) {
  const e = Math.pow(10, Math.floor(Math.log10(max)))
  const f = max / e
  return ([1, 2, 4, 6, 8, 10].find((n) => f <= n) ?? 10) * e
}
/** Rótulo do eixo: o valor chega em reais. */
const rotuloEixo = (r: number) => (r === 0 ? '0' : r >= 1e9 ? `${numero(r / 1e9, (r / 1e9) % 1 ? 1 : 0)} bi` : `${numero(r / 1e6, 0)} mi`)

/** Doze colunas por mês: o ano anterior (cinza) e o corrente (azul-marinho), com eixo e linhas de referência. Sem inventar os meses que faltam. */
export function ColunasMeses({ anterior, corrente, rotuloAnterior, rotuloCorrente }: {
  anterior: (number | null)[]; corrente: (number | null)[]; rotuloAnterior: string; rotuloCorrente: string
}) {
  const max = Math.max(1, ...anterior.map((x) => x ?? 0), ...corrente.map((x) => x ?? 0))
  const topo = topoBonito(max)
  const marcas = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div role="img" aria-label={`Arrecadação mensal de ${rotuloAnterior} e ${rotuloCorrente}, em R$ milhões`}>
      <div className="flex gap-2">
        <div className="relative mt-2 h-52 w-11 shrink-0" aria-hidden="true">
          {marcas.map((m) => (
            <span key={m} className="absolute right-0 translate-y-1/2 text-label normal-case tracking-normal tabular-nums text-ink-soft" style={{ bottom: `${m * 100}%` }}>{rotuloEixo(topo * m)}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative mt-2 h-52">
            {marcas.map((m) => <span key={m} className={`absolute inset-x-0 border-t ${m === 0 ? 'border-ink-soft/60' : 'border-line'}`} style={{ bottom: `${m * 100}%` }} />)}
            <div className="absolute inset-0 flex items-stretch gap-1 sm:gap-2">
              {MESES.map((m, i) => (
                <div key={m} className="flex min-w-0 flex-1 items-end justify-center gap-px sm:gap-0.5">
                  {[{ v: anterior[i], cor: COR.atualizada, ct: COR.contornoAtualizada, r: rotuloAnterior }, { v: corrente[i], cor: COR.ploa, ct: undefined, r: rotuloCorrente }].map((b) => (
                    <span key={b.r} title={b.v === null ? `${m}/${b.r}: sem dado` : `${m}/${b.r}: R$ ${milhoes(b.v)} mi`} className="block w-full max-w-[1.25rem]"
                      style={{ height: b.v === null ? 0 : `${(b.v / topo) * 100}%`, background: b.cor, outline: b.ct ? `1px solid ${b.ct}` : undefined, outlineOffset: -1, borderRadius: '3px 3px 0 0' }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-1 sm:gap-2" aria-hidden="true">
            {MESES.map((m) => <span key={m} className="min-w-0 flex-1 text-center text-label normal-case tracking-normal text-ink-soft">{m}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export type ColunaAnual = {
  rotulo: string
  /** segunda linha do rótulo (ex.: "PLOA", "projeção"), em tom mais discreto */
  sub?: string
  /** valor da barra, em R$ */
  v: number
  /** 'real' = realizado; 'estim' = estimativa ou projeção (barra clara tracejada); 'ploa' = proposta de 2027 (azul-marinho); 'ref' = nossa projeção de 2027 (azul-celeste) */
  tipo: 'real' | 'estim' | 'ploa' | 'ref'
  /** faixa de incerteza da projeção (R$) */
  faixa?: [number, number]
  /** traço de referência (R$) com o seu nome */
  marca?: { v: number; rotulo: string }
  /** traço de comparação: um valor (R$) marcado sobre a barra, com o percentual da barra sobre ele (usado para pôr a PLOA sobre a nossa projeção: o percentual diz se a PLOA está acima ou abaixo) */
  compara?: { v: number; rotulo: string; /** 'pct' (padrão): percentual da barra sobre o traço; 'valor': diferença em R$ milhões (para resultados, em que o percentual sobre uma base pequena não informa) */ modo?: 'pct' | 'valor' }
  /** o que é a barra e como foi calculada, em poucas palavras: aparece ao passar o mouse, tocar ou focar na coluna */
  explicacao?: string
}

const COR_COLUNA = { ploa: COR.ploa, ref: COR.referencia, real: COR.empenhado, estim: COR.atualizada }

function diferenca(c: ColunaAnual) {
  if (!c.compara) return null
  const base = c.compara.v
  if (c.compara.modo === 'valor') {
    const delta = c.v - base
    return `${sinal(delta)}${numero(Math.abs(delta) / 1e6, 0)} mi`
  }
  return fmtPct(base === 0 ? null : (c.v / base - 1) * 100)
}

/** Colunas por ano, com o valor em bilhões em cima. Faixa, traço de referência e traço de comparação opcionais. */
export function ColunasAnuais({ colunas, descricao, casas = 1 }: { colunas: ColunaAnual[]; descricao: string; /** casas decimais do valor em bilhões (2 para séries pequenas, como o resultado) */ casas?: number }) {
  const max = Math.max(...colunas.flatMap((c) => [c.v, c.faixa?.[1] ?? 0, c.marca?.v ?? 0, c.compara?.v ?? 0]))
  const topo = max * (colunas.some((c) => c.compara) ? 1.16 : 1.08)
  const h = (x: number) => `${(Math.max(x, 0) / topo) * 100}%`
  const bi = (x: number) => numero(x / 1e9, casas)
  return (
    <div role="group" aria-label={descricao} className="painel-grafico-anual">
      <div className="painel-colunas-anuais flex gap-1.5 sm:gap-4">
        {colunas.map((c, k) => {
          /* a dica abre alinhada à esquerda nas primeiras colunas, à direita nas últimas e centrada nas do meio, para não sair do cartão */
          const lado = k < colunas.length / 3 ? 'left-0' : k >= (colunas.length * 2) / 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
          const dif = diferenca(c)
          const dentro = c.compara ? c.compara.v < c.v : false
          return (
            <div key={c.rotulo + (c.sub ?? '')} className={`group relative flex min-w-0 flex-1 flex-col items-center ${c.explicacao ? 'cursor-help rounded-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy' : ''}`}
              {...(c.explicacao ? { tabIndex: 0, role: 'img', 'aria-label': `${c.rotulo}${c.sub ? ' ' + c.sub : ''}: ${bi(c.v)} bilhões. ${c.explicacao}` } : {})}>
              {c.explicacao && (
                <span aria-hidden="true" className={`pointer-events-none absolute top-0 z-30 hidden w-60 max-w-[70vw] rounded-brand border border-line bg-paper p-2.5 text-left text-small normal-case leading-snug tracking-normal text-ink shadow-lg group-hover:block group-focus:block ${lado}`}>
                  <span className="mb-1 block font-semibold">{c.rotulo}{c.sub ? ` · ${c.sub}` : ''}</span>
                  {c.explicacao}
                </span>
              )}
              <div className="relative h-52 w-full print:h-20">
                <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[4.5rem]" style={{ height: h(c.v) }}>
                  <span className="block h-full w-full" style={{
                    background: COR_COLUNA[c.tipo],
                    outline: c.tipo === 'estim' ? `1.5px dashed ${COR.contornoAtualizada}` : undefined, outlineOffset: -1.5,
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
                <span className="absolute inset-x-0 text-center text-small font-semibold tabular-nums leading-none text-ink" style={{ bottom: `calc(${h(Math.max(c.v, c.faixa?.[1] ?? 0, c.marca?.v ?? 0, c.compara?.v ?? 0))} + ${c.compara && !dentro ? '1.35rem' : '0.3rem'})` }}>{bi(c.v)}</span>
                {c.faixa && (
                  <span aria-hidden="true" className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-ink" style={{ bottom: h(c.faixa[0]), height: `calc(${h(c.faixa[1])} - ${h(c.faixa[0])})` }} />
                )}
                {c.marca && (
                  <span aria-hidden="true" title={`${c.marca.rotulo}: ${bi(c.marca.v)} bi`} className="absolute inset-x-0 mx-auto flex max-w-[4.5rem] items-center border-t-2 border-serie2" style={{ bottom: h(c.marca.v) }} />
                )}
                {c.compara && dif !== null && (
                  <>
                    <span aria-hidden="true" title={`${c.compara.rotulo}: ${bi(c.compara.v)} bi`} className="absolute inset-x-0 mx-auto max-w-[4.5rem] border-t-2 border-dashed" style={{ bottom: h(c.compara.v), borderColor: dentro ? 'rgb(var(--on-navy))' : 'rgb(var(--navy))' }} />
                    <span aria-hidden="true" className={`absolute inset-x-0 mx-auto max-w-[4.5rem] text-center text-label font-semibold normal-case tabular-nums leading-none tracking-normal ${dentro ? 'text-on-navy' : 'text-ink'}`} style={{ bottom: `calc(${h(c.compara.v)} ${dentro ? '- 1.1rem' : '+ 0.25rem'})` }}>
                      {dif}
                    </span>
                  </>
                )}
              </div>
              <span className="mt-1.5 w-full border-t border-line pt-1 text-center text-label font-semibold normal-case leading-tight tracking-normal text-ink sm:text-small">{c.rotulo}</span>
              <span className={`text-center text-label normal-case leading-tight tracking-normal text-ink-soft ${c.sub ? '' : 'invisible'}`}>{c.sub ?? '–'}</span>
            </div>
          )
        })}
      </div>
      <ul className="painel-barras-anuais hidden space-y-2.5 text-small print:hidden">
        {colunas.map((c) => (
          <li key={c.rotulo + (c.sub ?? '')}>
            <div className="flex flex-wrap justify-between gap-x-2">
              <span>{c.rotulo}{c.sub && <span className="text-ink-soft"> · {c.sub}</span>}</span>
              <strong className="tabular-nums">R$ {bi(c.v)} bi</strong>
            </div>
            <div aria-hidden="true" className="relative mt-0.5 h-3 rounded-sm bg-surface">
              <span className="absolute inset-y-0 left-0 rounded-sm" style={{
                width: h(c.v),
                background: COR_COLUNA[c.tipo],
                border: c.tipo === 'estim' && c.v > 0 ? `1px dashed ${COR.contornoAtualizada}` : undefined,
              }} />
              {c.faixa && <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink" style={{ left: h(c.faixa[0]), width: `calc(${h(c.faixa[1])} - ${h(c.faixa[0])})` }} />}
              {c.marca && <span className="absolute inset-y-0 border-l-2 border-serie2" style={{ left: h(c.marca.v) }} />}
              {c.compara && <span className="absolute -inset-y-0.5 border-l-2 border-dashed" style={{ left: h(c.compara.v), borderColor: c.compara.v < c.v ? 'rgb(var(--on-navy))' : 'rgb(var(--navy))' }} />}
            </div>
            {c.faixa && <p className="mt-0.5 text-label tracking-normal text-ink-soft">Faixa de {bi(c.faixa[0])} a {bi(c.faixa[1])}</p>}
            {c.marca && <p className="mt-0.5 text-label tracking-normal text-ink-soft">{c.marca.rotulo} · {bi(c.marca.v)}</p>}
            {c.compara && <p className="mt-0.5 text-label tracking-normal text-ink-soft">{diferenca(c)} em relação à {c.compara.rotulo.toLowerCase()}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
