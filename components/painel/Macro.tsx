'use client'

import { NOTA_DISCRETA } from './Estrutura'
import { useMemo, useState } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, COR, Legenda, TabelaDelta, TabelaItens } from './Graficos'
import { ColunasMeses, fmtPct, variacoes, type ItemSerie } from './GraficosMacro'
import { COD_RECEITA } from './codigos'
import { FONTES, serieFonte, type DadosReceita, type IdFonte } from './projecao'
import { Faixa } from './Faixa'

type Props = { receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; fonteIpca: string }

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x, 0)
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x), 0)}`

function tabelas(receita: LinhaMacro[], despesa: LinhaMacro[]) {
  const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
  const D = Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>
  return { R, D }
}

/* ---------- Receita ---------- */
const NOMES = { icms: 'ICMS', fpe: 'Cota-parte do FPE', petroleo: 'Petróleo (cota-parte da compensação financeira)' } as const

export function Receita({ receita, ipca, dados }: Omit<Props, 'despesa' | 'fonteIpca'> & { dados: DadosReceita }) {
  const [qual, setQual] = useState<IdFonte>('icms')
  const i27 = ipca['2027']

  // arrecadação mensal da fonte escolhida (Portal, conferido com o RREO): ano anterior inteiro e ano corrente até o mês de corte
  const info = useMemo(() => {
    const s = serieFonte(dados, qual)
    const mes = (a: number) => Array.from({ length: 12 }, (_, i) => s[`${a}-${String(i + 1).padStart(2, '0')}`] ?? null)
    const c = mes(2026), a = mes(2025)
    const ate = c.reduce((u, x, i) => (x !== null ? i : u), -1)
    return { corr: 2026, ant: 2025, c, a, ate }
  }, [dados, qual])
  const mesNome = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

  // quadro oficial da receita, completo
  const itensQuadro = receita.map((l) => ({ chave: l.chave, rotulo: l.rotulo, nivel: l.nivel, v: l.valores }))
  const varQ = (v: number[]) => variacoes(v[4], v[5], i27)

  return (
    <div>
      <div className="mt-3 space-y-3">
        <Cartao titulo={`Arrecadação mensal: ${NOMES[qual]}`}
          direita={
            <div role="group" aria-label="Fonte" className="inline-flex overflow-hidden rounded-brand border border-line text-small">
              {FONTES.map((f) => (
                <button key={f.id} type="button" aria-pressed={qual === f.id} onClick={() => setQual(f.id)} className={`px-3 py-1 ${qual === f.id ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{f.id === 'icms' ? 'ICMS' : f.id === 'fpe' ? 'FPE' : 'Petróleo'}</button>
              ))}
            </div>
          }
          legenda={<Legenda itens={[{ cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: String(info.ant) }, { cor: COR.ploa, rotulo: `${info.corr} (até ${mesNome[info.ate]})` }]} />}
          grafico={<ColunasMeses anterior={info.a} corrente={info.c} rotuloAnterior={String(info.ant)} rotuloCorrente={String(info.corr)} />}
          tabela={<TabelaItens itens={mesNome.map((m, i) => ({ chave: m, mes: m, a: info.a[i], c: info.c[i] }))} legenda={`${NOMES[qual]} por mês, em R$ milhões`}
            colunas={[{ rotulo: 'Mês', valor: (x) => x.mes }, { rotulo: String(info.ant), valor: (x) => (x.a === null ? '–' : milhoes(x.a, 0)) }, { rotulo: String(info.corr), valor: (x) => (x.c === null ? '–' : milhoes(x.c, 0)) }, { rotulo: 'Δ%', valor: (x) => (x.a && x.c !== null ? fmtPct((x.c / x.a - 1) * 100) : '–') }]} />} />
        <Cartao titulo="Evolução da Receita (quadro da PLOA 2027, p. 97)"
          grafico={<TabelaItens itens={itensQuadro} legenda="Evolução da receita, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões · natureza', valor: (x) => (x.nivel === 0
              ? <span className="font-semibold">{COD_RECEITA[x.chave] && <span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[2.5rem] md:text-small">{COD_RECEITA[x.chave]}</span>}{x.rotulo}</span>
              : <span title={COD_RECEITA[x.chave] ? `Código ${COD_RECEITA[x.chave]}` : undefined} className="block border-l-2 border-line pl-2.5 text-ink-soft" style={{ marginLeft: `${0.25 + (x.nivel - 1) * 0.9}rem` }}>{COD_RECEITA[x.chave] && <span className="sr-only">{COD_RECEITA[x.chave]} </span>}{x.rotulo}</span>) },
            ...(['2023', '2024', '2025', 'Orç. 2026', 'Prov. 2026', '2027'] as const).map((r, j) => ({ rotulo: r, valor: (x: (typeof itensQuadro)[number]) => milhoes(x.v[j], 0) })),
            { rotulo: 'Δ% 27/26', valor: (x) => fmtPct(varQ(x.v).nominal) },
            { rotulo: 'Real', valor: (x) => fmtPct(varQ(x.v).real) },
          ]} />} />
      </div>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fonte: arrecadação mensal do Portal de Dados Abertos do ES (até {mesNome[info.ate]} de 2026), que coincide com o RREO; quadro Evolução da Receita da PLOA 2027 (p. 97).</p>
    </div>
  )
}
