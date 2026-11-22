'use client'

import { useMemo } from 'react'
import { numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR } from './Graficos'
import { NOTA_DISCRETA } from './Estrutura'
import { projecaoItens, projetaDespesa2026, type DadosReceita } from './projecao'
import type { IndicadoresFiscais as Fiscais } from './Agregado'

type Ind = {
  chave: string; rotulo: string; base: string
  /** limite da LRF ou corte da nota A da CAPAG, em % */
  limite: number
  ultimo: number; ultimoRot: string
  proj26?: number | null
  ploa: number | null
  /** margem de erro da estimativa da PLOA, em pontos percentuais */
  banda?: number
}

const pc = (x: number) => `${numero(x, 1)}%`
const CORTE_ALERTA = 90

/**
 * Indicadores da LRF e da CAPAG sobre os números da PLOA 2027, como parcela do limite: quanto mais perto de 100%, menor a folga.
 * Último valor oficial: RGF do Poder Executivo (2º quadrimestre de 2026) e CAPAG 2025. PLOA: indicadores calculados sobre a RCL do Quadro VI
 * da Mensagem e sobre a despesa e a receita da proposta (aproximações).
 */
export function IndicadoresFiscais({ receita, despesa, dados, fiscais, rclPloa, pessoalExecPloa }: {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; dados: DadosReceita; fiscais: Fiscais; rclPloa: number; pessoalExecPloa: number
}) {
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const itensProj = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])

  const inds = useMemo((): Ind[] => {
    const lrfUlt = fiscais.lrf[fiscais.lrf.length - 1]
    const lrf3q25 = fiscais.lrf.find((x) => x.ano === 2025 && x.quad === 3) ?? lrfUlt
    const capag25 = fiscais.capag.find((x) => x.ano === 2025)
    /* pessoal líquido do RGF sobre o bruto empenhado de 2025, aplicado ao pessoal do Executivo na PLOA */
    const razaoLiqBruto = lrf3q25.pessoal.montante / fiscais.pessoalExecutivoEmpenhado2025
    const pessoalPloa = ((razaoLiqBruto * pessoalExecPloa) / rclPloa) * 100
    /* dívida consolidada: a do último RGF mais a captação e menos a amortização da PLOA */
    const dc26 = lrfUlt.divida.rcl_ajustada ? (lrfUlt.divida.dc / 100) * lrfUlt.divida.rcl_ajustada : NaN
    const dcPloa = ((dc26 + R.operacoes_credito[5] - D.amortizacao[5]) / rclPloa) * 100
    const creditoPloa = (R.operacoes_credito[5] / rclPloa) * 100
    /* poupança corrente: despesas correntes ÷ receitas correntes líquidas de municípios e Fundeb, calibrada nas edições de 2023 a 2025 da CAPAG */
    const prox = (dc: number, rc: number, ded: number) => (dc / (rc + ded)) * 100
    const proxAno = [0, 1, 2].map((j) => prox(D.despesas_correntes[j], R.receitas_correntes[j], R.deducoes[j]))
    const capagPoup = [2023, 2024, 2025].map((a) => fiscais.capag.find((x) => x.ano === a)?.poupanca ?? NaN)
    const fatores = capagPoup.map((v, j) => v / proxAno[j])
    const fm = fatores.reduce((t, x) => t + x, 0) / fatores.length
    const proxPloa = prox(D.despesas_correntes[5], R.receitas_correntes[5], R.deducoes[5])
    const banda = Math.max(...fatores.map((x) => Math.abs(x - fm))) * proxPloa
    const rc26 = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais'].reduce((t, c) => t + itensProj[c].central, 0)
    const poup26 = prox(projD.itens.corr.central, rc26, itensProj.ded.central) * fm
    return [
      { chave: 'pessoal', rotulo: 'Pessoal líquido do Executivo ÷ RCL', base: 'LRF: limite de 49%, prudencial de 46,55%', limite: 49, ultimo: lrfUlt.pessoal.valor, ultimoRot: 'RGF 2º quad. 2026', ploa: pessoalPloa },
      { chave: 'credito', rotulo: 'Operações de crédito ÷ RCL', base: 'LRF: limite de 16%', limite: 16, ultimo: lrfUlt.credito.valor, ultimoRot: 'RGF 2º quad. 2026', ploa: creditoPloa },
      { chave: 'garantias', rotulo: 'Garantias ÷ RCL', base: 'LRF: limite de 22%', limite: 22, ultimo: lrfUlt.garantias.valor, ultimoRot: 'RGF 2º quad. 2026', ploa: null },
      { chave: 'dcl', rotulo: 'Dívida consolidada líquida ÷ RCL', base: 'LRF: limite de 200%', limite: 200, ultimo: lrfUlt.divida.valor, ultimoRot: 'RGF 2º quad. 2026', ploa: null },
      { chave: 'endiv', rotulo: 'Endividamento (dívida consolidada ÷ RCL)', base: 'CAPAG: nota A abaixo de 60%', limite: 60, ultimo: capag25?.endividamento ?? NaN, ultimoRot: 'CAPAG 2025', ploa: dcPloa },
      { chave: 'poup', rotulo: 'Poupança corrente (despesas ÷ receitas correntes ajustadas)', base: 'CAPAG: nota A abaixo de 85%', limite: 85, ultimo: capag25?.poupanca ?? NaN, ultimoRot: 'CAPAG 2025', proj26: poup26, ploa: proxPloa * fm, banda },
    ]
  }, [fiscais, R, D, itensProj, projD, rclPloa, pessoalExecPloa])

  const uso = (v: number, limite: number) => Math.min(Math.max((v / limite) * 100, 0), 100)
  const linhas = [...inds].sort((a, b) => uso(b.ploa ?? b.ultimo, b.limite) - uso(a.ploa ?? a.ultimo, a.limite))
  const liquidez = fiscais.capag.find((x) => x.ano === 2025)?.liquidez

  return (
    <div className="space-y-3">
      <Cartao titulo="Indicadores fiscais: PLOA 2027 e limites da LRF e da CAPAG"
        legenda={<Legenda itens={[
          { cor: COR.empenhado, rotulo: 'Último oficial' },
          { cor: COR.ploa, rotulo: 'PLOA 2027 (aproximação)' },
        ]} />}>
        <div className="hidden items-end gap-x-4 pb-1 text-label font-semibold normal-case tracking-normal text-ink-soft md:grid md:grid-cols-[15rem_1fr_12rem]">
          <span />
          <span className="relative block h-4"><span className="absolute left-0">0</span><span className="absolute right-0">limite (100%)</span></span>
          <span />
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {linhas.map((l) => {
            const u = uso(l.ultimo, l.limite)
            const p = l.ploa === null ? null : uso(l.ploa, l.limite)
            const ref = l.ploa ?? l.ultimo
            const folga = l.limite - ref
            return (
              <li key={l.chave} className="grid items-center gap-x-4 gap-y-1 py-2 md:grid-cols-[15rem_1fr_12rem]">
                <div>
                  <span className="block text-small font-medium text-ink">{l.rotulo}</span>
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{l.base}</span>
                </div>
                <div className="relative h-10 rounded-sm bg-surface" role="img" aria-label={`${l.rotulo}: último ${pc(l.ultimo)}${l.ploa === null ? '' : `, PLOA ${pc(l.ploa)}`}, limite ${l.limite}%`}>
                  <span aria-hidden="true" className="absolute inset-y-0 right-0" style={{ left: `${CORTE_ALERTA}%`, background: 'rgb(var(--serie2) / 0.14)' }} />
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 border-r-2 border-dashed" style={{ borderColor: 'rgb(var(--serie2))' }} />
                  <span aria-hidden="true" className="absolute left-0 top-1 h-3.5" style={{ width: `${u}%`, background: COR.empenhado }} />
                  {p !== null && <span aria-hidden="true" className="absolute bottom-1 left-0 h-3.5" style={{ width: `${p}%`, background: COR.ploa }} />}
                  {p !== null && l.banda ? (
                    <span aria-hidden="true" className="absolute bottom-[0.45rem] h-[1.1rem] border-x-2" style={{ left: `${uso(Math.max((l.ploa ?? 0) - l.banda, 0), l.limite)}%`, width: `${uso((l.ploa ?? 0) + l.banda, l.limite) - uso(Math.max((l.ploa ?? 0) - l.banda, 0), l.limite)}%`, borderColor: 'rgb(var(--ink))' }}>
                      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgb(var(--ink))' }} />
                    </span>
                  ) : null}
                </div>
                <div className="text-small tabular-nums text-ink">
                  <span className="block"><span className="text-ink-soft">Último </span>{pc(l.ultimo)}</span>
                  {l.proj26 != null && <span className="block"><span className="text-ink-soft">Proj. 26 </span>≈ {pc(l.proj26)}</span>}
                  {l.ploa !== null && <span className="block font-semibold"><span className="font-normal text-ink-soft">PLOA </span>≈ {pc(l.ploa)}{l.banda ? ` ± ${numero(l.banda, 1)}` : ''}</span>}
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{ref < 0 ? 'dívida líquida negativa' : `folga de ${numero(folga, 1)} p.p.`}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          Cada barra é o indicador como parcela do limite (da LRF) ou do corte da nota A (da CAPAG); a faixa rosa marca os 10% finais. Último oficial: RGF do Executivo (2º quadrimestre de 2026) e CAPAG 2025{liquidez != null ? `; liquidez relativa da CAPAG 2025: ${pc(liquidez)} (nota A a partir de 5%), que não se projeta pelo orçamento` : ''}. PLOA: RCL do Quadro VI da Mensagem (R$ {numero(rclPloa / 1e9, 1)} bi) e a despesa e a receita da proposta; pessoal líquido pela razão entre o líquido do RGF e o bruto empenhado em 2025; dívida do último RGF mais a captação e menos a amortização da PLOA; poupança corrente por aproximação (despesas correntes ÷ receitas correntes líquidas de municípios e Fundeb, calibrada nas edições de 2023 a 2025 da CAPAG), com a margem de erro mostrada na barra.
        </p>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026, Quadro VI e quadros de receita e despesa); RGF do Poder Executivo e CAPAG (Tesouro Nacional); Portal de Dados Abertos do ES.</p>
    </div>
  )
}
