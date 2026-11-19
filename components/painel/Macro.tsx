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

/* ---------- Visão geral ---------- */
export function VisaoGeral({ receita, despesa, ipca, fonteIpca }: Omit<Props, 'mensal'>) {
  const { R, D } = useMemo(() => tabelas(receita, despesa), [receita, despesa])
  const i27 = ipca['2027']
  const trio = (m: Record<string, number[]>, ...ch: string[]) => [3, 4, 5].map((c) => ch.reduce((s, k) => s + m[k][c], 0))

  const rec = (R: Record<string, number[]>): ItemSerie[] => [
    { chave: 'icms', rotulo: 'ICMS', v: trio(R, 'icms') },
    { chave: 'tuniao', rotulo: 'Transferências correntes da União', v: trio(R, 'transf_corr_uniao') },
    { chave: 'ipva', rotulo: 'IPVA', v: trio(R, 'ipva') },
    { chave: 'irrf', rotulo: 'IRRF', v: trio(R, 'irrf') },
    { chave: 'toutras', rotulo: 'Outras transferências correntes', v: trio(R, 'transf_corr_outras') },
    { chave: 'patrimonial', rotulo: 'Receita patrimonial', v: trio(R, 'patrimonial') },
    { chave: 'taxas', rotulo: 'Taxas', v: trio(R, 'taxas') },
    { chave: 'contribuicoes', rotulo: 'Contribuições', v: trio(R, 'contribuicoes') },
    { chave: 'credito', rotulo: 'Operações de crédito', v: trio(R, 'operacoes_credito') },
    { chave: 'demaisCorr', rotulo: 'Demais receitas correntes', sub: 'agropecuária, industrial, serviços e outras', v: trio(R, 'agropecuaria', 'industrial', 'servicos', 'outras_correntes') },
    { chave: 'itcd', rotulo: 'ITCD', v: trio(R, 'itcd') },
    { chave: 'intra', rotulo: 'Correntes intraorçamentárias', v: trio(R, 'intra') },
    { chave: 'demaisCap', rotulo: 'Demais receitas de capital', sub: 'alienações, transferências e outras', v: trio(R, 'alienacao', 'amortizacao_emprestimos', 'transf_capital', 'outras_capital') },
  ].sort((a, b) => b.v[2] - a.v[2])
  const desp = (D: Record<string, number[]>): ItemSerie[] => [
    { chave: 'pessoal', rotulo: 'Pessoal e encargos sociais', v: trio(D, 'pessoal') },
    { chave: 'outras', rotulo: 'Outras despesas correntes', v: trio(D, 'outras_correntes') },
    { chave: 'invest', rotulo: 'Investimentos', v: trio(D, 'investimento') },
    { chave: 'inversoes', rotulo: 'Inversões financeiras', v: trio(D, 'inversoes') },
    { chave: 'amort', rotulo: 'Amortização da dívida', v: trio(D, 'amortizacao') },
    { chave: 'juros', rotulo: 'Juros e encargos da dívida', v: trio(D, 'juros') },
    { chave: 'rpps', rotulo: 'Reserva do RPPS', v: trio(D, 'reserva_rpps') },
    { chave: 'cont', rotulo: 'Reserva de contingência', v: trio(D, 'reserva_contingencia') },
  ].sort((a, b) => b.v[2] - a.v[2])
  const itensR = rec(R), itensD = desp(D)

  const grupos = [
    ['2023', 0], ['2024', 1], ['2025', 2], ['Orç. 2026', 3], ['Prov. 2026', 4], ['Prop. 2027', 5],
  ].map(([rotulo, c]) => ({ rotulo: rotulo as string, receita: R.total[c as number], despesa: D.total[c as number] }))

  // resultado orçamentário: 2025, provável 2026, 2027
  const col = [2, 4, 5]
  const resultado = col.map((c) => {
    const rcl = R.receitas_correntes[c] + R.intra[c] + R.deducoes[c]
    const dc = D.despesas_correntes[c]
    const res = D.reserva_rpps[c] + D.reserva_contingencia[c]
    return { rc: R.receitas_correntes[c], intra: R.intra[c], ded: R.deducoes[c], rcl, dc, sup: rcl - dc, rk: R.receitas_capital[c], dk: D.despesas_capital[c], res, saldo: rcl - dc + R.receitas_capital[c] - D.despesas_capital[c] - res }
  })
  const linhasRes: { chave: string; rotulo: string; v: number[] }[] = [
    { chave: 'rc', rotulo: 'Receitas correntes (brutas)', v: resultado.map((r) => r.rc) },
    { chave: 'intra', rotulo: '(+) Intraorçamentárias', v: resultado.map((r) => r.intra) },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', v: resultado.map((r) => r.ded) },
    { chave: 'rcl', rotulo: '= Receita corrente líquida', v: resultado.map((r) => r.rcl) },
    { chave: 'dc', rotulo: '(−) Despesas correntes', v: resultado.map((r) => -r.dc) },
    { chave: 'sup', rotulo: '= Superávit corrente', v: resultado.map((r) => r.sup) },
    { chave: 'rk', rotulo: '(+) Receitas de capital', v: resultado.map((r) => r.rk) },
    { chave: 'dk', rotulo: '(−) Despesas de capital', v: resultado.map((r) => -r.dk) },
    { chave: 'res', rotulo: '(−) Reservas (RPPS e contingência)', v: resultado.map((r) => -r.res) },
    { chave: 'saldo', rotulo: '= Resultado orçamentário', v: resultado.map((r) => r.saldo) },
  ]

  const vr = variacoes(R.total[4], R.total[5], i27)
  const vd = variacoes(D.total[4], D.total[5], i27)
  const reservas = D.reserva_rpps[5] + D.reserva_contingencia[5]

  /* receita e despesa por ano: variação de cada ano sobre o anterior (o provável de 2026 e a proposta de 2027 comparam com 2025 e com o provável) */
  const anterior = [null, 0, 1, 2, 2, 4]
  const porAno = grupos.map((g, k) => {
    const ant = anterior[k] === null ? null : grupos[anterior[k] as number]
    return { chave: g.rotulo, ...g, dr: ant ? variacoes(ant.receita, g.receita, i27).nominal : undefined, dd: ant ? variacoes(ant.despesa, g.despesa, i27).nominal : undefined }
  })
  const colsDelta = (rotuloBase: string, rotuloAlvo: string) => [
    { rotulo: 'Orç. 26', valor: (i: ItemSerie) => mi(i.v[0]) },
    { rotulo: rotuloBase, valor: (i: ItemSerie) => mi(i.v[1]) },
    { rotulo: rotuloAlvo, valor: (i: ItemSerie) => mi(i.v[2]), forte: true },
    { rotulo: 'Δ R$ mi', valor: (i: ItemSerie) => dMi(i.v[2] - i.v[1]) },
    { rotulo: 'Δ%', valor: (i: ItemSerie) => fmtPct(variacoes(i.v[1], i.v[2], i27).nominal) },
    { rotulo: 'Real', valor: (i: ItemSerie) => fmtPct(variacoes(i.v[1], i.v[2], i27).real) },
  ]
  const nomeLinha = (i: ItemSerie) => <><span className="line-clamp-3 font-medium text-ink md:line-clamp-none">{i.rotulo}</span>{i.sub && <span className="block text-label normal-case tracking-normal text-ink-soft">{i.sub}</span>}</>

  return (
    <div>
      <Faixa
        itens={[
          { r: 'Receita 2027 sobre provável 2026', v: fmtPct(vr.nominal), s: `real ${fmtPct(vr.real)}`, destaque: true },
          { r: 'Despesa 2027 sobre execução provável 2026', v: fmtPct(vd.nominal), s: `real ${fmtPct(vd.real)}` },
          { r: 'Superávit corrente 2027', v: bilhoes(resultado[2].sup), s: `2026 provável ${bilhoes(resultado[1].sup)}` },
          { r: 'Reservas na proposta', v: bilhoes(reservas), s: `${numero((reservas / D.total[5]) * 100, 1)}% da despesa` },
        ]}
        nota={`Real: deflacionado pelo IPCA 2027 de ${numero(i27 * 100, 2)}% (Focus). Tabelas em R$ milhões, arredondadas.`}
      />
      <div className="par-impressao mt-3 grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <Cartao className="xl:col-span-7" titulo="Receita líquida e despesa, ano a ano">
          <TabelaItens itens={porAno} legenda="Receita líquida e despesa por ano, em R$ milhões" colunas={[
            { rotulo: 'Ano', valor: (g) => g.rotulo },
            { rotulo: 'Receita líquida', valor: (g) => mi(g.receita) },
            { rotulo: 'Δ%', valor: (g) => fmtPct(g.dr) },
            { rotulo: 'Despesa', valor: (g) => mi(g.despesa) },
            { rotulo: 'Δ%', valor: (g) => fmtPct(g.dd) },
            { rotulo: 'Resultado', valor: (g) => (Math.abs(g.receita - g.despesa) < 1e6 ? 'equilíbrio' : dMi(g.receita - g.despesa)) },
          ]} />
          <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">Δ% sobre o ano anterior; orçamento e provável de 2026 sobre 2025; 2027 sobre o provável de 2026.</p>
        </Cartao>
        <Cartao className="xl:col-span-5" titulo="Resultado orçamentário">
          <ResultadoTabela linhas={linhasRes} />
        </Cartao>
      </div>
      <div className="mt-3 space-y-3">
        <Cartao titulo="Receita por origem: o que muda em 2027">
          <TabelaDelta itens={itensR} delta={(i) => i.v[2] - i.v[1]} rotuloBarra="Origem|2027 menos provável 2026" primeira={nomeLinha}
            legenda="Receita por origem, em R$ milhões" colunas={colsDelta('Prov. 26', '2027')} />
        </Cartao>
        <Cartao titulo="Despesa por grupo: o que muda em 2027">
          <TabelaDelta itens={itensD} delta={(i) => i.v[2] - i.v[1]} rotuloBarra="Grupo|2027 menos provável 2026" primeira={nomeLinha}
            legenda="Despesa por grupo, em R$ milhões" colunas={colsDelta('Prov. 26', '2027')} />
        </Cartao>
      </div>
      <p className="mt-3 text-small text-ink-soft">Fonte: PLOA 2027, Mensagem nº 189/2026, quadros Evolução da Receita (p. 97) e Evolução da Despesa (p. 130); provável 2026 é a estimativa do próprio documento. IPCA: {fonteIpca}</p>
    </div>
  )
}

