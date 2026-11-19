'use client'

import { useMemo, useState } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, COR, Legenda, TabelaDelta, TabelaItens } from './Graficos'
import { ColunasMeses, fmtPct, variacoes, type ItemSerie } from './GraficosMacro'
import { Faixa } from './Faixa'

type Mensal = Record<'icms' | 'fpe' | 'royalties', Record<string, number>>
type Props = { receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; mensal: Mensal; fonteIpca: string }

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x, 0)
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x), 0)}`

function tabelas(receita: LinhaMacro[], despesa: LinhaMacro[]) {
  const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
  const D = Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>
  return { R, D }
}

/* ---------- Receita ---------- */
const NOMES = { icms: 'ICMS', fpe: 'Cota-parte do FPE', royalties: 'Royalties de petróleo e gás' } as const

export function Receita({ receita, ipca, mensal }: Omit<Props, 'despesa' | 'fonteIpca'>) {
  const [qual, setQual] = useState<'icms' | 'fpe' | 'royalties'>('icms')
  const i27 = ipca['2027']
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])

  // último ano com algum dado e o anterior, por série
  const info = useMemo(() => {
    const s = mensal[qual]
    const anos = [...new Set(Object.keys(s).map((k) => Number(k.slice(0, 4))))].sort()
    const corr = anos[anos.length - 1]
    const ant = corr - 1
    const mes = (a: number) => Array.from({ length: 12 }, (_, i) => s[`${a}-${String(i + 1).padStart(2, '0')}`] ?? null)
    const c = mes(corr), a = mes(ant)
    const ate = c.reduce((u, x, i) => (x !== null ? i : u), -1)
    const somaAte = (v: (number | null)[]) => v.slice(0, ate + 1).reduce<number>((t, x) => t + (x ?? 0), 0)
    const totalAnt = a.reduce<number>((t, x) => t + (x ?? 0), 0)
    const ytdC = somaAte(c), ytdA = somaAte(a)
    const completo = ate === 11
    return { corr, ant, c, a, ate, ytdC, ytdA, totalAnt, projecao: completo ? ytdC : ytdA > 0 ? totalAnt * (ytdC / ytdA) : null, completo }
  }, [mensal, qual])

  const mesNome = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const icmsInfo = useMemo(() => {
    const s = mensal.icms
    const ano = (a: number) => Array.from({ length: 12 }, (_, i) => s[`${a}-${String(i + 1).padStart(2, '0')}`] ?? null)
    const c = ano(2026), a = ano(2025)
    const ate = c.reduce((u, x, i) => (x !== null ? i : u), -1)
    const ytdC = c.slice(0, ate + 1).reduce<number>((t, x) => t + (x ?? 0), 0)
    const ytdA = a.slice(0, ate + 1).reduce<number>((t, x) => t + (x ?? 0), 0)
    const total25 = a.reduce<number>((t, x) => t + (x ?? 0), 0)
    return { ate, ytdC, ytdA, projecao: total25 * (ytdC / ytdA) }
  }, [mensal])

  const cenarios = [
    { chave: 'loa', rotulo: 'Orçamento 2026 (LOA)', v: R.icms[3] },
    { chave: 'prov', rotulo: 'Arrecadação provável 2026 (PLOA)', v: R.icms[4] },
    { chave: 'proj', rotulo: 'Projeção simples 2026', v: icmsInfo.projecao },
    { chave: '27', rotulo: 'Estimativa 2027 (PLOA)', v: R.icms[5] },
  ]

  // quadro oficial da receita, completo
  const itensQuadro = receita.map((l) => ({ chave: l.chave, rotulo: l.rotulo, nivel: l.nivel, v: l.valores }))
  const varQ = (v: number[]) => variacoes(v[4], v[5], i27)

  return (
    <div>
      <Faixa
        itens={[
          { r: `ICMS jan a ${mesNome[icmsInfo.ate].slice(0, 3)} 2026`, v: fmtPct((icmsInfo.ytdC / icmsInfo.ytdA - 1) * 100), s: `sobre o mesmo período de 2025`, destaque: true },
          { r: 'Projeção simples 2026', v: bilhoes(icmsInfo.projecao), s: `provável (PLOA): ${bilhoes(R.icms[4])}` },
          { r: 'Estimativa 2027', v: bilhoes(R.icms[5]), s: `${fmtPct((R.icms[5] / icmsInfo.projecao - 1) * 100)} sobre a projeção; real ${fmtPct(variacoes(icmsInfo.projecao, R.icms[5], i27).real)}` },
        ]}
        nota="Projeção simples: ICMS de 2025 vezes a variação acumulada de 2026 no mesmo período."
      />
      <div className="mt-3 space-y-3">
        <Cartao titulo={`Arrecadação mensal: ${NOMES[qual]}`}
          direita={
            <div role="group" aria-label="Série" className="inline-flex overflow-hidden rounded-brand border border-line text-small">
              {(['icms', 'fpe', 'royalties'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={qual === k} onClick={() => setQual(k)} className={`px-3 py-1 ${qual === k ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{k === 'icms' ? 'ICMS' : k === 'fpe' ? 'FPE' : 'Royalties'}</button>
              ))}
            </div>
          }
          legenda={<Legenda itens={[{ cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: String(info.ant) }, { cor: COR.ploa, rotulo: `${info.corr}${info.completo ? '' : ` (até ${mesNome[info.ate]})`}` }]} />}
          grafico={<ColunasMeses anterior={info.a} corrente={info.c} rotuloAnterior={String(info.ant)} rotuloCorrente={String(info.corr)} />}
          tabela={<TabelaItens itens={mesNome.map((m, i) => ({ chave: m, mes: m, a: info.a[i], c: info.c[i] }))} legenda={`${NOMES[qual]} por mês, em R$ milhões`}
            colunas={[{ rotulo: 'Mês', valor: (x) => x.mes }, { rotulo: String(info.ant), valor: (x) => (x.a === null ? '–' : milhoes(x.a, 0)) }, { rotulo: String(info.corr), valor: (x) => (x.c === null ? '–' : milhoes(x.c, 0)) }, { rotulo: 'Δ%', valor: (x) => (x.a && x.c !== null ? fmtPct((x.c / x.a - 1) * 100) : '–') }]} />} />
        <Cartao titulo="ICMS: do realizado de 2026 à estimativa de 2027">
          <TabelaItens itens={cenarios} legenda="ICMS por cenário, em R$ milhões" colunas={[
            { rotulo: 'Cenário', valor: (x) => x.rotulo },
            { rotulo: 'R$ milhões', valor: (x) => milhoes(x.v, 0) },
            { rotulo: 'Δ% sobre o provável 2026', valor: (x) => (x.chave === 'prov' ? '–' : fmtPct((x.v / cenarios[1].v - 1) * 100)) },
          ]} />
        </Cartao>
        <Cartao titulo="Evolução da receita: quadro oficial da PLOA"
          grafico={<TabelaItens itens={itensQuadro} legenda="Evolução da receita, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.nivel === 0 ? 'font-semibold' : ''} style={{ paddingLeft: `${x.nivel * 0.75}rem` }}>{x.rotulo}</span> },
            ...(['2023', '2024', '2025', 'Orç. 2026', 'Prov. 2026', '2027'] as const).map((r, j) => ({ rotulo: r, valor: (x: (typeof itensQuadro)[number]) => milhoes(x.v[j], 0) })),
            { rotulo: 'Δ% 27/26', valor: (x) => fmtPct(varQ(x.v).nominal) },
            { rotulo: 'Real', valor: (x) => fmtPct(varQ(x.v).real) },
          ]} />} />
      </div>
      <p className="mt-3 text-small text-ink-soft">Fonte: arrecadação mensal do RREO e da ANP (ICMS e FPE até {mesNome[icmsInfo.ate]} de 2026; royalties até dezembro de 2025); quadro Evolução da Receita da PLOA 2027 (p. 97).</p>
    </div>
  )
}
