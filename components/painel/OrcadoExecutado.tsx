'use client'

import { useMemo } from 'react'
import { milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, TabelaItens, COR } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { projecaoItens, projetaDespesa2026, type DadosReceita } from './projecao'

/** Dotação inicial (LOA) por ano, em R$: receita e despesa fixadas coincidem, porque a lei orçamentária é aprovada equilibrada. */
export type LoaAnual = Record<string, { inicial: number; empenhado: number }>

const pc = (x: number, casas = 0) => `${numero(x, casas)}%`
const mi = (x: number) => milhoes(x, 0)

type Ano = { chave: string; rotulo: string; sub?: string; loa: number; receita: number; despesa: number; projetado?: boolean }

/**
 * O que foi executado em relação ao orçamento inicial, ano a ano, e o que essa relação indicaria para a PLOA 2027 se repetida.
 * Receita: arrecadação líquida das deduções (com intraorçamentárias); despesa: empenhada. Os valores de 2023 a 2025 são os mesmos do
 * resultado orçamentário; 2026 é a projeção da equipe. É um indicador do padrão de execução, e não uma projeção de 2027.
 */
export function OrcadoExecutado({ receita, despesa, dados, loa }: { receita: LinhaMacro[]; despesa: LinhaMacro[]; dados: DadosReceita; loa: LoaAnual }) {
  const { anos, ploa, faixa } = useMemo(() => {
    const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
    const D = Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>
    const it = projecaoItens(dados)
    const proj = projetaDespesa2026()
    const rec26 = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais', 'intra', 'ded', 'cap'].reduce((t, c) => t + it[c].central, 0)
    const desp26 = proj.itens.corr.central + proj.itens.capd.central
    const base: Ano[] = [
      { chave: '2023', rotulo: '2023', loa: loa['2023'].inicial, receita: R.total[0], despesa: D.total[0] },
      { chave: '2024', rotulo: '2024', loa: loa['2024'].inicial, receita: R.total[1], despesa: D.total[1] },
      { chave: '2025', rotulo: '2025', loa: loa['2025'].inicial, receita: R.total[2], despesa: D.total[2] },
      { chave: '2026', rotulo: '2026', sub: 'projeção', loa: loa['2026'].inicial, receita: rec26, despesa: desp26, projetado: true },
    ]
    const rr = base.map((a) => (a.receita / a.loa) * 100)
    const dd = base.map((a) => (a.despesa / a.loa) * 100)
    const sr = base.map((a) => ((a.receita - a.despesa) / a.loa) * 100)
    return {
      anos: base,
      ploa: R.total[5],
      faixa: { rec: [Math.min(...rr), Math.max(...rr)], desp: [Math.min(...dd), Math.max(...dd)], res: [Math.min(...sr), Math.max(...sr)] },
    }
  }, [receita, despesa, dados, loa])

  const [LO, HI] = [95, 120]
  const x = (v: number) => `${((Math.min(Math.max(v, LO), HI) - LO) / (HI - LO)) * 100}%`
  const REC = COR.referencia
  const DES = COR.ploa

  const linhasGrafico = [
    ...anos.map((a) => ({ chave: a.chave, rotulo: a.rotulo, sub: a.sub, rec: (a.receita / a.loa) * 100, des: (a.despesa / a.loa) * 100, projetado: !!a.projetado })),
  ]

  const tabela = [
    ...anos.map((a) => ({
      chave: a.chave, rotulo: a.rotulo + (a.sub ? ` (${a.sub})` : ''), loa: mi(a.loa), receita: mi(a.receita), despesa: mi(a.despesa),
      resultado: mi(a.receita - a.despesa), pct: pc(((a.receita - a.despesa) / a.loa) * 100, 1),
      pr: pc((a.receita / a.loa) * 100), pd: pc((a.despesa / a.loa) * 100),
    })),
    {
      chave: '2027', rotulo: 'PLOA 27 (padrão)', loa: mi(ploa),
      receita: `${mi((ploa * faixa.rec[0]) / 100)} a ${mi((ploa * faixa.rec[1]) / 100)}`, despesa: `${mi((ploa * faixa.desp[0]) / 100)} a ${mi((ploa * faixa.desp[1]) / 100)}`,
      resultado: `${mi((ploa * faixa.res[0]) / 100)} a ${mi((ploa * faixa.res[1]) / 100)}`, pct: `${numero(faixa.res[0], 1)}% a ${numero(faixa.res[1], 1)}%`,
      pr: `${pc(faixa.rec[0])} a ${pc(faixa.rec[1])}`, pd: `${pc(faixa.desp[0])} a ${pc(faixa.desp[1])}`,
    },
  ]
  type L = (typeof tabela)[number]

  const anosAntes = ['2019', '2020', '2021', '2022'].filter((a) => loa[a]).map((a) => `${a}: ${pc((loa[a].empenhado / loa[a].inicial) * 100)}`)

  return (
    <div className="space-y-3">
      <Cartao titulo="Executado em relação ao orçamento inicial"
        legenda={<Legenda itens={[{ cor: REC, rotulo: 'Receita realizada' }, { cor: DES, rotulo: 'Despesa empenhada' }]} />}>
        <div className="hidden items-end gap-x-4 pb-1 text-label font-semibold normal-case tracking-normal text-ink-soft md:grid md:grid-cols-[7rem_1fr_12rem]">
          <span />
          <span className="relative block h-4">
            {[100, 110, 120].map((t) => <span key={t} className="absolute -translate-x-1/2" style={{ left: x(t) }}>{t === 100 ? 'orçamento inicial (100%)' : `${t}%`}</span>)}
          </span>
          <span />
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {linhasGrafico.map((l) => (
            <li key={l.chave} className="grid items-center gap-x-4 gap-y-1 py-2 print:py-1 md:grid-cols-[7rem_1fr_12rem]">
              <span className="text-small font-medium text-ink">{l.rotulo}{l.sub && <span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{l.sub}</span>}</span>
              <div className="relative h-9 rounded-sm bg-surface" role="img" aria-label={`${l.rotulo}: receita ${pc(l.rec)} e despesa ${pc(l.des)} do orçamento inicial`}>
                <span aria-hidden="true" className="absolute inset-y-0 border-l-2 border-dashed border-ink-soft/70" style={{ left: x(100) }} />
                {[{ v: l.rec, cor: REC, top: '0.5rem' }, { v: l.des, cor: DES, top: '1.5rem' }].map((p) => (
                  <span key={p.cor} aria-hidden="true" className="absolute h-3 w-3 -translate-x-1/2 rounded-full" style={{ left: x(p.v), top: p.top, background: l.projetado ? 'rgb(var(--paper))' : p.cor, border: `2px solid ${p.cor}` }} />
                ))}
              </div>
              <div className="text-small tabular-nums text-ink">
                <span className="block"><span className="text-ink-soft">Receita </span>{pc(l.rec)}</span>
                <span className="block"><span className="text-ink-soft">Despesa </span>{pc(l.des)}</span>
              </div>
            </li>
          ))}
          <li className="grid items-center gap-x-4 gap-y-1 py-2 print:py-1 md:grid-cols-[7rem_1fr_12rem]">
            <span className="text-small font-medium text-ink">2027<span className="block text-label font-normal normal-case tracking-normal text-ink-soft">PLOA: faixa pelo padrão de 2023 a 2026</span></span>
            <div className="relative h-9 rounded-sm bg-surface" role="img" aria-label={`PLOA 2027: pelo padrão de 2023 a 2026, receita de ${pc(faixa.rec[0])} a ${pc(faixa.rec[1])} e despesa de ${pc(faixa.desp[0])} a ${pc(faixa.desp[1])} do orçamento`}>
              <span aria-hidden="true" className="absolute inset-y-0 border-l-2 border-dashed border-ink-soft/70" style={{ left: x(100) }} />
              {[{ f: faixa.rec, cor: REC, top: '0.6rem' }, { f: faixa.desp, cor: DES, top: '1.6rem' }].map((p) => (
                <span key={p.cor} aria-hidden="true" className="absolute h-2 rounded-sm opacity-60" style={{ left: x(p.f[0]), width: `calc(${x(p.f[1])} - ${x(p.f[0])})`, top: p.top, background: p.cor }} />
              ))}
            </div>
            <div className="text-small tabular-nums text-ink">
              <span className="block"><span className="text-ink-soft">Receita </span>{pc(faixa.rec[0])} a {pc(faixa.rec[1])}</span>
              <span className="block"><span className="text-ink-soft">Despesa </span>{pc(faixa.desp[0])} a {pc(faixa.desp[1])}</span>
            </div>
          </li>
        </ul>
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          Realizado sobre a dotação inicial da LOA (receita e despesa fixadas coincidem). Círculos vazios: projeção de 2026. Faixa de 2027: menor e maior relação de 2023 a 2026 aplicadas ao orçamento da PLOA; mostra o padrão de execução, e não uma projeção.
          {anosAntes.length > 0 && ` Despesa empenhada sobre a dotação inicial antes disso: ${anosAntes.join('; ')}.`}
        </p>
      </Cartao>

      <Cartao titulo="Orçamento inicial, receita e despesa">
        <TabelaItens compacta altura="livre" itens={tabela} legenda="Orçamento inicial, receita realizada, despesa empenhada e resultado, por ano, em R$ milhões" colunas={[
          { rotulo: 'R$ milhões', valor: (l: L) => <span className={l.chave === '2027' ? 'font-semibold' : ''}>{l.rotulo}</span> },
          { rotulo: 'LOA', valor: (l: L) => l.loa },
          { rotulo: 'Receita', valor: (l: L) => l.receita },
          { rotulo: 'Despesa', valor: (l: L) => l.despesa },
          { rotulo: 'Resultado', valor: (l: L) => <span className="font-semibold">{l.resultado}</span> },
          { rotulo: 'Resultado ÷ LOA', valor: (l: L) => l.pct },
        ]} />
        <Nota titulo="Como ler e o que não está medido" larga>
          <p>
            A lei orçamentária é aprovada equilibrada: a receita estimada é igual à despesa fixada, e as reservas de RPPS e de contingência fazem parte da despesa fixada. Na execução, a receita realizada e a despesa empenhada diferem do orçamento inicial; a diferença entre as duas é o resultado orçamentário (receita total, líquida de deduções, menos despesa empenhada), que de 2023 a 2025 ficou entre {numero(Math.min(...anos.slice(0, 3).map((a) => ((a.receita - a.despesa) / a.loa) * 100)), 1)}% e {numero(Math.max(...anos.slice(0, 3).map((a) => ((a.receita - a.despesa) / a.loa) * 100)), 1)}% do orçamento inicial, e na projeção de 2026 é de {numero(((anos[3].receita - anos[3].despesa) / anos[3].loa) * 100, 1)}%. Aplicar essas relações à PLOA 2027 dá o que seria a execução se o padrão se repetisse: R$ {mi(ploa * faixa.res[0] / 100)} a {mi(ploa * faixa.res[1] / 100)} milhões de resultado, contra zero no orçamento. Não considera mudanças na votação (emendas e Poderes), na conjuntura da receita (ICMS, royalties) nem na política de execução.
          </p>
        </Nota>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026, evolução da receita e da despesa); Portal de Dados Abertos do ES (OrcamentosExecucoes: dotação inicial e empenhado; Receitas).</p>
    </div>
  )
}
