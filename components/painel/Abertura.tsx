'use client'

import { useMemo, type ReactNode } from 'react'
import { numero } from '@/lib/formato'
import { COR } from './Graficos'
import { fmtPct } from './GraficosMacro'
import { projecaoItens, projetaDespesa2026, porMes, mesesCorte } from './projecao'
import { useCalculo, type PropsFiscais } from './IndicadoresFiscais'
import type { Destino } from './Conclusoes'

const bi = (x: number) => numero(x / 1e9, 1)
const corDif = (d: number) => (Math.abs(d) < 3 ? 'text-ink-soft' : d > 0 ? 'text-serie3' : 'text-serie2')

/** Colunas pequenas, 2023 a 2027: realizado (cinza), projeção de 2026 (claro, tracejado) e PLOA 2027 (marinho). */
function MiniColunas({ v, rotulo }: { v: number[]; rotulo: string }) {
  const max = Math.max(...v)
  const anos = ['23', '24', '25', '26', '27']
  return (
    <div role="img" aria-label={rotulo} className="mt-2">
      <div className="flex h-12 items-end gap-1 print:h-8">
        {v.map((x, i) => (
          <span key={anos[i]} className="block flex-1 rounded-t-[2px]" style={{
            height: `${(x / max) * 100}%`,
            background: i === 4 ? COR.ploa : i === 3 ? COR.atualizada : COR.empenhado,
            outline: i === 3 ? `1px dashed ${COR.contornoAtualizada}` : undefined, outlineOffset: -1,
          }} />
        ))}
      </div>
      <div className="mt-0.5 flex gap-1 text-[0.625rem] leading-none text-ink-soft">{anos.map((a, i) => <span key={a} className="flex-1 text-center">{a}{i === 3 ? 'p' : ''}</span>)}</div>
    </div>
  )
}