function ResultadoTabela({ linhas }: { linhas: { chave: string; rotulo: string; v: number[] }[] }) {
  return (
    <div tabIndex={0} role="region" aria-label="Resultado orçamentário, em R$ milhões" className="rola overflow-x-auto rounded-brand border border-line">
      <table className="w-full text-left text-small">
        <caption className="sr-only">Resultado orçamentário em R$ milhões: 2025, provável 2026 e 2027</caption>
        <thead className="bg-surface"><tr><th scope="col" className="sticky left-0 bg-surface px-3 py-2">R$ milhões</th><th scope="col" className="hidden px-2 py-2 text-right sm:table-cell sm:px-3">2025</th><th scope="col" className="px-2 py-2 text-right sm:px-3">Prov. 26</th><th scope="col" className="px-2 py-2 text-right sm:px-3">2027</th></tr></thead>
        <tbody>
          {linhas.map((l) => {
            const total = l.rotulo.startsWith('=')
            return (
              <tr key={l.chave} className={`border-t border-line ${total ? 'bg-surface font-semibold' : ''}`}>
                <th scope="row" className={`sticky left-0 z-[1] min-w-[6.5rem] whitespace-normal px-3 py-1.5 shadow-[1px_0_0_rgb(var(--line))] ${total ? 'bg-surface font-semibold' : 'bg-paper font-normal'}`}>{l.rotulo}</th>
                {l.v.map((x, j) => <td key={j} className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums sm:px-3 ${j === 0 ? 'hidden sm:table-cell' : ''}`}>{milhoes(x === 0 ? 0 : x, 0)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
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
