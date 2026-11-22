'use client'

import { useMemo } from 'react'
import { milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { projecaoItens, projetaDespesa2026, type DadosReceita } from './projecao'

/** Por ano: dotação inicial da LOA (receita estimada e despesa fixada coincidem, pois a lei é aprovada equilibrada) e despesa empenhada, em R$. */
export type LoaAnual = Record<string, { inicial: number; empenhado: number }>
/** Arrecadação líquida de deduções por ano, em R$, dos anos que os quadros da PLOA não cobrem. */
export type ReceitaAnual = Record<string, number>

const mi = (x: number) => milhoes(x, 0)
const pc = (x: number) => `${numero(x, 1)}%`
const dif = (x: number) => (Math.abs(x) < 0.5e6 ? '0' : `${x > 0 ? '+' : '−'}${milhoes(Math.abs(x), 0)}`)

type Linha = { chave: string; rotulo: string; loa?: number; real?: number; pct: number; projecao?: boolean; media?: boolean }

function Tabela({ titulo, rotuloReal, linhas }: { titulo: string; rotuloReal: string; linhas: Linha[] }) {
  const espaco = 'px-1.5 sm:px-2 md:px-3'
  const th = `${espaco} whitespace-nowrap py-2 text-right font-semibold`
  const td = `${espaco} whitespace-nowrap py-1.5 text-right tabular-nums print:py-0.5`
  const legenda = `${titulo}: LOA e ${rotuloReal.toLowerCase()} por ano, em R$ milhões`
  return (
    <Cartao titulo={titulo}>
      <div className="painel-orcado">
        <div className="painel-orcado-colunas hidden overflow-hidden break-normal rounded-brand border border-line print:block">
          <table className="w-full text-left text-small">
            <caption className="sr-only">{legenda}</caption>
            <thead>
              <tr className="bg-surface">
                <th scope="col" className={`${espaco} whitespace-nowrap py-2 font-semibold`}>R$ milhões</th>
                <th scope="col" className={th}>LOA</th>
                <th scope="col" className={th}>{rotuloReal}</th>
                <th scope="col" className={`${th} painel-orcado-diferenca hidden md:table-cell`}>Diferença</th>
                <th scope="col" className={th}>% da LOA</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} className={`border-t border-line ${l.media ? 'bg-surface/60' : ''}`}>
                  <th scope="row" className={`${espaco} py-1.5 print:py-0.5 ${l.media ? 'font-semibold' : l.projecao ? 'font-normal text-ink-soft' : 'font-normal'}`}>{l.rotulo}</th>
                  <td className={td}>{l.loa === undefined ? '' : mi(l.loa)}</td>
                  <td className={`${td} ${l.projecao ? 'text-ink-soft' : ''}`}>{l.real === undefined ? '' : mi(l.real)}</td>
                  <td className={`${td} painel-orcado-diferenca hidden md:table-cell`}>{l.loa === undefined || l.real === undefined ? '' : dif(l.real - l.loa)}</td>
                  <td className={`${td} ${l.media || !l.projecao ? 'font-semibold' : 'text-ink-soft'}`}>{pc(l.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="painel-orcado-linhas mb-1 text-small text-ink-soft print:hidden">Valores em R$ milhões</p>
        <ul role="list" aria-label={legenda} className="painel-orcado-linhas divide-y divide-line rounded-brand border border-line text-small print:hidden">
          {linhas.map((l) => (
            <li key={l.chave} className={`px-2.5 py-2 ${l.media ? 'bg-surface/60' : ''}`}>
              <p className={`font-semibold ${l.projecao ? 'text-ink-soft' : ''}`}>{l.rotulo}</p>
              <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
                {l.loa !== undefined && (
                  <div className="min-w-max flex-1">
                    <dt className="text-label tracking-normal text-ink-soft">LOA</dt>
                    <dd className="whitespace-nowrap">{mi(l.loa)}</dd>
                  </div>
                )}
                {l.real !== undefined && (
                  <div className="min-w-max flex-1">
                    <dt className="text-label tracking-normal text-ink-soft">{rotuloReal}</dt>
                    <dd className="whitespace-nowrap">{mi(l.real)}</dd>
                  </div>
                )}
                <div className="min-w-max flex-1">
                  <dt className="text-label tracking-normal text-ink-soft">% da LOA</dt>
                  <dd className="whitespace-nowrap font-semibold">{pc(l.pct)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </Cartao>
  )
}

/**
 * Orçado e executado ano a ano: receita estimada na LOA contra a arrecadação, e despesa fixada na LOA contra a empenhada, com a relação em
 * percentual. Receita: arrecadação líquida das deduções (com intraorçamentárias); 2023 a 2025 são os valores do resultado orçamentário e os
 * anos anteriores vêm da arrecadação do Portal. 2026 é a projeção da equipe. Sem inferência para 2027: só a média, como informação.
 */
export function OrcadoExecutado({ receita, dados, loa, receitaAnual }: { receita: LinhaMacro[]; dados: DadosReceita; loa: LoaAnual; receitaAnual: ReceitaAnual }) {
  const { rec, desp, de, ate } = useMemo(() => {
    const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
    const it = projecaoItens(dados)
    const proj = projetaDespesa2026()
    const rec26 = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais', 'intra', 'ded', 'cap'].reduce((t, c) => t + it[c].central, 0)
    const desp26 = proj.itens.corr.central + proj.itens.capd.central
    /* receita realizada: quadros da PLOA para 2023 a 2025; arrecadação do Portal para os anos anteriores */
    const recReal: Record<string, number> = { ...receitaAnual, '2023': R.total[0], '2024': R.total[1], '2025': R.total[2] }
    const anos = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'].filter((a) => loa[a] && recReal[a])
    const monta = (real: (a: string) => number, proj26: number): { linhas: Linha[]; med: Linha[] } => {
      const base: Linha[] = anos.map((a) => ({ chave: a, rotulo: a, loa: loa[a].inicial, real: real(a), pct: (real(a) / loa[a].inicial) * 100 }))
      const media = (ls: Linha[], rotulo: string, chave: string): Linha => ({ chave, rotulo, pct: ls.reduce((t, l) => t + l.pct, 0) / ls.length, media: true })
      const ult4 = base.slice(-4)
      return {
        linhas: [...base, { chave: '2026', rotulo: '2026 proj.', loa: loa['2026'].inicial, real: proj26, pct: (proj26 / loa['2026'].inicial) * 100, projecao: true }],
        med: [media(base, `Média ${anos[0]}–${anos[anos.length - 1]}`, 'm-todos'), ...(base.length > 4 ? [media(ult4, `Média ${ult4[0].chave}–${ult4[ult4.length - 1].chave}`, 'm-ult')] : [])],
      }
    }
    const r = monta((a) => recReal[a], rec26)
    const d = monta((a) => loa[a].empenhado, desp26)
    return { rec: [...r.linhas, ...r.med], desp: [...d.linhas, ...d.med], anosMedia: anos, de: anos[0], ate: anos[anos.length - 1] }
  }, [receita, dados, loa, receitaAnual])

  return (
    <div className="space-y-3">
      <div className="space-y-3 print:space-y-2">
        <Tabela titulo="Receita total, líquida de deduções" rotuloReal="Realizada" linhas={rec} />
        <Tabela titulo="Despesa total" rotuloReal="Empenhada" linhas={desp} />
      </div>
      <Nota titulo="Como foi calculado" larga>
        <p>
          A LOA é a lei orçamentária anual aprovada, antes de qualquer alteração. Receita estimada e despesa fixada coincidem em cada ano, porque a lei é aprovada equilibrada, e a despesa fixada inclui as reservas de RPPS e de contingência. A receita realizada é a arrecadação líquida das deduções (transferências a municípios e Fundeb), com as intraorçamentárias e as operações de crédito, e a despesa é a empenhada no ano. De {de} a {ate}, o orçamento é o mesmo em que o painel mede a PLOA 2027; os valores de 2023 a 2025 são os do quadro Resultado. A linha de 2026 é a projeção da equipe e fica fora das médias. A média é simples, dos percentuais de {de} a {ate}.
        </p>
      </Nota>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: Portal de Dados Abertos do ES (Despesas: dotação inicial e empenhado; Receitas: arrecadação); PLOA 2027 (Mensagem nº 189/2026, evolução da receita e da despesa).</p>
    </div>
  )
}
