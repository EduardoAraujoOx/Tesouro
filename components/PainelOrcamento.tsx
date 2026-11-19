'use client'

import { Fragment, useId, useMemo, useState } from 'react'
import { milhoes, numero, pct } from '@/lib/formato'
import type { AcaoPainel } from '@/lib/orcamento'

type Escopo = 'todos' | 'executivo' | 'outros'
type Coluna = 'nome' | 'ploa' | 'inicial' | 'atualizada' | 'empenhado' | 'razao'

type Props = {
  acoes: AcaoPainel[]
  nomesUo: Record<string, string>
  nomesPrograma: Record<string, string>
  outrosPoderes: string[]
  /** fração do ano já transcorrida na data da coleta, para ler o empenhado de 2026 */
  fracaoAno: number
  dataColeta: string
}

type Linha = { chave: string; nome: string; v: [number, number, number, number]; n: number }

const soma = (a: AcaoPainel[], i: number) => a.reduce((s, x) => s + x.v[i], 0)

export function PainelOrcamento({ acoes, nomesUo, nomesPrograma, outrosPoderes, fracaoAno, dataColeta }: Props) {
  const idBusca = useId()
  const [escopo, setEscopo] = useState<Escopo>('executivo')
  const [busca, setBusca] = useState('')
  const [coluna, setColuna] = useState<Coluna>('ploa')
  const [desc, setDesc] = useState(true)
  const [aberta, setAberta] = useState<string | null>(null)
  const outros = useMemo(() => new Set(outrosPoderes), [outrosPoderes])

  const filtradas = useMemo(
    () => acoes.filter((a) => (escopo === 'todos' ? true : escopo === 'outros' ? outros.has(a.uo.slice(0, 2)) : !outros.has(a.uo.slice(0, 2)))),
    [acoes, escopo, outros],
  )

  const unidades = useMemo<Linha[]>(() => {
    const m = new Map<string, AcaoPainel[]>()
    for (const a of filtradas) m.set(a.uo, [...(m.get(a.uo) ?? []), a])
    return [...m.entries()].map(([uo, as]) => ({ chave: uo, nome: nomesUo[uo] ?? uo, v: [soma(as, 0), soma(as, 1), soma(as, 2), soma(as, 3)], n: as.length }))
  }, [filtradas, nomesUo])

  const razao = (l: { v: number[] }) => (l.v[2] > 0 ? l.v[0] / l.v[2] : null)
  const valor = (l: Linha | AcaoPainel, c: Coluna): number | string => {
    const v = 'chave' in l ? l.v : [l.v[0], l.v[1], l.v[2], l.v[3]]
    const nome = 'chave' in l ? l.nome : l.nome
    switch (c) {
      case 'nome': return nome
      case 'ploa': return v[0]
      case 'inicial': return v[1]
      case 'atualizada': return v[2]
      case 'empenhado': return v[3]
      case 'razao': return v[2] > 0 ? v[0] / v[2] : -1
    }
  }
  const ordena = <T extends Linha | AcaoPainel>(xs: T[]) =>
    [...xs].sort((x, y) => {
      const a = valor(x, coluna), b = valor(y, coluna)
      const r = typeof a === 'string' ? a.localeCompare(b as string, 'pt-BR') : (a as number) - (b as number)
      return desc ? -r : r
    })

  const termo = busca.trim().toLowerCase()
  const visiveis = ordena(unidades.filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.chave.includes(termo) || filtradas.some((a) => a.uo === u.chave && (a.nome.toLowerCase().includes(termo) || a.acao.includes(termo)))))

  const total = { ploa: soma(filtradas, 0), inicial: soma(filtradas, 1), atualizada: soma(filtradas, 2), empenhado: soma(filtradas, 3) }

  const cab = (c: Coluna, rotulo: string, alinha = 'text-right') => (
    <th scope="col" aria-sort={coluna === c ? (desc ? 'descending' : 'ascending') : 'none'} className={`px-3 py-2 ${alinha}`}>
      <button
        type="button"
        onClick={() => { if (coluna === c) setDesc(!desc); else { setColuna(c); setDesc(c !== 'nome') } }}
        className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
      >
        {rotulo}
        <span aria-hidden="true" className="text-ink-soft">{coluna === c ? (desc ? '▼' : '▲') : ''}</span>
      </button>
    </th>
  )

  const variacao = (a: number, b: number) => (b > 0 ? pct(((a - b) / b) * 100) : 'novo')

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <fieldset>
          <legend className="text-small font-semibold">Quem aparece</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {([['executivo', 'Poder Executivo'], ['outros', 'Outros Poderes e órgãos autônomos'], ['todos', 'Todos']] as [Escopo, string][]).map(([v, r]) => (
              <label key={v} className={`cursor-pointer rounded-brand border px-3 py-1.5 text-small ${escopo === v ? 'border-navy bg-navy text-on-navy' : 'border-line bg-paper'}`}>
                <input type="radio" name="escopo" value={v} checked={escopo === v} onChange={() => { setEscopo(v); setAberta(null) }} className="sr-only" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="min-w-[14rem] flex-1">
          <label htmlFor={idBusca} className="text-small font-semibold">Buscar unidade ou ação</label>
          <input id={idBusca} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: saúde, 2095, sentenças"
            className="mt-1 block w-full rounded-brand border border-line bg-paper px-3 py-2 text-body" />
        </div>
      </div>

      <div tabIndex={0} role="region" aria-label="Tabela de unidades orçamentárias e suas ações" className="mt-5 overflow-x-auto rounded-brand border border-line">
        <table className="w-full min-w-[46rem] text-left text-small">
          <caption className="sr-only">Unidades orçamentárias: dotação de 2026, execução de 2026 até {dataColeta} e proposta de 2027, em R$ milhões. Use o botão da unidade para ver as ações.</caption>
          <thead className="bg-surface">
            <tr>
              {cab('nome', 'Unidade orçamentária', 'text-left')}
              {cab('ploa', 'PLOA 2027')}
              {cab('inicial', 'Inicial 2026')}
              {cab('atualizada', 'Atualizada 2026')}
              {cab('empenhado', 'Empenhado 2026')}
              {cab('razao', 'PLOA ÷ atualizada')}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((u) => {
              const as = ordena(filtradas.filter((a) => a.uo === u.chave && (!termo || u.nome.toLowerCase().includes(termo) || u.chave.includes(termo) || a.nome.toLowerCase().includes(termo) || a.acao.includes(termo))))
              const r = razao(u)
              const abre = aberta === u.chave
              return (
                <Fragment key={u.chave}>
                  <tr className="border-t border-line align-top">
                    <th scope="row" className="px-3 py-2 font-normal">
                      <button type="button" aria-expanded={abre} onClick={() => setAberta(abre ? null : u.chave)} className="text-left font-semibold text-navy underline-offset-4 hover:underline">
                        <span aria-hidden="true">{abre ? '− ' : '+ '}</span>{u.nome}
                      </button>
                      <span className="ml-2 text-ink-soft">{u.chave} · {u.n} {u.n === 1 ? 'ação' : 'ações'}</span>
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">{milhoes(u.v[0])}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{milhoes(u.v[1])}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{milhoes(u.v[2])}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{milhoes(u.v[3])}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r === null ? 'sem base' : pct(r * 100, 0)}</td>
                  </tr>
                  {abre && as.map((a) => {
                    const ra = a.v[2] > 0 ? a.v[0] / a.v[2] : null
                    return (
                      <tr key={`${a.programa}-${a.acao}`} className="border-t border-line bg-surface/60 align-top">
                        <th scope="row" className="px-3 py-1.5 pl-8 font-normal">
                          <span className="block">{a.nome || a.acao}</span>
                          <span className="text-ink-soft">ação {a.acao} · programa {a.programa}{nomesPrograma[a.programa] ? `, ${nomesPrograma[a.programa].toLowerCase()}` : ''}
                            {!a.emPloa ? ' · sem dotação na PLOA' : !a.em2026 ? ' · ação nova em 2027' : a.antiga ? ` · em 2026, ação ${a.antiga}` : ''}</span>
                        </th>
                        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(a.v[0])}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(a.v[1])}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(a.v[2])}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{milhoes(a.v[3])}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{ra === null ? 'sem base' : pct(ra * 100, 0)}</td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-line bg-surface font-semibold">
            <tr>
              <th scope="row" className="px-3 py-2">Total do recorte ({visiveis.length} unidades)</th>
              <td className="px-3 py-2 text-right tabular-nums">{milhoes(total.ploa)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{milhoes(total.inicial)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{milhoes(total.atualizada)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{milhoes(total.empenhado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{total.atualizada > 0 ? pct((total.ploa / total.atualizada) * 100, 0) : 'sem base'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-small text-ink-soft">
        Valores em R$ milhões, correntes. O empenhado de 2026 é o acumulado até {dataColeta} (cerca de {numero(fracaoAno * 100, 0)}% do ano) e, por isso, ainda não é o realizado do exercício.
        A variação da PLOA sobre a dotação atualizada de 2026 no recorte é de {variacao(total.ploa, total.atualizada)}; sobre a inicial, de {variacao(total.ploa, total.inicial)}.
      </p>
    </div>
  )
}
