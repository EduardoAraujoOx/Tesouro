'use client'

import { Fragment, useEffect, useId, useMemo, useState } from 'react'
import { bilhoes, milhoes, numero, pct } from '@/lib/formato'
import { IDENTIDADE } from '@/lib/identidade-painel'
import { Cartao, TabelaDelta, TabelaItens } from './Graficos'
import { fmtPct } from './GraficosMacro'
import { Faixa } from './Faixa'
import { Receita } from './Macro'
import { VisaoGeral } from './Agregado'
import { CoberturaFontes, ReceitaMensal, type DadosReceita } from './ReceitaMensal'
import type { LinhaMacro } from '@/lib/macro'
import { ATU, EMP, INI, PLOA, agrupa, execucaoPct, titulo, total, variacaoPct, type Item, type Linha, type Soma } from './dados'

type Nomes = { uo: Record<string, string>; programa: Record<string, string>; acao: Record<string, string>; gnd: Record<string, string>; fonte: Record<string, string> }
type Escopo = 'executivo' | 'outros' | 'todos'
type Alerta = 'abaixo' | 'novas' | 'extintas'
type Aba = 'visao' | 'receita' | 'despesa' | 'fontes' | 'atencao'
const ABAS: { id: Aba; rotulo: string; nota: string }[] = [
  { id: 'visao', rotulo: 'Visão geral', nota: 'Receita, despesa e resultado: a proposta de 2027 contra a história e a projeção de 2026' },
  { id: 'receita', rotulo: 'Receita', nota: 'Arrecadação de 2026, perfil mensal proposto para 2027 e quadro oficial detalhado' },
  { id: 'despesa', rotulo: 'Despesa', nota: 'PLOA 2027 contra a dotação e o empenho de 2026, por unidade orçamentária' },
  { id: 'fontes', rotulo: 'Fontes e grupos', nota: 'Grupos de despesa, fontes de recursos e cobertura da despesa pela receita' },
  { id: 'atencao', rotulo: 'Atenção', nota: 'Ações que merecem leitura cuidadosa antes da programação do exercício' },
]

