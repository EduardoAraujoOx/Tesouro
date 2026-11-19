'use client'

import { milhoes, numero } from '@/lib/formato'
import { CaixaDica, COR, LinhasBarras, type LinhaBarras } from './Graficos'

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

/** Linhas com uma barra fina por série e colunas de valor e variação (nominal e real) entre duas séries. */
export function BarrasSeries({ itens, series, base, alvo, ipca, rotuloBase, rotuloAlvo, semReal = false, rotuloDelta = 'Δ%' }: {
  itens: ItemSerie[]; series: Serie[]; base: number; alvo: number; ipca: number; rotuloBase: string; rotuloAlvo: string; semReal?: boolean; rotuloDelta?: string
}) {
  const escala = Math.max(1, ...itens.flatMap((i) => i.v.map((x) => Math.abs(x))))
  const linhas: LinhaBarras[] = itens.map((i) => {
    const vr = variacoes(i.v[base], i.v[alvo], ipca)
    return {
      chave: i.chave, rotulo: i.rotulo, sub: i.sub,
      aria: `${i.rotulo}: ${series.map((s, j) => `${s.rotulo} ${milhoes(i.v[j])} milhões`).join('; ')}`,
      barras: series.map((s, j) => ({ segs: [{ v: i.v[j], cor: s.cor, contorno: s.contorno }] })),
      valores: [
        { rotulo: rotuloBase, texto: milhoes(i.v[base], 0), larg: 4.5, suave: true },
        { rotulo: rotuloAlvo, texto: milhoes(i.v[alvo], 0), larg: 4.5, forte: true },
        { rotulo: rotuloDelta, texto: fmtPct(vr.nominal), larg: 4 },
        ...(semReal ? [] : [{ rotulo: 'Real', texto: fmtPct(vr.real), larg: 4, suave: true }]),
      ],
    }
  })
  return (
    <LinhasBarras linhas={linhas} escala={escala} dica={(k, x, y) => {
      const it = itens[k]
      const vr = variacoes(it.v[base], it.v[alvo], ipca)
      return (
        <CaixaDica x={x} y={y}>
          <div className="font-semibold text-ink">{it.rotulo}</div>
          <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
            {series.map((s, j) => (<div key={s.rotulo} className="contents"><dt className="text-ink-soft">{s.rotulo}</dt><dd className="text-right">{milhoes(it.v[j])}</dd></div>))}
            <dt className="text-ink-soft">{rotuloAlvo} sobre {rotuloBase}</dt>
            <dd className="text-right font-semibold">{fmtPct(vr.nominal)}</dd>
            {!semReal && <><dt className="text-ink-soft">Variação real</dt><dd className="text-right">{fmtPct(vr.real)}</dd></>}
          </dl>
          <div className="mt-1 text-label text-ink-soft">R$ milhões</div>
        </CaixaDica>
      )
    }} />
  )
}

/** Colunas lado a lado por ano (ou cenário): receita contra despesa, com o resultado embaixo de cada grupo. */
export function ColunasReceitaDespesa({ grupos }: { grupos: { rotulo: string; receita: number; despesa: number }[] }) {
  const max = Math.max(...grupos.flatMap((g) => [g.receita, g.despesa]))
  const bi = (x: number) => numero(x / 1e9, 1)
  return (
    <div role="img" aria-label={`Receita e despesa: ${grupos.map((g) => `${g.rotulo} receita ${bi(g.receita)} bilhões, despesa ${bi(g.despesa)} bilhões`).join('; ')}`}>
      <div className="flex items-end gap-1 sm:gap-4">
        {grupos.map((g) => (
          <div key={g.rotulo} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-52 w-full items-end justify-center gap-0.5 sm:gap-1">
              {[{ v: g.receita, cor: COR.ploa }, { v: g.despesa, cor: COR.empenhado }].map((b, j) => (
                <div key={j} className="flex h-full w-full max-w-[2.75rem] flex-col items-center justify-end">
                  <span className="mb-0.5 text-label tracking-tight tabular-nums text-ink sm:tracking-normal">{bi(b.v)}</span>
                  <span className="block w-full" style={{ height: `${(b.v / max) * 82}%`, background: b.cor, borderRadius: '4px 4px 0 0' }} />
                </div>
              ))}
            </div>
            <span className="mt-1.5 w-full border-t border-line pt-1 text-center text-label font-semibold normal-case leading-tight tracking-normal text-ink sm:text-small">{g.rotulo}</span>
            <span className={`text-label normal-case tracking-normal tabular-nums ${g.receita - g.despesa < -1e6 ? 'text-serie2' : 'text-ink-soft'}`}>
              {Math.abs(g.receita - g.despesa) < 1e6 ? 'equilíbrio' : `${sinal(g.receita - g.despesa)}${bi(Math.abs(g.receita - g.despesa))}`}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">R$ bilhões; sob cada ano, o resultado (receita menos despesa).</p>
    </div>
  )
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
