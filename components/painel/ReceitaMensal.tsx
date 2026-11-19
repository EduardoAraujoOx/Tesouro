'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, COR, Legenda, TabelaDelta, TabelaItens } from './Graficos'
import { ColunasMeses, fmtPct, type ItemSerie } from './GraficosMacro'
import { Faixa } from './Faixa'
import { titulo, type Linha } from './dados'
import { porMes, projetaReceita2026, soma, type DadosReceita } from './projecao'
import { RitmoReceita } from './Ritmo'

export type { DadosReceita }

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function ReceitaMensal({ dados, macro, ipca }: { dados: DadosReceita; macro: LinhaMacro[]; ipca: Record<string, number> }) {
  const R = useMemo(() => Object.fromEntries(macro.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [macro])
  const a25 = dados.anos['2025']?.linhas ?? []
  const a26 = dados.anos['2026']?.linhas ?? []
  const coleta = new Date(dados.coletado_em)
  // último mês completo: o mês anterior ao da coleta (o mês corrente está parcial)
  const ultimo = Math.max(1, Math.min(12, coleta.getMonth() + (coleta.getDate() >= 28 ? 1 : 0)))

  const liq25 = useMemo(() => porMes(a25, 'liq'), [a25])
  const liq26 = useMemo(() => porMes(a26, 'liq'), [a26])
  const mesesCom26 = liq26.map((x, i) => (i < ultimo ? x : null))
  const ytd26 = soma(liq26, ultimo)
  const ytd25 = soma(liq25, ultimo)
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const projecao = proj.central
  const provavel = R.total[4]

  /* perfil mensal 2027: valor anual do quadro da PLOA x participação de cada mês na arrecadação bruta de 2025, por componente */
  const comps = useMemo(() => {
    const defs: { id: string; rotulo: string; pref: string[]; valor: number }[] = [
      { id: 'icms', rotulo: 'ICMS', pref: ['1114'], valor: R.icms[5] },
      { id: 'ipva', rotulo: 'IPVA', pref: ['111251'], valor: R.ipva[5] },
      { id: 'irrf', rotulo: 'IRRF', pref: ['111303'], valor: R.irrf[5] },
      { id: 'itcd', rotulo: 'ITCD', pref: ['111252'], valor: R.itcd[5] },
      { id: 'taxas', rotulo: 'Taxas', pref: ['112'], valor: R.taxas[5] },
      { id: 'contrib', rotulo: 'Receita de contribuições', pref: ['12'], valor: R.contribuicoes[5] },
      { id: 'patrim', rotulo: 'Receita patrimonial', pref: ['13'], valor: R.patrimonial[5] },
      { id: 'transf', rotulo: 'Transferências correntes', pref: ['17'], valor: R.transf_corr_uniao[5] + R.transf_corr_outras[5] },
      { id: 'credito', rotulo: 'Operações de crédito', pref: ['21'], valor: R.operacoes_credito[5] },
    ]
    const brutoTotal27 = R.receitas_correntes[5] + R.intra[5] + R.receitas_capital[5]
    const usados = defs.reduce((s, d) => s + d.valor, 0)
    const todosPref = defs.flatMap((d) => d.pref)
    const linhas = defs.map((d) => {
      const base = porMes(a25, 3, d.pref)
      const t = soma(base) || 1
      return { ...d, mensal: base.map((x) => (x / t) * d.valor) }
    })
    const baseDemais = porMes(a25, 3, undefined, todosPref)
    const td = soma(baseDemais) || 1
    const valDemais = brutoTotal27 - usados
    linhas.push({ id: 'demais', rotulo: 'Demais receitas (inclui intraorçamentárias e de capital)', pref: [], valor: valDemais, mensal: baseDemais.map((x) => (x / td) * valDemais) })
    const baseDed = porMes(a25, 4)
    const tdd = soma(baseDed) || 1
    const ded27 = R.deducoes[5]
    linhas.push({ id: 'ded', rotulo: 'Deduções (municípios e Fundeb)', pref: [], valor: ded27, mensal: baseDed.map((x) => (x / tdd) * ded27) })
    const totalMes = Array(12).fill(0).map((_, i) => linhas.reduce((s, l) => s + l.mensal[i], 0))
    return { linhas, totalMes }
  }, [a25, R])

  const itensPerfil = [
    ...comps.linhas.map((l) => ({ chave: l.id, rotulo: l.rotulo, mensal: l.mensal, anual: l.valor })),
    { chave: 'total', rotulo: '= Receita líquida', mensal: comps.totalMes, anual: soma(comps.totalMes) },
  ]
  const colsPerfil = [
    { rotulo: 'R$ milhões', valor: (x: (typeof itensPerfil)[number]) => x.rotulo },
    ...MESES.map((m, i) => ({ rotulo: m, valor: (x: (typeof itensPerfil)[number]) => milhoes(x.mensal[i], 0) })),
    { rotulo: '2027', valor: (x: (typeof itensPerfil)[number]) => milhoes(x.anual, 0) },
  ]

  const varYtd = (ytd26 / ytd25 - 1) * 100
  return (
    <div className="mt-3">
      <Faixa
        itens={[
          { r: `Receita líquida jan a ${MESES[ultimo - 1]} 2026`, v: bilhoes(ytd26), s: `${fmtPct(varYtd)} sobre 2025`, destaque: true },
          { r: 'Projeção de fechamento 2026', v: bilhoes(projecao), s: `faixa ${(proj.min / 1e9).toFixed(1).replace('.', ',')} a ${(proj.max / 1e9).toFixed(1).replace('.', ',')} bi; provável da PLOA: ${bilhoes(provavel)}` },
          { r: 'Receita líquida 2027', v: bilhoes(R.total[5]), s: `${fmtPct((R.total[5] / projecao - 1) * 100)} sobre a projeção` },
        ]}
        nota={`Líquida = arrecadação bruta menos deduções. Projeção: arrecadação até ${NOMES_MES[ultimo - 1]} dividida pela participação média desse período no ano em 2022–2025 (detalhe na tabela de ritmo, abaixo).`}
      />
      <div className="mt-3"><RitmoReceita dados={dados} /></div>
      <div className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-12">
        <Cartao className="2xl:col-span-12" titulo="Receita líquida por mês: 2026 e 2025"
          legenda={<Legenda itens={[{ cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: '2025' }, { cor: COR.ploa, rotulo: `2026 (até ${NOMES_MES[ultimo - 1]})` }]} />}
          grafico={<ColunasMeses anterior={liq25} corrente={mesesCom26} rotuloAnterior="2025" rotuloCorrente="2026" />}
          tabela={<TabelaItens itens={MESES.map((m, i) => ({ chave: m, mes: m, a: liq25[i], c: mesesCom26[i] }))} legenda="Receita líquida por mês, em R$ milhões"
            colunas={[{ rotulo: 'Mês', valor: (x) => x.mes }, { rotulo: '2025', valor: (x) => milhoes(x.a, 0) }, { rotulo: '2026', valor: (x) => (x.c === null ? '–' : milhoes(x.c, 0)) }, { rotulo: 'Δ%', valor: (x) => (x.c !== null && x.a ? fmtPct((x.c / x.a - 1) * 100) : '–') }]} />} />
        <Cartao className="2xl:col-span-12" titulo="Perfil mensal proposto para 2027 (ensaio das metas de arrecadação)"
          grafico={<TabelaItens itens={itensPerfil} colunas={colsPerfil} legenda="Perfil mensal proposto da receita de 2027, em R$ milhões" />} />
      </div>
      <p className="mt-3 text-small text-ink-soft">
        Perfil de 2027: valor anual de cada componente no quadro da PLOA distribuído pela participação de cada mês na arrecadação bruta de 2025; deduções pela participação de 2025. É um ponto de partida para o quadro de metas mensais do decreto de início de exercício, e não a meta oficial.
        Fonte: Portal de Dados Abertos do ES (receitas, coleta em {coleta.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}).
      </p>
    </div>
  )
}

/** Cobertura por fonte: receita líquida arrecadada em 2026 contra a despesa empenhada na mesma fonte, e a despesa proposta para 2027. */
export function CoberturaFontes({ dados, linhas, nomesFonte }: { dados: DadosReceita; linhas: Linha[]; nomesFonte: Record<string, string> }) {
  const coleta = new Date(dados.coletado_em)
  const a26 = dados.anos['2026']?.linhas ?? []
  const itens = useMemo<(ItemSerie & { receita: number; emp: number; ploa: number })[]>(() => {
    const rec = new Map<string, number>()
    for (const l of a26) rec.set(String(l[2]), (rec.get(String(l[2])) ?? 0) + Number(l[3]) + Number(l[4]))
    const emp = new Map<string, number>(), ploa = new Map<string, number>()
    for (const l of linhas) {
      emp.set(l[4], (emp.get(l[4]) ?? 0) + l[8])
      ploa.set(l[4], (ploa.get(l[4]) ?? 0) + l[5])
    }
    const chaves = new Set([...rec.keys(), ...emp.keys(), ...ploa.keys()])
    return [...chaves].map((f) => {
      const r = rec.get(f) ?? 0, e = emp.get(f) ?? 0, p = ploa.get(f) ?? 0
      return { chave: f, rotulo: `${f} ${titulo(nomesFonte[f] || dados.nomes.fonte[f] || '')}`, v: [r, e], receita: r, emp: e, ploa: p }
    }).filter((x) => x.receita || x.emp).sort((a, b) => Math.max(b.receita, b.emp) - Math.max(a.receita, a.emp))
  }, [a26, linhas, nomesFonte, dados.nomes.fonte])
  const top = itens.slice(0, 14)
  const totR = itens.reduce((s, x) => s + x.receita, 0), totE = itens.reduce((s, x) => s + x.emp, 0)
  return (
    <div className="mt-3">
      <Faixa
        itens={[
          { r: 'Receita líquida arrecadada 2026', v: bilhoes(totR), s: `até ${coleta.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, destaque: true },
          { r: 'Empenhado 2026', v: bilhoes(totE) },
          { r: 'Receita menos empenhado', v: `${totR - totE >= 0 ? '+' : '−'}${bilhoes(Math.abs(totR - totE))}` },
        ]}
        nota="Receita até a data da coleta contra empenhos do ano inteiro: ainda faltam semanas de arrecadação, e o saldo negativo pode estar coberto por superávit financeiro de anos anteriores. A conferência fina é por fonte e detalhamento."
      />
      <div className="mt-3">
        <Cartao titulo="Cobertura por fonte de recursos: 14 maiores">
          <TabelaDelta itens={top} delta={(x) => x.receita - x.emp} rotuloBarra="Fonte|Receita menos empenhado" primeira={(x) => x.rotulo}
            legenda="Cobertura por fonte, em R$ milhões" colunas={[
              { rotulo: 'Receita 26', valor: (x) => milhoes(x.receita, 0) },
              { rotulo: 'Empenhado 26', valor: (x) => milhoes(x.emp, 0) },
              { rotulo: 'Saldo', valor: (x) => `${x.receita - x.emp >= 0 ? '+' : '−'}${milhoes(Math.abs(x.receita - x.emp), 0)}`, forte: true },
              { rotulo: 'PLOA 27 (despesa)', valor: (x) => milhoes(x.ploa, 0) },
            ]} />
        </Cartao>
      </div>
    </div>
  )
}
