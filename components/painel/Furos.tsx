'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'
import { ATU, EMP, EMP25, PLOA, agrupa, titulo, type Linha } from './dados'
import { projecaoItens, type DadosReceita } from './projecao'

type Nomes = { uo: Record<string, string>; acao: Record<string, string> }
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const dMi = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${milhoes(Math.abs(x), 0)}`
const LIMIAR = 20e6

type Acao = { chave: string; uo: string; acao: string; nome: string; unidade: string; gnd: string; v: number[]; tipo: string }

/**
 * Consistência da PLOA: despesa abaixo do já executado, aumentos sobre o executado e receita contra a projeção.
 * O orçamento é equilibrado por construção: se a receita é realista no total, cada corte abaixo do ritmo coexiste com um aumento em outro lugar.
 * Aqui os dois lados são postos lado a lado para a leitura, sem concluir qual aumento é "menos necessário": isso é julgamento de quem decide.
 */
export function Furos({ linhas, nomes, dados, receita, ipca, pib }: { linhas: Linha[]; nomes: Nomes; dados: DadosReceita; receita: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number> }) {
  const acoes = useMemo<Acao[]>(() => {
    const porAcao = agrupa(linhas, (l) => `${l[0]}|${l[2]}`)
    // GND predominante (maior PLOA, ou maior atualizada) de cada ação
    const gnd = new Map<string, Map<string, number>>()
    for (const l of linhas) {
      const k = `${l[0]}|${l[2]}`
      const m = gnd.get(k) ?? new Map()
      m.set(l[3], (m.get(l[3]) ?? 0) + Math.max(l[5], l[7]))
      gnd.set(k, m)
    }
    return [...porAcao].map(([k, v]) => {
      const [uo, acao] = k.split('|')
      const g = [...(gnd.get(k) ?? new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      const nome = nomes.acao[acao] ?? acao
      const tipo = /^RESERVA/i.test(nome) ? 'Reserva' : g === '1' ? 'Pessoal' : g === '4' ? 'Investimento' : g === '5' || g === '6' || g === '2' ? 'Dívida e financeiras' : 'Custeio'
      return { chave: k, uo, acao, nome: titulo(nome), unidade: titulo(nomes.uo[uo] ?? uo), gnd: g, v: v as unknown as number[], tipo }
    })
  }, [linhas, nomes])

  /* despesa abaixo do ritmo: ação recorrente (empenhada em 2025 e em 2026, sem ser rampa nova) com PLOA abaixo do já empenhado em 2026 */
  const abaixo = useMemo(() => acoes
    .filter((a) => a.v[EMP25] > 0 && a.v[EMP] > 0 && a.v[EMP25] >= 0.5 * a.v[EMP] && a.v[EMP] - a.v[PLOA] >= LIMIAR)
    .map((a) => ({ ...a, gap: a.v[EMP] - a.v[PLOA] }))
    .sort((a, b) => b.gap - a.gap), [acoes])
  /* obras e outros investimentos acabam por desenho: ficam fora da lista principal e entram só na soma */
  const cortes = useMemo(() => abaixo.filter((a) => a.tipo !== 'Investimento'), [abaixo])
  const gapInvest = abaixo.filter((a) => a.tipo === 'Investimento').reduce((s, a) => s + a.gap, 0)
  const totalCortes = cortes.reduce((s, a) => s + a.gap, 0)
  const porUnidade = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of cortes) m.set(a.unidade, (m.get(a.unidade) ?? 0) + a.gap)
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [cortes])

  /* aumentos acima do executado e da dotação atualizada */
  const aumentos = useMemo(() => acoes
    .filter((a) => a.v[PLOA] - Math.max(a.v[EMP], a.v[ATU]) >= LIMIAR)
    .map((a) => ({ ...a, gap: a.v[PLOA] - Math.max(a.v[EMP], a.v[ATU]) }))
    .sort((a, b) => b.gap - a.gap), [acoes])
  const totalAumentos = aumentos.reduce((s, a) => s + a.gap, 0)
  const porTipo = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of aumentos) m.set(a.tipo, (m.get(a.tipo) ?? 0) + a.gap)
    return [...m].sort((a, b) => b[1] - a[1])
  }, [aumentos])

  /* receita: linhas da PLOA acima ou abaixo do que o ritmo de 2026 daria, crescendo com inflação e PIB do Focus */
  const g27 = (1 + ipca['2027']) * (1 + pib['2027']) - 1
  const linhasReceita = useMemo(() => {
    const R = Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>
    const proj = projecaoItens(dados)
    const soma = (...c: string[]) => c.reduce((s, k) => s + R[k][5], 0)
    const defs: [string, string, number][] = [
      ['icms', 'ICMS', soma('icms')], ['ipva', 'IPVA', soma('ipva')], ['irrf', 'IRRF', soma('irrf')], ['itcd', 'ITCD', soma('itcd')],
      ['taxas', 'Taxas', soma('taxas', 'contrib_melhoria')], ['contrib', 'Contribuições', soma('contribuicoes')], ['patrim', 'Receita patrimonial', soma('patrimonial')],
      ['tuniao', 'Transferências da União', soma('transf_corr_uniao')], ['toutras', 'Outras transferências correntes', soma('transf_corr_outras')],
      ['demais', 'Demais receitas correntes', soma('agropecuaria', 'industrial', 'servicos', 'outras_correntes')], ['intra', 'Correntes intraorçamentárias', soma('intra')],
      ['cred', 'Operações de crédito', soma('operacoes_credito')], ['capout', 'Demais receitas de capital', soma('alienacao', 'amortizacao_emprestimos', 'transf_capital', 'outras_capital')],
    ]
    return defs.map(([id, rotulo, ploa]) => {
      const p = proj[id]
      return { chave: id, rotulo, ploa, proj26: p.central, esperado: p.central * (1 + g27), excesso: ploa - p.central * (1 + g27) }
    }).sort((a, b) => b.excesso - a.excesso)
  }, [receita, dados, g27])
  const receitaEsticada = linhasReceita.filter((l) => l.excesso > 0).reduce((s, l) => s + l.excesso, 0)
  const receitaConservadora = linhasReceita.filter((l) => l.excesso < 0).reduce((s, l) => s + l.excesso, 0)

  return (
    <div className="space-y-3">
      <Cartao titulo="Consistência da PLOA 2027: despesa e receita">
        <Nota titulo="Notas"><p>
          Despesa: {cortes.length} ações recorrentes (custeio, pessoal e operações financeiras, empenhadas em 2025 e em 2026) têm na PLOA 2027 R$ {numero(totalCortes / 1e9, 1)} bi a menos do que o empenhado em 2026 até a data da coleta (saúde R$ {mi(cortes.filter((a) => a.unidade.toLowerCase().includes('saúde')).reduce((t, a) => t + a.gap, 0))} milhões); investimentos (R$ {numero(gapInvest / 1e9, 1)} bi) ficam fora da lista por terminarem. A maior parte está em {porUnidade.map(([u, v]) => `${u} (R$ ${mi(v)} mi)`).join(', ')}. O empenho de 2026 não está fechado.
        </p>
          <p>
            Aumentos: {aumentos.length} ações crescem R$ {numero(totalAumentos / 1e9, 1)} bi sobre o maior valor entre o empenhado e a dotação atualizada de 2026 ({porTipo.map(([t, v]) => `${t.toLowerCase()} R$ ${numero(v / 1e9, 1)} bi`).join('; ')}); as reservas (R$ {numero((porTipo.find(([t]) => t === 'Reserva')?.[1] ?? 0) / 1e9, 1)} bi) são dotação sem destino específico.
          </p>
          <p>
            Receita: as linhas acima da projeção somam R$ {numero(receitaEsticada / 1e9, 1)} bi (operações de crédito e ICMS) e as abaixo, R$ {numero(Math.abs(receitaConservadora) / 1e9, 1)} bi (transferências da União, petróleo). Em 2025 e 2026 a dotação inicial ficou abaixo do executado em custeio e investimentos e foi complementada por créditos adicionais, em boa parte com as reservas (contingência e pessoal).
          </p>
        </Nota>

        <h3 className="mt-5 text-body font-semibold">Despesa recorrente com PLOA abaixo do empenhado de 2026</h3>
        <div className="mt-2">
          <TabelaItens altura="livre" itens={cortes.slice(0, 15)} legenda="Ações recorrentes com PLOA abaixo do empenhado de 2026, em R$ milhões" colunas={[
            { rotulo: 'Ação', valor: (a) => <><span className="block font-medium text-ink">{a.nome}</span><span className="block text-label normal-case tracking-normal text-ink-soft">{a.unidade} · {a.acao}</span></> },
            { rotulo: 'Empenhado 25', valor: (a) => mi(a.v[EMP25]) },
            { rotulo: 'Empenhado 26', valor: (a) => mi(a.v[EMP]) },
            { rotulo: 'PLOA 27', valor: (a) => <span className="font-semibold">{mi(a.v[PLOA])}</span> },
            { rotulo: 'Diferença', valor: (a) => <span className="font-semibold text-serie2">{mi(a.gap)}</span> },
            { rotulo: '% do empenhado', valor: (a) => fmtPct(((a.v[PLOA] / a.v[EMP]) - 1) * 100, 0) },
          ]} />
        </div>

        <h3 className="mt-5 text-body font-semibold">Aumentos acima do executado e da dotação atualizada de 2026</h3>
        <div className="mt-2">
          <TabelaItens altura="livre" itens={aumentos.slice(0, 15)} legenda="Ações com maior aumento da PLOA sobre o empenhado e a dotação atualizada de 2026, em R$ milhões" colunas={[
            { rotulo: 'Ação', valor: (a) => <><span className="block font-medium text-ink">{a.nome}</span><span className="block text-label normal-case tracking-normal text-ink-soft">{a.unidade} · {a.acao}</span></> },
            { rotulo: 'Tipo', valor: (a) => a.tipo },
            { rotulo: 'Empenhado 26', valor: (a) => mi(a.v[EMP]) },
            { rotulo: 'Atualizada 26', valor: (a) => mi(a.v[ATU]) },
            { rotulo: 'PLOA 27', valor: (a) => <span className="font-semibold">{mi(a.v[PLOA])}</span> },
            { rotulo: 'Diferença', valor: (a) => <span className="font-semibold">{dMi(a.gap)}</span> },
          ]} />
        </div>

        <h3 className="mt-5 text-body font-semibold">Receita: PLOA 2027 e projeção por linha</h3>
        <Nota titulo="Notas"><p>
          Projeção 2027: fechamento projetado de 2026 corrigido por IPCA e PIB real (Focus, {fmtPct(g27 * 100)}). Positivo: PLOA acima da projeção; negativo: abaixo. Operações de crédito e receitas de capital dependem de contratação e de eventos pontuais. Detalhes na aba Método e fontes.
        </p></Nota>
        <div className="mt-2">
          <TabelaItens altura="livre" itens={linhasReceita} legenda="Receita da PLOA 2027 contra o ritmo de 2026 com crescimento do Focus, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões (bruto)', valor: (l) => l.rotulo },
            { rotulo: 'Projeção 2026', valor: (l) => mi(l.proj26) },
            { rotulo: 'Projeção 2027', valor: (l) => mi(l.esperado) },
            { rotulo: 'PLOA 2027', valor: (l) => <span className="font-semibold">{mi(l.ploa)}</span> },
            { rotulo: 'PLOA menos projeção', valor: (l) => <span className={`font-semibold ${l.excesso > 0 ? 'text-ink' : 'text-ink-soft'}`}>{dMi(l.excesso)}</span> },
          ]} />
          
        </div>
      </Cartao>
    </div>
  )
}
