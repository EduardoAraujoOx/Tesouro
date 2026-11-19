'use client'

import { Fragment, useEffect, useId, useMemo, useState } from 'react'
import { bilhoes, milhoes, numero, pct } from '@/lib/formato'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { Cartao, BarrasPares, BarrasVariacao, COR, Legenda, LEGENDA_PARES, TabelaItens } from './Graficos'
import { Faixa } from './Faixa'
import { Receita, VisaoGeral } from './Macro'
import type { LinhaMacro } from '@/lib/macro'
import { ATU, EMP, INI, PLOA, agrupa, execucaoPct, titulo, total, variacaoPct, type Item, type Linha, type Soma } from './dados'

type Nomes = { uo: Record<string, string>; programa: Record<string, string>; acao: Record<string, string>; gnd: Record<string, string>; fonte: Record<string, string> }
type Escopo = 'executivo' | 'outros' | 'todos'
type Alerta = 'abaixo' | 'novas' | 'extintas'
type Aba = 'visao' | 'receita' | 'despesa' | 'fontes'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa por unidade' },
  { id: 'fontes', rotulo: 'Fontes e grupos' },
]

const cap = titulo
const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x))}`
const dPct = (x: number | null) => (x === null ? 'novo' : `${sinal(x)}${numero(Math.abs(x), 1)}%`)
const topN = (itens: Item[], n: number) => [...itens].sort((a, b) => Math.max(b.v[PLOA], b.v[ATU]) - Math.max(a.v[PLOA], a.v[ATU])).slice(0, n)

type MacroProps = {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; fonteIpca: string
  mensal: Record<'icms' | 'fpe' | 'royalties', Record<string, number>>
}

export function Painel({ linhas, nomes, coleta, outrosPoderes, macro }: { linhas: Linha[]; nomes: Nomes; coleta: string; outrosPoderes: string[]; macro: MacroProps }) {
  const [aba, setAba] = useState<Aba>('visao')
  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (ABAS.some((a) => a.id === h)) setAba(h as Aba)
  }, [])
  const escolheAba = (a: Aba) => { setAba(a); try { window.history.replaceState(null, '', `#${a}`) } catch { /* sem histórico: segue */ } }
  const idUo = useId()
  const outros = useMemo(() => new Set(outrosPoderes), [outrosPoderes])
  const [escopo, setEscopo] = useState<Escopo>('executivo')
  const [uoSel, setUoSel] = useState('')
  const [alerta, setAlerta] = useState<Alerta>('abaixo')
  const [ordem, setOrdem] = useState<{ col: number; desc: boolean }>({ col: 1, desc: true })
  const [aberta, setAberta] = useState<string | null>(null)

  const doEscopo = useMemo(
    () => linhas.filter((l) => (escopo === 'todos' ? true : escopo === 'outros' ? outros.has(l[0].slice(0, 2)) : !outros.has(l[0].slice(0, 2)))),
    [linhas, escopo, outros],
  )
  const unidades = useMemo(
    () => [...new Set(doEscopo.map((l) => l[0]))].sort((a, b) => (nomes.uo[a] ?? a).localeCompare(nomes.uo[b] ?? b, 'pt-BR')),
    [doEscopo, nomes.uo],
  )
  const uoAtiva = unidades.includes(uoSel) ? uoSel : ''
  const L = useMemo(() => (uoAtiva ? doEscopo.filter((l) => l[0] === uoAtiva) : doEscopo), [doEscopo, uoAtiva])
  const tot = useMemo(() => total(L), [L])

  const nomeUo = (c: string) => cap(nomes.uo[c] || c)
  const nomeAcao = (c: string) => cap(nomes.acao[c] || c)

  /* nível do gráfico principal: unidades; com uma unidade escolhida, as ações dela */
  const nivel = useMemo<Item[]>(() => {
    if (!uoAtiva) return [...agrupa(L, (l) => l[0])].map(([k, v]) => ({ chave: k, rotulo: nomeUo(k), sub: k, v }))
    return [...agrupa(L, (l) => `${l[1]}|${l[2]}`)].map(([k, v]) => {
      const [prog, ac] = k.split('|')
      return { chave: k, rotulo: nomeAcao(ac), sub: `ação ${ac} · programa ${prog}`, v }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, uoAtiva])

  const porGnd = useMemo<Item[]>(
    () => [...agrupa(L, (l) => l[3])].map(([k, v]) => ({ chave: k, rotulo: `${k} ${cap(nomes.gnd[k] || '')}`, v })).sort((a, b) => Math.max(b.v[PLOA], b.v[ATU]) - Math.max(a.v[PLOA], a.v[ATU])),
    [L, nomes.gnd],
  )
  const porFonte = useMemo<Item[]>(
    () => topN([...agrupa(L, (l) => l[4])].map(([k, v]) => ({ chave: k, rotulo: `${k} ${cap(nomes.fonte[k] || '')}`, v })), 12),
    [L, nomes.fonte],
  )
  const principal = useMemo(() => topN(nivel, 15), [nivel])
  const variacao = useMemo(() => {
    const d = (i: Item) => i.v[PLOA] - i.v[ATU]
    const ord = [...nivel].sort((a, b) => d(b) - d(a))
    const alta = ord.filter((i) => d(i) > 0).slice(0, 8)
    const baixa = ord.filter((i) => d(i) < 0).slice(-8)
    return [...alta, ...baixa]
  }, [nivel])

  /* ações para a tabela e os alertas */
  const acoes = useMemo<(Item & { uo: string })[]>(
    () => [...agrupa(L, (l) => `${l[0]}|${l[1]}|${l[2]}`)].map(([k, v]) => {
      const [uo, prog, ac] = k.split('|')
      return { chave: k, uo, rotulo: nomeAcao(ac), sub: `${nomeUo(uo)} · ação ${ac}`, v }
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [L])
  const em2026 = (v: Soma) => v[INI] !== 0 || v[ATU] !== 0 || v[EMP] !== 0
  const listas = useMemo(() => ({
    abaixo: acoes.filter((a) => em2026(a.v) && a.v[EMP] - a.v[PLOA] >= 5_000_000).sort((a, b) => (b.v[EMP] - b.v[PLOA]) - (a.v[EMP] - a.v[PLOA])).slice(0, 15),
    novas: acoes.filter((a) => !em2026(a.v) && a.v[PLOA] > 0).sort((a, b) => b.v[PLOA] - a.v[PLOA]).slice(0, 15),
    extintas: acoes.filter((a) => a.v[PLOA] === 0 && a.v[EMP] > 0).sort((a, b) => b.v[EMP] - a.v[EMP]).slice(0, 15),
  }), [acoes])
  const contagens = useMemo(() => ({
    abaixo: acoes.filter((a) => em2026(a.v) && a.v[EMP] - a.v[PLOA] >= 5_000_000).length,
    novas: acoes.filter((a) => !em2026(a.v) && a.v[PLOA] > 0).length,
    extintas: acoes.filter((a) => a.v[PLOA] === 0 && a.v[EMP] > 0).length,
  }), [acoes])

  /* tabela principal (unidades, com as ações ao abrir; com unidade escolhida, só as ações) */
  const colunas: { rotulo: string; valor: (v: Soma) => number }[] = [
    { rotulo: 'PLOA 2027', valor: (v) => v[PLOA] },
    { rotulo: 'Inicial 2026', valor: (v) => v[INI] },
    { rotulo: 'Atualizada 2026', valor: (v) => v[ATU] },
    { rotulo: 'Empenhado 2026', valor: (v) => v[EMP] },
    { rotulo: 'Exec. %', valor: (v) => execucaoPct(v) ?? -1 },
    { rotulo: 'Δ R$ mi', valor: (v) => v[PLOA] - v[ATU] },
    { rotulo: 'Δ %', valor: (v) => variacaoPct(v) ?? 1e9 },
  ]
  const linhasTabela = useMemo(() => [...nivel].sort((a, b) => {
    const c = colunas[ordem.col].valor
    return ordem.desc ? c(b.v) - c(a.v) : c(a.v) - c(b.v)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [nivel, ordem])
  const filhos = (uo: string) => acoes.filter((a) => a.uo === uo).sort((a, b) => b.v[PLOA] - a.v[PLOA])

  const resumo = [
    { r: 'PLOA 2027', v: milhoes(tot[PLOA]), s: '', destaque: true },
    { r: 'Atualizada 2026', v: milhoes(tot[ATU]), s: '' },
    { r: 'Empenhado 2026', v: milhoes(tot[EMP]), s: `${numero(execucaoPct(tot) ?? 0, 0)}% da atualizada` },
    { r: 'PLOA − atualizada', v: dMi(tot[PLOA] - tot[ATU]), s: dPct(variacaoPct(tot)) },
  ]

  const colsPares = (primeira: string) => [
    { rotulo: primeira, valor: (i: Item) => i.rotulo },
    { rotulo: 'PLOA 27', valor: (i: Item) => milhoes(i.v[PLOA]) },
    { rotulo: 'Atual. 26', valor: (i: Item) => milhoes(i.v[ATU]) },
    { rotulo: 'Emp. 26', valor: (i: Item) => milhoes(i.v[EMP]) },
    { rotulo: 'Δ R$ mi', valor: (i: Item) => dMi(i.v[PLOA] - i.v[ATU]) },
    { rotulo: 'Δ %', valor: (i: Item) => dPct(variacaoPct(i.v)) },
  ]
  const tituloNivel = uoAtiva ? 'Ações da unidade' : 'Unidades orçamentárias'

  const filtros = (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <fieldset>
          <legend className="text-small text-ink-soft">Recorte</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {([['executivo', 'Executivo'], ['outros', 'Outros Poderes'], ['todos', 'Todos']] as [Escopo, string][]).map(([v, r]) => (
              <label key={v} className={`cursor-pointer rounded-brand border px-3 py-1.5 text-small ${escopo === v ? 'border-navy bg-navy font-semibold text-on-navy' : 'border-line bg-paper'}`}>
                <input type="radio" name="recorte" value={v} checked={escopo === v} onChange={() => { setEscopo(v); setUoSel(''); setAberta(null) }} className="sr-only" />{r}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="min-w-[16rem] max-w-md flex-1">
          <label htmlFor={idUo} className="text-small text-ink-soft">Unidade</label>
          <select id={idUo} value={uoAtiva} onChange={(e) => { setUoSel(e.target.value); setAberta(null) }} className="mt-1 block w-full rounded-brand border border-line bg-paper px-3 py-1.5 text-small">
            <option value="">Todas ({unidades.length})</option>
            {unidades.map((u) => <option key={u} value={u}>{u} {cap(nomes.uo[u] ?? '')}</option>)}
          </select>
        </div>
              </div>
    </>
  )

  return (
    <div className="painel mx-auto max-w-[1600px] px-5 py-4 md:px-8">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <div role="tablist" aria-label="Seções do painel" className="flex gap-1 overflow-x-auto">
          {ABAS.map((a) => (
            <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls={`painel-${a.id}`} tabIndex={aba === a.id ? 0 : -1}
              onClick={() => escolheAba(a.id)}
              onKeyDown={(e) => {
                const i = ABAS.findIndex((x) => x.id === aba)
                if (e.key === 'ArrowRight') { e.preventDefault(); escolheAba(ABAS[(i + 1) % ABAS.length].id) }
                if (e.key === 'ArrowLeft') { e.preventDefault(); escolheAba(ABAS[(i + ABAS.length - 1) % ABAS.length].id) }
              }}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-body font-semibold ${aba === a.id ? 'border-navy text-navy' : 'border-transparent text-ink-soft hover:text-ink'}`}>
              {a.rotulo}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className="mb-1 rounded-brand border border-line px-3 py-1.5 text-small font-semibold text-ink hover:bg-surface">Exportar PDF</button>
      </div>
      <h1 className="hidden text-title font-semibold print:block">{IDENTIDADE.nome} · {IDENTIDADE.painel} · {ABAS.find((a) => a.id === aba)?.rotulo}</h1>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="mt-3">
        {aba === 'visao' && <VisaoGeral receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} fonteIpca={macro.fonteIpca} />}
        {aba === 'receita' && <Receita receita={macro.receita} ipca={macro.ipca} mensal={macro.mensal} />}
        {aba === 'despesa' && (
          <>
            <div className="print:hidden">{filtros}</div>
            {/* totais do recorte, numa linha */}
      <Faixa itens={resumo} nota="R$ milhões, valores correntes" />

            <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <Cartao className="lg:col-span-7" titulo={`${tituloNivel}: 15 maiores`} legenda={<Legenda itens={LEGENDA_PARES} />}
          grafico={<BarrasPares itens={principal} onEscolhe={uoAtiva ? undefined : (c) => { setUoSel(c); setAberta(null) }} />}
          tabela={<TabelaItens itens={principal} colunas={colsPares(tituloNivel)} legenda={`${tituloNivel}, 15 maiores`} />} />
        <Cartao className="lg:col-span-5" titulo="PLOA 2027 menos atualizada 2026" legenda={<Legenda itens={[{ cor: COR.alta, rotulo: 'Aumento' }, { cor: COR.baixa, rotulo: 'Redução' }]} />}
          grafico={<BarrasVariacao itens={variacao} />}
          tabela={<TabelaItens itens={variacao} colunas={colsPares(tituloNivel)} legenda="Maiores aumentos e reduções da PLOA sobre a atualizada de 2026" />} />
            </div>
            {/* tabela */}
      <section aria-label={tituloNivel} className="mt-4 rounded-brand border border-line bg-paper p-4">
        <h2 className="text-lead font-semibold">{tituloNivel}</h2>
        <div tabIndex={0} role="region" aria-label={`Tabela: ${tituloNivel}`} className="mt-3 max-h-[36rem] overflow-auto rounded-brand border border-line">
          <table className="w-full min-w-[56rem] text-left text-small">
            <caption className="sr-only">{tituloNivel}, em R$ milhões</caption>
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <th scope="col" className="px-3 py-2">{tituloNivel}</th>
                {colunas.map((c, j) => (
                  <th key={c.rotulo} scope="col" aria-sort={ordem.col === j ? (ordem.desc ? 'descending' : 'ascending') : 'none'} className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setOrdem(ordem.col === j ? { col: j, desc: !ordem.desc } : { col: j, desc: true })} className="font-semibold underline-offset-4 hover:underline">
                      {c.rotulo}<span aria-hidden="true" className="text-ink-soft">{ordem.col === j ? (ordem.desc ? ' ▼' : ' ▲') : ''}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasTabela.map((u) => {
                const abre = aberta === u.chave
                return (
                  <Fragment key={u.chave}>
                    <tr className="border-t border-line align-top">
                      <th scope="row" className="px-3 py-1.5 font-normal">
                        {uoAtiva ? (
                          <><span className="block font-semibold">{u.rotulo}</span><span className="text-ink-soft">{u.sub}</span></>
                        ) : (
                          <button type="button" aria-expanded={abre} onClick={() => setAberta(abre ? null : u.chave)} className="text-left font-semibold text-navy underline-offset-4 hover:underline">
                            <span aria-hidden="true">{abre ? '− ' : '+ '}</span>{u.rotulo}<span className="ml-2 font-normal text-ink-soft">{u.chave}</span>
                          </button>
                        )}
                      </th>
                      {celulas(u.v)}
                    </tr>
                    {abre && filhos(u.chave).map((a) => (
                      <tr key={a.chave} className="border-t border-line bg-surface/60 align-top">
                        <th scope="row" className="px-3 py-1.5 pl-8 font-normal"><span className="block">{a.rotulo}</span><span className="text-ink-soft">{a.chave.split('|')[2]} · programa {a.chave.split('|')[1]}</span></th>
                        {celulas(a.v)}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot className="sticky bottom-0 border-t-2 border-line bg-surface font-semibold">
              <tr><th scope="row" className="px-3 py-1.5">Total ({linhasTabela.length})</th>{celulas(tot)}</tr>
            </tfoot>
          </table>
        </div>
      </section>

            {/* alertas */}
      <section aria-label="Pontos de atenção" className="mt-4 rounded-brand border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lead font-semibold">Pontos de atenção</h2>
          <div role="group" aria-label="Tipo de ponto de atenção" className="inline-flex flex-wrap overflow-hidden rounded-brand border border-line text-small">
            {([['abaixo', 'PLOA abaixo do empenhado 26'], ['novas', 'Ações novas'], ['extintas', 'Sem dotação na PLOA']] as [Alerta, string][]).map(([v, r]) => (
              <button key={v} type="button" aria-pressed={alerta === v} onClick={() => setAlerta(v)} className={`px-3 py-1.5 ${alerta === v ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>
                {r} <span className="tabular-nums opacity-80">({contagens[v]})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <TabelaItens
            itens={listas[alerta]}
            legenda={alerta === 'abaixo' ? 'Ações em que a PLOA 2027 é menor que o empenhado de 2026' : alerta === 'novas' ? 'Ações novas na PLOA 2027' : 'Ações com empenho em 2026 e sem dotação na PLOA 2027'}
            colunas={[
              { rotulo: 'Ação', valor: (i) => `${i.rotulo} · ${i.sub ?? ''}` },
              { rotulo: 'PLOA 27', valor: (i) => milhoes(i.v[PLOA]) },
              { rotulo: 'Atual. 26', valor: (i) => milhoes(i.v[ATU]) },
              { rotulo: 'Emp. 26', valor: (i) => milhoes(i.v[EMP]) },
              { rotulo: alerta === 'abaixo' ? 'Emp. − PLOA' : 'Δ R$ mi', valor: (i) => (alerta === 'abaixo' ? milhoes(i.v[EMP] - i.v[PLOA]) : dMi(i.v[PLOA] - i.v[ATU])) },
            ]}
          />
        </div>
      </section>

          </>
        )}
        {aba === 'fontes' && (
          <>
            <div className="print:hidden">{filtros}</div>
            {/* totais do recorte, numa linha */}
      <Faixa itens={resumo} nota="R$ milhões, valores correntes" />

            <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <Cartao className="lg:col-span-5" titulo="Grupo de despesa" legenda={<Legenda itens={LEGENDA_PARES} />}
          grafico={<BarrasPares itens={porGnd} />}
          tabela={<TabelaItens itens={porGnd} colunas={colsPares('Grupo')} legenda="Por grupo de natureza da despesa" />} />
        <Cartao className="lg:col-span-7" titulo="Fontes de recursos: 12 maiores" legenda={<Legenda itens={LEGENDA_PARES} />}
          grafico={<BarrasPares itens={porFonte} />}
          tabela={<TabelaItens itens={porFonte} colunas={colsPares('Fonte')} legenda="Doze maiores fontes de recursos" />} />
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-small text-ink-soft print:mt-2">
        {aba === 'despesa' || aba === 'fontes' ? <>Fonte: Portal de Dados Abertos do ES (2025 e 2026, coleta em {coleta}); PLOA 2027: Mensagem nº 189/2026, proposta e não a LOA. Δ = PLOA 2027 menos atualizada 2026.<br /></> : null}
        {IDENTIDADE.aviso}
      </p>
    </div>
  )

  function celulas(v: Soma) {
    const ex = execucaoPct(v)
    const dv = variacaoPct(v)
    return (
      <>
        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{milhoes(v[PLOA])}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(v[INI])}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(v[ATU])}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(v[EMP])}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{ex === null ? '–' : `${numero(ex, 0)}%`}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{dMi(v[PLOA] - v[ATU])}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{dPct(dv)}</td>
      </>
    )
  }
}
