'use client'

import { useMemo, type ReactNode } from 'react'
import { numero } from '@/lib/formato'
import { fmtPct } from './GraficosMacro'
import { projecaoItens, projetaDespesa2026 } from './projecao'
import { useCalculo, type PropsFiscais } from './IndicadoresFiscais'
import type { Destino } from './Conclusoes'

const bi = (x: number) => numero(x / 1e9, 1)
const corDif = (d: number) => (Math.abs(d) < 3 ? 'text-ink-soft' : d > 0 ? 'text-serie3' : 'text-serie2')

function Indicador({ rotulo, valor, detalhe, destino, onIr }: { rotulo: string; valor: string; detalhe: ReactNode; destino: Destino; onIr: (d: Destino) => void }) {
  return (
    <button type="button" onClick={() => onIr(destino)} aria-label={`${rotulo}: ${valor}. Abrir ${destino.rotulo}`}
      className="min-w-0 bg-paper px-3 py-2.5 text-left hover:bg-surface focus-visible:relative focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy print:py-1">
      <span className="block text-label font-semibold uppercase tracking-wide text-ink-soft">{rotulo}</span>
      <span className="block text-title font-semibold leading-tight tabular-nums text-navy">{valor}</span>
      <span className="block text-small leading-snug">{detalhe}</span>
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
        return {
      rec: [R.total[0], R.total[1], R.total[2], rec26, R.total[5]], vRec: (R.total[5] / rec26 - 1) * 100,
      desp: [D.total[0], D.total[1], D.total[2], desp26, desp27], vDesp: (desp27 / desp26 - 1) * 100,
      icms27: R.icms[5], vIcms: (R.icms[5] / it.icms.central - 1) * 100,
    }
  }, [receita, despesa, dados])
  const poup = cal.capag.poup.ploa

  return (
    <section aria-label="Abertura" className="mb-6 print:mb-2">
      <p role="heading" aria-level={2} className="text-title font-semibold leading-tight text-navy md:text-[1.5rem]">Proposta orçamentária 2027</p>
      <p className="mt-0.5 text-small text-ink-soft">Comparada à projeção da execução de 2026, com dados até outubro.</p>
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-line bg-line lg:grid-cols-4 print:mt-1 print:grid-cols-4">
        <Indicador rotulo="Receita" valor={`R$ ${bi(d.rec[4])} bi`} destino={{ aba: 'receita', rotulo: 'Receita' }} onIr={onIr}
          detalhe={<span className={corDif(d.vRec)}>{fmtPct(d.vRec)} <span className="text-ink-soft">sobre 2026</span></span>} />
        <Indicador rotulo="Despesa" valor={`R$ ${bi(d.desp[4])} bi`} destino={{ aba: 'despesa', sub: 'resumo', rotulo: 'Despesa' }} onIr={onIr}
          detalhe={<span className={corDif(d.vDesp)}>{fmtPct(d.vDesp)} <span className="text-ink-soft">sobre 2026</span></span>} />
        <Indicador rotulo="ICMS" valor={`R$ ${bi(d.icms27)} bi`} destino={{ aba: 'receita', rotulo: 'Receita' }} onIr={onIr}
          detalhe={<span className={corDif(d.vIcms)}>{fmtPct(d.vIcms)} <span className="text-ink-soft">sobre 2026</span></span>} />
        <Indicador rotulo="CAPAG" valor={cal.capag.nota} destino={{ aba: 'resultado', sub: 'capag', rotulo: 'CAPAG' }} onIr={onIr}
          detalhe={<span className="text-ink-soft">poupança ≈ {numero(poup, 0)}%</span>} />
      </div>
    </section>
  )
}