const cap = titulo
const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x, 0)
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x), 0)}`
const dPct = (x: number | null) => fmtPct(x)
const topN = (itens: Item[], n: number) => [...itens].sort((a, b) => Math.max(b.v[PLOA], b.v[ATU]) - Math.max(a.v[PLOA], a.v[ATU])).slice(0, n)

type MacroProps = {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; fonteIpca: string
  mensal: Record<'icms' | 'fpe' | 'royalties', Record<string, number>>
}

export function Painel({ linhas, nomes, coleta, outrosPoderes, macro, receitaMes }: { linhas: Linha[]; nomes: Nomes; coleta: string; outrosPoderes: string[]; macro: MacroProps; receitaMes: DadosReceita }) {
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
  const [ordem, setOrdem] = useState<{ col: number; desc: boolean }>({ col: 0, desc: true })
  const [aberta, setAberta] = useState<string | null>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  useEffect(() => {
    if (!menuAberto) return
    const fecha = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false) }
    window.addEventListener('keydown', fecha)
    return () => window.removeEventListener('keydown', fecha)
  }, [menuAberto])

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
    { r: 'PLOA 2027', v: bilhoes(tot[PLOA]), s: '', destaque: true },
    { r: 'Atualizada 2026', v: bilhoes(tot[ATU]), s: '' },
    { r: 'Empenhado 2026', v: bilhoes(tot[EMP]), s: `${numero(execucaoPct(tot) ?? 0, 0)}% da atualizada` },
    { r: 'PLOA − atualizada', v: `${sinal(tot[PLOA] - tot[ATU])}${bilhoes(Math.abs(tot[PLOA] - tot[ATU]))}`, s: dPct(variacaoPct(tot)) },
  ]

  const nomeItem = (i: Item) => <><span className="line-clamp-3 font-medium text-ink md:line-clamp-none">{i.rotulo}</span>{i.sub && <span className="block text-label normal-case tracking-normal text-ink-soft">{i.sub}</span>}</>
  const colsDelta = [
    { rotulo: 'Atual. 26', valor: (i: Item) => mi(i.v[ATU]) },
    { rotulo: 'PLOA 27', valor: (i: Item) => mi(i.v[PLOA]), forte: true },
    { rotulo: 'Δ R$ mi', valor: (i: Item) => dMi(i.v[PLOA] - i.v[ATU]) },
    { rotulo: 'Δ%', valor: (i: Item) => dPct(variacaoPct(i.v)) },
  ]
  const tituloNivel = uoAtiva ? 'Ações da unidade' : 'Unidades orçamentárias'

  const filtros = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6">
      <fieldset>
        <legend className="text-small text-ink-soft">Recorte</legend>
        <div className="mt-1 grid grid-cols-[1fr_1.6fr_1fr] gap-1.5 sm:flex">
          {([['executivo', 'Executivo'], ['outros', 'Outros Poderes'], ['todos', 'Todos']] as [Escopo, string][]).map(([v, r]) => (
            <label key={v} className={`cursor-pointer rounded-brand border px-2 py-1.5 text-center text-small sm:px-3 ${escopo === v ? 'border-navy bg-navy font-semibold text-on-navy' : 'border-line bg-paper'}`}>
              <input type="radio" name="recorte" value={v} checked={escopo === v} onChange={() => { setEscopo(v); setUoSel(''); setAberta(null) }} className="sr-only" />{r}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="min-w-0 sm:min-w-[16rem] sm:max-w-md sm:flex-1">
        <label htmlFor={idUo} className="text-small text-ink-soft">Unidade</label>
        <select id={idUo} value={uoAtiva} onChange={(e) => { setUoSel(e.target.value); setAberta(null) }} className="mt-1 block w-full rounded-brand border border-line bg-paper px-3 py-1.5 text-small">
          <option value="">Todas ({unidades.length})</option>
          {unidades.map((u) => <option key={u} value={u}>{u} {cap(nomes.uo[u] ?? '')}</option>)}
        </select>
      </div>
    </div>
  )

  const abaAtual = ABAS.find((a) => a.id === aba)!
  return (
    <div className="painel mx-auto max-w-[1600px] px-4 pb-8 sm:px-5 md:px-8">
      {/* barra fixa: no computador, abas; no celular, um menu discreto com a seção atual */}
      <div className="print:hidden sticky top-0 z-30 -mx-4 border-b border-line bg-paper px-4 sm:-mx-5 sm:px-5 md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-2">
          <div role="tablist" aria-label="Seções do painel" className="hidden md:flex">
            {ABAS.map((a) => (
              <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls={`painel-${a.id}`} tabIndex={aba === a.id ? 0 : -1}
                onClick={() => escolheAba(a.id)}
                onKeyDown={(e) => {
                  const i = ABAS.findIndex((x) => x.id === aba)
                  if (e.key === 'ArrowRight') { e.preventDefault(); escolheAba(ABAS[(i + 1) % ABAS.length].id) }
                  if (e.key === 'ArrowLeft') { e.preventDefault(); escolheAba(ABAS[(i + ABAS.length - 1) % ABAS.length].id) }
                }}
                className={`-mb-px whitespace-nowrap border-b-[3px] px-4 py-2.5 text-small font-semibold lg:px-5 ${aba === a.id ? 'border-navy text-navy' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="relative md:hidden">
            <button type="button" aria-expanded={menuAberto} aria-controls="menu-secoes" onClick={() => setMenuAberto((v) => !v)}
              className="-ml-2 inline-flex items-center gap-2 px-2 py-2.5 text-body font-semibold text-navy">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
              {abaAtual.rotulo}
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-transform ${menuAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 5 5 5-5" /></svg>
            </button>
            {menuAberto && (
              <ul id="menu-secoes" className="absolute left-0 top-full z-40 mt-px w-64 overflow-hidden rounded-b-brand border border-line bg-paper shadow-lg">
                {ABAS.map((a) => (
                  <li key={a.id} className="border-t border-line first:border-t-0">
                    <button type="button" aria-current={aba === a.id ? 'page' : undefined} onClick={() => { escolheAba(a.id); setMenuAberto(false); window.scrollTo({ top: 0 }) }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-body ${aba === a.id ? 'bg-surface font-semibold text-navy' : 'text-ink'}`}>
                      {a.rotulo}{aba === a.id && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => window.print()} title="Abre a impressão: escolha “Salvar como PDF”" className="inline-flex items-center gap-1.5 rounded-brand px-2.5 py-1.5 text-small font-semibold text-ink-soft hover:bg-surface hover:text-ink">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14v2h12v-2" /></svg>
            PDF<span className="sr-only"> (exportar esta seção)</span>
          </button>
        </div>
      </div>

      <div className="mt-4 print:hidden">
        <h1 className="text-title font-semibold leading-tight md:text-section">{abaAtual.rotulo}</h1>
        <p className="mt-0.5 text-small text-ink-soft">{abaAtual.nota}</p>
      </div>
      <div className="hidden print:block">
        <p className="text-label normal-case tracking-normal text-ink-soft">{IDENTIDADE.nome} · {IDENTIDADE.apoio}</p>
        <h1 className="text-title font-semibold">{IDENTIDADE.painel} · {abaAtual.rotulo}</h1>
        <p className="text-small text-ink-soft">{abaAtual.nota}</p>
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="mt-4">
        {aba === 'visao' && <VisaoGeral receita={macro.receita} despesa={macro.despesa} ipca={macro.ipca} fonteIpca={macro.fonteIpca} dados={receitaMes} />}
        {aba === 'receita' && (
          <>
            <ReceitaMensal dados={receitaMes} macro={macro.receita} ipca={macro.ipca} />
            <h2 className="mt-8 border-b border-line pb-1.5 text-lead font-semibold">ICMS e transferências</h2>
            <div className="mt-1"><Receita receita={macro.receita} ipca={macro.ipca} mensal={macro.mensal} /></div>
          </>
        )}
        {aba === 'despesa' && (
          <>
            <div className="print:hidden">{filtros}</div>
            {/* totais do recorte, numa linha */}
      <Faixa itens={resumo} nota="Tabelas em R$ milhões, arredondadas; valores correntes." />

            <div className="mt-3">
              <Cartao titulo={uoAtiva ? 'Ações da unidade: maiores aumentos e reduções' : 'Unidades: maiores aumentos e reduções da PLOA sobre a atualizada de 2026'}>
                <TabelaDelta itens={variacao} delta={(i) => i.v[PLOA] - i.v[ATU]} rotuloBarra={`${tituloNivel}|PLOA 2027 menos atualizada 2026`} primeira={nomeItem}
                  legenda="Maiores aumentos e reduções da PLOA 2027 sobre a dotação atualizada de 2026, em R$ milhões" colunas={colsDelta} />
              </Cartao>
            </div>
            {/* tabela */}
      <section aria-label={tituloNivel} data-longa className="mt-3 min-w-0 rounded-brand border border-line bg-paper p-3 sm:p-4 md:p-5">
        <h2 className="text-body font-semibold md:text-lead">{tituloNivel}</h2>
        <div tabIndex={0} role="region" aria-label={`Tabela: ${tituloNivel}`} className="rola mt-3 max-h-[36rem] overflow-auto rounded-brand border border-line">
          <table className="w-full min-w-max text-left text-small">
            <caption className="sr-only">{tituloNivel}, em R$ milhões</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-20 min-w-[9.5rem] bg-surface px-3 py-2">{tituloNivel}</th>
                {colunas.map((c, j) => (
                  <th key={c.rotulo} scope="col" aria-sort={ordem.col === j ? (ordem.desc ? 'descending' : 'ascending') : 'none'} className="sticky top-0 z-10 whitespace-nowrap bg-surface px-3 py-2 text-right">
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
                      <th scope="row" className="sticky left-0 z-[1] min-w-[9.5rem] max-w-[11rem] whitespace-normal bg-paper px-3 py-1.5 font-normal shadow-[1px_0_0_rgb(var(--line))] md:max-w-[30rem]">
                        {uoAtiva ? (
                          <><span className="block font-semibold">{u.rotulo}</span><span className="text-ink-soft">{u.sub}</span></>
                        ) : (
                          <button type="button" aria-expanded={abre} onClick={() => setAberta(abre ? null : u.chave)} className="text-left font-semibold text-navy underline-offset-4 hover:underline">
                            <span aria-hidden="true">{abre ? '− ' : '+ '}</span>{u.rotulo}<span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{u.chave}</span>
                          </button>
                        )}
                      </th>
                      {celulas(u.v)}
                    </tr>
                    {abre && filhos(u.chave).map((a) => (
                      <tr key={a.chave} className="border-t border-line bg-surface align-top">
                        <th scope="row" className="sticky left-0 z-[1] min-w-[9.5rem] max-w-[11rem] whitespace-normal bg-surface px-3 py-1.5 pl-6 font-normal shadow-[1px_0_0_rgb(var(--line))] md:max-w-[30rem] md:pl-8"><span className="block">{a.rotulo}</span><span className="text-ink-soft">{a.chave.split('|')[2]} · programa {a.chave.split('|')[1]}</span></th>
                        {celulas(a.v)}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-line bg-surface font-semibold">
              <tr><th scope="row" className="sticky left-0 bg-surface px-3 py-1.5">Total ({linhasTabela.length})</th>{celulas(tot)}</tr>
            </tfoot>
          </table>
        </div>
      </section>

          </>
        )}
        {aba === 'fontes' && (
          <>
            <div className="print:hidden">{filtros}</div>
            {/* totais do recorte, numa linha */}
      <Faixa itens={resumo} nota="Tabelas em R$ milhões, arredondadas; valores correntes." />

            <div className="mt-3 space-y-3">
              <Cartao titulo="Grupo de despesa">
                <TabelaDelta itens={porGnd} delta={(i) => i.v[PLOA] - i.v[ATU]} rotuloBarra="Grupo|PLOA 2027 menos atualizada 2026" primeira={nomeItem}
                  legenda="Por grupo de natureza da despesa, em R$ milhões" colunas={colsDelta} />
              </Cartao>
              <Cartao titulo="Fontes de recursos: 12 maiores">
                <TabelaDelta itens={porFonte} delta={(i) => i.v[PLOA] - i.v[ATU]} rotuloBarra="Fonte|PLOA 2027 menos atualizada 2026" primeira={nomeItem}
                  legenda="Doze maiores fontes de recursos, em R$ milhões" colunas={colsDelta} />
              </Cartao>
            </div>
            <div className="mt-6"><CoberturaFontes dados={receitaMes} linhas={linhas} nomesFonte={nomes.fonte} /></div>
          </>
        )}
        {aba === 'atencao' && (
          <>
            <div className="print:hidden">{filtros}</div>
            {/* alertas */}
      <section aria-label="Pontos de atenção" className="mt-4 min-w-0 rounded-brand border border-line bg-paper p-3 sm:p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-body font-semibold md:text-lead">Pontos de atenção</h2>
          <div role="group" aria-label="Tipo de ponto de atenção" className="flex w-full flex-col divide-y divide-line overflow-hidden rounded-brand border border-line text-small sm:inline-flex sm:w-auto sm:flex-row sm:divide-x sm:divide-y-0">
            {([['abaixo', 'PLOA abaixo do empenhado 26'], ['novas', 'Ações novas'], ['extintas', 'Sem dotação na PLOA']] as [Alerta, string][]).map(([v, r]) => (
              <button key={v} type="button" aria-pressed={alerta === v} onClick={() => setAlerta(v)} className={`px-3 py-2 text-left sm:py-1.5 sm:text-center ${alerta === v ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>
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
              { rotulo: 'Ação', valor: (i) => <><span className="line-clamp-3 font-medium text-ink md:line-clamp-none">{i.rotulo}</span><span className="block text-label normal-case tracking-normal text-ink-soft">{i.sub}</span></> },
              { rotulo: 'PLOA 27', valor: (i) => mi(i.v[PLOA]) },
              { rotulo: 'Atual. 26', valor: (i) => mi(i.v[ATU]) },
              { rotulo: 'Emp. 26', valor: (i) => mi(i.v[EMP]) },
              { rotulo: alerta === 'abaixo' ? 'Emp. − PLOA' : 'Δ R$ mi', valor: (i) => (alerta === 'abaixo' ? mi(i.v[EMP] - i.v[PLOA]) : dMi(i.v[PLOA] - i.v[ATU])) },
            ]}
          />
        </div>
      </section>

          </>
        )}
      </div>

      <p className="mt-4 text-small text-ink-soft print:mt-2">
        {aba === 'despesa' || aba === 'fontes' || aba === 'atencao' ? <>Fonte: Portal de Dados Abertos do ES (2025 e 2026, coleta em {coleta}); PLOA 2027: Mensagem nº 189/2026, proposta e não a LOA. Δ = PLOA 2027 menos atualizada 2026.<br /></> : null}
        <span className="print:hidden">{IDENTIDADE.aviso}</span>
      </p>
    </div>
  )

  function celulas(v: Soma) {
    const ex = execucaoPct(v)
    const dv = variacaoPct(v)
    return (
      <>
        <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums">{mi(v[PLOA])}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{mi(v[INI])}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{mi(v[ATU])}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{mi(v[EMP])}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{ex === null ? '–' : `${numero(ex, 0)}%`}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{dMi(v[PLOA] - v[ATU])}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{dPct(dv)}</td>
      </>
    )
  }
}