/** Crescimento mensal do ICMS sobre o mesmo mês do ano anterior: mostra de relance a perda de ritmo. */
function MiniMeses({ v, rotulo }: { v: number[]; rotulo: string }) {
  const teto = 20
  const base = 24 // % da altura reservada abaixo do zero, para os meses negativos
  return (
    <div role="img" aria-label={rotulo} className="mt-2">
      <div className="relative flex h-12 gap-[3px] print:h-8">
        <span aria-hidden="true" className="absolute inset-x-0 border-t border-ink-soft/40" style={{ bottom: `${base}%` }} />
        {v.map((x, i) => (
          <span key={i} className="relative block flex-1">
            <span className="absolute inset-x-0 block rounded-[2px]" style={x >= 0
              ? { bottom: `${base}%`, height: `${(Math.min(x, teto) / teto) * (100 - base)}%`, background: COR.empenhado }
              : { bottom: `${base - (Math.min(-x, teto) / teto) * (100 - base)}%`, height: `${(Math.min(-x, teto) / teto) * (100 - base)}%`, background: 'rgb(var(--serie2))' }} />
          </span>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[0.625rem] leading-none text-ink-soft"><span>jan</span><span>out</span></div>
    </div>
  )
}

/** Faixas de nota da poupança corrente (A abaixo de 85%, B até 95%, C acima) com a posição estimada para a edição de 2028. */
function MiniFaixas({ valor, rotulo }: { valor: number; rotulo: string }) {
  const [lo, hi] = [60, 105]
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <div role="img" aria-label={rotulo} className="mt-2">
      <div className="relative h-12 print:h-8">
        <div className="absolute inset-x-0 top-3 flex h-5 overflow-hidden rounded-sm text-[0.625rem] font-semibold leading-5 text-ink-soft">
          {[['A', 85 - lo, 'rgb(var(--serie3) / 0.16)'], ['B', 10, 'rgb(var(--navy) / 0.07)'], ['C', hi - 95, 'rgb(var(--serie2) / 0.16)']].map(([n, w, c]) => (
            <span key={n as string} className="text-center" style={{ width: `${((w as number) / (hi - lo)) * 100}%`, background: c as string }}>{n}</span>
          ))}
        </div>
        <span aria-hidden="true" className="absolute top-[0.55rem] h-[1.55rem] w-0.5 -translate-x-1/2 bg-navy" style={{ left: x(valor) }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[0.625rem] leading-none text-ink-soft"><span>60%</span><span>85%</span><span>105%</span></div>
    </div>
  )
}

function Cartao({ rotulo, valor, detalhe, destino, onIr, children }: { rotulo: string; valor: ReactNode; detalhe: ReactNode; destino: Destino; onIr: (d: Destino) => void; children: ReactNode }) {
  return (
    <button type="button" onClick={() => onIr(destino)} className="group flex min-w-0 flex-col rounded-brand border border-line bg-paper p-3 text-left hover:border-navy/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy print:p-1.5">
      <span className="text-label font-semibold uppercase tracking-wide text-ink-soft">{rotulo}</span>
      <span className="mt-0.5 text-title font-semibold leading-tight tabular-nums text-navy">{valor}</span>
      <span className="mt-0.5 text-small leading-snug">{detalhe}</span>
      {children}
      <span aria-hidden="true" className="mt-auto pt-2 text-small font-semibold text-navy underline decoration-navy/30 underline-offset-2 group-hover:decoration-navy print:hidden">Abrir →</span>
    </button>
  )
}

/**
 * Faixa de abertura do painel: a identidade, a data dos dados e quatro indicadores com uma figura pequena cada, que também são a navegação.
 * Tudo é calculado dos mesmos dados das demais seções, de modo que se atualiza sozinho (o texto das considerações, não).
 */
export function Abertura({ onIr, ...p }: PropsFiscais & { onIr: (d: Destino) => void }) {
  const { receita, despesa, dados } = p
  const cal = useCalculo(p)
  const d = useMemo(() => {
    const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
    const D = Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>
    const it = projecaoItens(dados)
    const rec26 = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais', 'intra', 'ded', 'cap'].reduce((t, c) => t + it[c].central, 0)
    const pj = projetaDespesa2026()
    const desp26 = pj.itens.corr.central + pj.itens.capd.central
    const desp27 = D.total[5] - D.reserva_rpps[5] - D.reserva_contingencia[5]
    const { ultimo } = mesesCorte(dados)
    const icms = (a: string) => porMes(dados.anos[a].linhas, 3, ['1114'])
    const i25 = icms('2025'), i26 = icms('2026')
    const meses = Array.from({ length: ultimo }, (_, i) => (i25[i] > 0 ? (i26[i] / i25[i] - 1) * 100 : 0))
    return {
      rec: [R.total[0], R.total[1], R.total[2], rec26, R.total[5]], vRec: (R.total[5] / rec26 - 1) * 100,
      desp: [D.total[0], D.total[1], D.total[2], desp26, desp27], vDesp: (desp27 / desp26 - 1) * 100,
      icms27: R.icms[5], vIcms: (R.icms[5] / it.icms.central - 1) * 100, meses,
    }
  }, [receita, despesa, dados])
  const poup = cal.capag.poup.ploa

  return (
    <section aria-label="Abertura" className="mb-5 print:mb-1">
      <div className="rounded-brand bg-navy px-4 py-4 text-on-navy print:py-1 md:px-6">
        <p className="text-label font-semibold uppercase tracking-wide text-on-navy/75">Transição de Governo · Espírito Santo</p>
        <p role="heading" aria-level={2} className="mt-1 text-title font-semibold leading-tight text-on-navy md:text-[1.75rem]">Proposta orçamentária 2027</p>
        <p className="mt-1 text-body leading-snug text-on-navy/90 print:text-small">Comparada à projeção da execução de 2026, com a receita e a despesa realizadas até outubro.</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 print:mt-1 print:grid-cols-4 print:gap-2 lg:grid-cols-4">
        <Cartao rotulo="Receita 2027" valor={`R$ ${bi(d.rec[4])} bi`} destino={{ aba: 'receita', rotulo: 'Receita' }} onIr={onIr}
          detalhe={<><span className={`font-semibold ${corDif(d.vRec)}`}>{fmtPct(d.vRec)}</span> <span className="text-ink-soft">sobre a projeção de 2026</span></>}>
          <MiniColunas v={d.rec} rotulo={`Receita total, em R$ bilhões: ${d.rec.map((x) => bi(x)).join(', ')}, de 2023 a 2027; 2026 é projeção`} />
        </Cartao>
        <Cartao rotulo="Despesa 2027" valor={`R$ ${bi(d.desp[4])} bi`} destino={{ aba: 'despesa', sub: 'resumo', rotulo: 'Despesa' }} onIr={onIr}
          detalhe={<><span className={`font-semibold ${corDif(d.vDesp)}`}>{fmtPct(d.vDesp)}</span> <span className="text-ink-soft">sobre a projeção de 2026</span></>}>
          <MiniColunas v={d.desp} rotulo={`Despesa executável, em R$ bilhões: ${d.desp.map((x) => bi(x)).join(', ')}, de 2023 a 2027; 2026 é projeção`} />
        </Cartao>
        <Cartao rotulo="ICMS 2027" valor={`R$ ${bi(d.icms27)} bi`} destino={{ aba: 'receita', rotulo: 'Receita' }} onIr={onIr}
          detalhe={<><span className={`font-semibold ${corDif(d.vIcms)}`}>{fmtPct(d.vIcms)}</span> <span className="text-ink-soft">sobre a projeção; ritmo em queda</span></>}>
          <MiniMeses v={d.meses} rotulo={`Crescimento mensal do ICMS de 2026 sobre 2025, em %: ${d.meses.map((x) => numero(x, 1)).join(', ')}`} />
        </Cartao>
        <Cartao rotulo="CAPAG" valor={cal.capag.nota} destino={{ aba: 'resultado', sub: 'capag', rotulo: 'CAPAG' }} onIr={onIr}
          detalhe={<><span className="font-semibold text-ink">Poupança ≈ {numero(poup, 0)}%</span> <span className="text-ink-soft">(nota A abaixo de 85%)</span></>}>
          <MiniFaixas valor={poup} rotulo={`Poupança corrente estimada em ${numero(poup, 1)}% na edição de 2028; nota A abaixo de 85%`} />
        </Cartao>
      </div>
      <p className="mt-1.5 text-[0.6875rem] leading-snug text-ink-soft/75 print:hidden">Colunas: 2023 a 2025 realizado, 2026p projeção da equipe e 2027 PLOA. ICMS: crescimento de cada mês de 2026 sobre o mesmo mês de 2025.</p>
    </section>
  )
}
