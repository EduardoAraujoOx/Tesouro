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
  /** valor da barra, em R$ */
  v: number
  /** 'real' = realizado; 'estim' = estimativa ou projeção (barra clara tracejada); 'ploa' = proposta de 2027 (azul-marinho) */
  tipo: 'real' | 'estim' | 'ploa' | 'ref'
  /** faixa de incerteza da projeção (R$) */
  faixa?: [number, number]
  /** índice da coluna com que a variação mostrada embaixo é calculada (padrão: a coluna anterior) */
  contra?: number
  /** traço de referência (R$) com o seu nome */
  marca?: { v: number; rotulo: string }
}

/** Colunas por ano: valor em bilhões em cima, variação sobre a coluna anterior embaixo. Faixa e traço de referência opcionais. */
export function ColunasAnuais({ colunas, descricao }: { colunas: ColunaAnual[]; descricao: string }) {
  const max = Math.max(...colunas.flatMap((c) => [c.v, c.faixa?.[1] ?? 0, c.marca?.v ?? 0]))
  const topo = max * 1.08
  const h = (x: number) => `${(x / topo) * 100}%`
  const bi = (x: number) => numero(x / 1e9, 1)
  return (
    <div role="img" aria-label={descricao}>
      <div className="flex gap-1.5 sm:gap-4">
        {colunas.map((c, k) => {
          const ant = c.contra !== undefined ? colunas[c.contra].v : k > 0 ? colunas[k - 1].v : null
          const d = ant ? (c.v / ant - 1) * 100 : null
          return (
            <div key={c.rotulo} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="relative h-52 w-full">
                <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[4.5rem]" style={{ height: h(c.v) }}>
                  <span className="absolute inset-x-0 -top-5 text-center text-small font-semibold tabular-nums text-ink">{bi(c.v)}</span>
                  <span className="block h-full w-full" style={{
                    background: c.tipo === 'ploa' ? COR.ploa : c.tipo === 'ref' ? COR.referencia : c.tipo === 'real' ? COR.empenhado : COR.atualizada,
                    outline: c.tipo === 'estim' ? `1.5px dashed ${COR.contornoAtualizada}` : undefined, outlineOffset: -1.5,
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
                {c.faixa && (
                  <span aria-hidden="true" className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-ink" style={{ bottom: h(c.faixa[0]), height: `calc(${h(c.faixa[1])} - ${h(c.faixa[0])})` }} />
                )}
                {c.marca && (
                  <span aria-hidden="true" title={`${c.marca.rotulo}: ${bi(c.marca.v)} bi`} className="absolute inset-x-0 mx-auto flex max-w-[4.5rem] items-center border-t-2 border-serie2" style={{ bottom: h(c.marca.v) }} />
                )}
              </div>
              <span className="mt-1.5 w-full border-t border-line pt-1 text-center text-label font-semibold normal-case leading-tight tracking-normal text-ink sm:text-small">{c.rotulo}</span>
              <span className={`text-label normal-case tracking-normal tabular-nums ${d === null ? 'text-transparent' : 'text-ink-soft'}`}>{d === null ? '–' : fmtPct(d)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
