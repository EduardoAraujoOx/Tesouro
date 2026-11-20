'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR, TabelaItens } from './Graficos'
import { ColunasAnuais, fmtPct, type ColunaAnual } from './GraficosMacro'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { COD_DESPESA, COD_GRUPO } from './codigos'
import { fatorPrecos, ipcaAnual, pibArrecadacao, projecaoItens, projetaDespesa2026, projetaReceita2026, type DadosReceita, type ItemProjetado } from './projecao'

type Vista = 'receita' | 'despesa' | 'resultado'
const VISTAS: { id: Vista; rotulo: string }[] = [
  { id: 'receita', rotulo: 'Receita' },
  { id: 'despesa', rotulo: 'Despesa' },
  { id: 'resultado', rotulo: 'Resultado' },
]
const ANOS = ['2023', '2024', '2025', 'Provável 26 (PLOA)', '2027'] as const
/** posição de cada coluna acima nos seis valores dos quadros da PLOA: 2023, 2024, 2025, orçamento 2026, provável 2026, 2027 */
const COL = [0, 1, 2, 4, 5]

const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const neg = (x: number) => (x === 0 ? 0 : -x)
const dMi = (x: number) => `${sinal(x)}${milhoes(Math.abs(x), 0)}`

type Linha = { chave: string; rotulo: string; nivel: number; negrito?: boolean; v: number[]; proj?: ItemProjetado; pai?: string }
/** linhas cuja referência de 2027 não cresce com a economia: dependem de contratação e de decisões pontuais */
const SEM_CRESCIMENTO = new Set(['cap', 'cred', 'capout'])
/** diferença (em %) a partir da qual a PLOA é dita acima ou abaixo da referência */
const DIF_MIN = 3
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const corDif = (d: number) => (Math.abs(d) < DIF_MIN ? '' : d > 0 ? 'text-serie3' : 'text-serie2')

export function VisaoGeral({ receita, despesa, ipca: ipcaParams, pib, fonteIpca, dados, irParaMetodo }: {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; fonteIpca: string; dados: DadosReceita; irParaMetodo: () => void
}) {
  const [vista, setVista] = useState<Vista>('receita')
  const [abertos, setAbertos] = useState<Set<string>>(new Set(['corr', 'capd']))
  const [base, setBase] = useState<'nominal' | 'real'>('nominal')
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const ipca = useMemo(() => ipcaAnual(Object.fromEntries(Object.entries(ipcaParams).map(([a, v]) => [a, v]))), [ipcaParams])
  const i27 = ipca[2027]
  const g27 = (1 + i27) * (1 + (pib['2027'] ?? 0)) - 1
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const itensProj = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])
  const pibA = useMemo(() => pibArrecadacao(), [])
  const pick = (m: Record<string, number[]>, ...ch: string[]) => COL.map((c) => ch.reduce((s, k) => s + m[k][c], 0))
  const soma = (...a: number[][]) => COL.map((_, j) => a.reduce((s, x) => s + x[j], 0))

  /* receita corrente líquida aproximada (correntes + intra − deduções), base dos indicadores */
  const rcl = soma(pick(R, 'receitas_correntes'), pick(R, 'intra'), pick(R, 'deducoes'))
  const reservas = pick(D, 'reserva_rpps', 'reserva_contingencia')

  /* ---------- quadro de grandes grupos: poucos grupos, detalhe sob demanda ---------- */
  const linhasReceita: Linha[] = [
    { chave: 'imp', rotulo: 'Impostos', nivel: 0, v: pick(R, 'impostos') },
    { chave: 'icms', rotulo: 'ICMS', nivel: 1, pai: 'imp', v: pick(R, 'icms') },
    { chave: 'ipva', rotulo: 'IPVA', nivel: 1, pai: 'imp', v: pick(R, 'ipva') },
    { chave: 'irrf', rotulo: 'IRRF', nivel: 1, pai: 'imp', v: pick(R, 'irrf') },
    { chave: 'itcd', rotulo: 'ITCD', nivel: 1, pai: 'imp', v: pick(R, 'itcd') },
    { chave: 'taxas', rotulo: 'Taxas', nivel: 0, v: pick(R, 'taxas', 'contrib_melhoria') },
    { chave: 'contrib', rotulo: 'Contribuições', nivel: 0, v: pick(R, 'contribuicoes') },
    { chave: 'patrim', rotulo: 'Receita patrimonial', nivel: 0, v: pick(R, 'patrimonial') },
    { chave: 'transf', rotulo: 'Transferências correntes', nivel: 0, v: pick(R, 'transf_correntes') },
    { chave: 'tuniao', rotulo: 'da União', nivel: 1, pai: 'transf', v: pick(R, 'transf_corr_uniao') },
    { chave: 'toutras', rotulo: 'de outras origens', nivel: 1, pai: 'transf', v: pick(R, 'transf_corr_outras') },
    { chave: 'demais', rotulo: 'Demais receitas correntes', nivel: 0, v: pick(R, 'agropecuaria', 'industrial', 'servicos', 'outras_correntes') },
    { chave: 'intra', rotulo: 'Correntes intra­orçamentárias', nivel: 0, v: pick(R, 'intra') },
    { chave: 'cap', rotulo: 'Receitas de capital', nivel: 0, v: pick(R, 'receitas_capital') },
    { chave: 'cred', rotulo: 'Operações de crédito', nivel: 1, pai: 'cap', v: pick(R, 'operacoes_credito') },
    { chave: 'capout', rotulo: 'Demais de capital', nivel: 1, pai: 'cap', v: pick(R, 'alienacao', 'amortizacao_emprestimos', 'transf_capital', 'outras_capital') },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', nivel: 0, v: pick(R, 'deducoes') },
    { chave: 'liq', rotulo: 'Receita total (líquida de deduções)', nivel: 0, negrito: true, v: pick(R, 'total') },
  ]
  const linhasDespesa: Linha[] = [
    { chave: 'corr', rotulo: 'Despesas correntes', nivel: 0, v: pick(D, 'despesas_correntes') },
    { chave: 'pessoal', rotulo: 'Pessoal e encargos sociais', nivel: 1, pai: 'corr', v: pick(D, 'pessoal') },
    { chave: 'juros', rotulo: 'Juros e encargos da dívida', nivel: 1, pai: 'corr', v: pick(D, 'juros') },
    { chave: 'outras', rotulo: 'Outras despesas correntes', nivel: 1, pai: 'corr', v: pick(D, 'outras_correntes') },
    { chave: 'capd', rotulo: 'Despesas de capital', nivel: 0, v: pick(D, 'despesas_capital') },
    { chave: 'inv', rotulo: 'Investimentos', nivel: 1, pai: 'capd', v: pick(D, 'investimento') },
    { chave: 'invf', rotulo: 'Inversões financeiras', nivel: 1, pai: 'capd', v: pick(D, 'inversoes') },
    { chave: 'amort', rotulo: 'Amortização da dívida', nivel: 1, pai: 'capd', v: pick(D, 'amortizacao') },
    { chave: 'exec', rotulo: 'Despesa executável (sem reservas)', nivel: 0, negrito: true, v: pick(D, 'total').map((x, j) => x - reservas[j]) },
    { chave: 'res', rotulo: 'Reservas (RPPS e contingência)', nivel: 0, v: reservas },
  ]
  const projDe = (chave: string) => (chave === 'exec' ? projD.itens.tot : projD.itens[chave])
  const comProj: Linha[] = vista === 'receita'
    ? linhasReceita.map((l) => ({ ...l, proj: itensProj[l.chave] }))
    : linhasDespesa.map((l) => ({ ...l, proj: projDe(l.chave) }))

  /* referência de 2027, independente da PLOA: o fechamento projetado de 2026 corrigido pela inflação e pelo PIB real (receita) ou só pela inflação (despesa) */
  const refReceita = (l: Linha) => (l.proj ? (l.proj.central - (l.proj.pontual ?? 0)) * (SEM_CRESCIMENTO.has(l.chave) ? 1 : 1 + g27) : null)
  const refDe = (l: Linha): number | null => {
    if (vista === 'receita') {
      if (l.chave === 'liq') return comProj.filter((x) => x.nivel === 0 && x.chave !== 'liq').reduce((s, x) => s + (refReceita(x) ?? 0), 0)
      return refReceita(l)
    }
    if (vista === 'despesa') return l.proj && l.chave !== 'res' ? l.proj.central * (1 + i27) : null
    return null
  }
  const difPct = (l: Linha) => { const r = refDe(l); return r === null || Math.abs(r) < 1e6 ? null : (l.v[4] / r - 1) * 100 }
  const visiveis = comProj.filter((l) => !l.pai || abertos.has(l.pai))
  const alterna = (c: string) => setAbertos((a) => { const n = new Set(a); if (n.has(c)) n.delete(c); else n.add(c); return n })

  /* ---------- totais de referência para a faixa de números ---------- */
  const reservas27 = reservas[4]
  const refReceitaTotal = linhasReceita.filter((x) => x.nivel === 0 && x.chave !== 'liq').reduce((s, x) => s + (refReceita({ ...x, proj: itensProj[x.chave] }) ?? 0), 0)
  const refDespesa = projD.itens.tot.central * (1 + i27)
  /* faixa da referência: na receita, entre os dois cenários (petróleo e crédito); na despesa, a faixa sazonal da projeção corrigida pela inflação */
  const faixaRefReceita: [number, number] = [refReceitaTotal - (pibA.difDesvio / 100) * proj.central, refReceitaTotal + (pibA.difDesvio / 100) * proj.central]
  const faixaRefDespesa: [number, number] = [(projD.itens.tot.min as number) * (1 + i27), (projD.itens.tot.max as number) * (1 + i27)]

  /* ---------- gráfico anual ---------- */
  const serieTotal = vista === 'despesa' ? D.total : R.total
  const anosNum = [2023, 2024, 2025, 2026, 2027, 2027]
  /* na despesa, a barra da PLOA é a executável (sem reservas), como as demais: as reservas não são executadas */
  const ploa27 = vista === 'despesa' ? D.total[5] - reservas27 : serieTotal[5]
  const colunasBrutas: ColunaAnual[] = [
    { rotulo: '2023', v: serieTotal[0], tipo: 'real' },
    { rotulo: '2024', v: serieTotal[1], tipo: 'real' },
    { rotulo: '2025', v: serieTotal[2], tipo: 'real' },
    vista === 'despesa'
      ? { rotulo: '2026', sub: 'projeção', v: projD.itens.tot.central, tipo: 'estim', faixa: [projD.itens.tot.min as number, projD.itens.tot.max as number] }
      : { rotulo: '2026', sub: 'projeção', v: proj.central, tipo: 'estim', faixa: [proj.min, proj.max] },
    { rotulo: '2027', sub: 'PLOA', v: ploa27, tipo: 'ploa' },
    vista === 'despesa'
      ? { rotulo: '2027', sub: 'equipe', v: refDespesa, tipo: 'ref', faixa: faixaRefDespesa, compara: { v: ploa27, rotulo: 'PLOA 2027' } }
      : { rotulo: '2027', sub: 'equipe', v: refReceitaTotal, tipo: 'ref', faixa: faixaRefReceita, compara: { v: ploa27, rotulo: 'PLOA 2027' } },
  ]
  const colunas = colunasBrutas.map((c, k) => {
    if (base === 'nominal') return c
    const f = fatorPrecos(ipca, anosNum[k], 2027)
    return { ...c, v: c.v * f, faixa: c.faixa && ([c.faixa[0] * f, c.faixa[1] * f] as [number, number]), marca: c.marca && { ...c.marca, v: c.marca.v * f }, compara: c.compara && { ...c.compara, v: c.compara.v * f } }
  })
  const proj26 = colunasBrutas[3].v
  const nomeCorteDesp = MESES_NOME[projD.bimestre * 2 - 1]
  const nomeCorte = MESES_NOME[proj.meses - 1]

  /* ---------- faixa de números ---------- */
  const v27 = serieTotal[5]
  const pessoalRcl = pick(D, 'pessoal').map((x, j) => (x / rcl[j]) * 100)
  const correntesRcl = pick(D, 'despesas_correntes').map((x, j) => (x / rcl[j]) * 100)
  const supCorrente = rcl.map((x, j) => x - pick(D, 'despesas_correntes')[j])
  const resultadoOrc = COL.map((_, j) => R.total[COL[j]] - D.total[COL[j]])
  const execPloa = D.total[5] - reservas27

  /* ---------- tabelas ---------- */
  const codigoDe = (l: Linha) => (vista === 'receita' ? COD_GRUPO[l.chave] : vista === 'despesa' ? COD_DESPESA[l.chave] : '') ?? ''
  /* sem coluna de códigos: o código fica na dica e no texto para leitores de tela; os grupos abrem o detalhe sob demanda */
  const celulaGrupo = (l: Linha): ReactNode => {
    const c = codigoDe(l)
    const filhos = comProj.some((x) => x.pai === l.chave)
    const aberto = abertos.has(l.chave)
    if (l.nivel === 1) return <span title={c ? `Código ${c}` : undefined} className="block pl-5 text-ink-soft">{c && <span className="sr-only">{c} </span>}{l.rotulo}</span>
    if (!filhos) return <span title={c ? `Código ${c}` : undefined} className={`block pl-5 ${l.negrito ? 'font-semibold' : 'font-medium'}`}>{c && <span className="sr-only">{c} </span>}{l.rotulo}</span>
    return (
      <button type="button" aria-expanded={aberto} onClick={() => alterna(l.chave)} title={c ? `Código ${c}` : undefined} className="inline-flex items-center gap-1.5 text-left font-medium text-ink">
        <span aria-hidden="true" className="inline-block w-3.5 text-ink-soft">{aberto ? '▾' : '▸'}</span>{l.rotulo}
        <span className="sr-only">{c ? ` (código ${c}); ` : ' '}{aberto ? 'recolher detalhe' : 'mostrar detalhe'}</span>
      </button>
    )
  }
  const celulaLinha = (l: Linha): ReactNode => <span className={l.negrito ? 'font-semibold' : ''}>{l.rotulo}</span>
  const colunasTabela = [
    { rotulo: 'R$ milhões', valor: celulaGrupo },
    { rotulo: '2025', secundaria: true, valor: (l: Linha) => (l.chave === 'res' && l.v[2] === 0 ? '–' : mi(l.v[2])) },
    { rotulo: 'Proj. 26', secundaria: true, valor: (l: Linha) => (l.proj && l.chave !== 'res' ? <span title={l.proj.base === 'resíduo' ? 'Resultado: receita líquida projetada menos a soma das linhas' : undefined}>{mi(l.proj.central)}</span> : '–') },
    { rotulo: 'PLOA 27', valor: (l: Linha) => <span className="font-semibold">{mi(l.v[4])}</span> },
    { rotulo: 'Proj. 27', valor: (l: Linha) => { const r = refDe(l); return r === null ? '–' : <span title={l.proj?.pontual ? 'Sem a receita pontual de 2026 (indenizações, restituições e ressarcimentos), que não se repete' : undefined}>{mi(r)}{l.proj?.pontual ? '†' : ''}</span> } },
    { rotulo: 'Dif. R$ mi', secundaria: true, valor: (l: Linha) => { const r = refDe(l); return r === null ? '–' : dMi(l.v[4] - r) } },
    { rotulo: 'Dif. %', valor: (l: Linha) => { const d = difPct(l); return d === null ? '–' : <span className={`font-semibold ${corDif(d)}`}>{fmtPct(d)}</span> } },
  ]

  const indicadores = [
    { chave: 'pessoal', rotulo: 'Pessoal e encargos ÷ RCL', v: pessoalRcl },
    { chave: 'correntes', rotulo: 'Despesas correntes ÷ RCL', v: correntesRcl },
    { chave: 'inv', rotulo: 'Investimentos ÷ RCL', v: pick(D, 'investimento').map((x, j) => (x / rcl[j]) * 100) },
    { chave: 'sup', rotulo: 'Superávit corrente ÷ RCL', v: supCorrente.map((x, j) => (x / rcl[j]) * 100) },
  ]
  const linhasResultado: Linha[] = [
    { chave: 'rc', rotulo: 'Receitas correntes (brutas)', nivel: 0, v: pick(R, 'receitas_correntes') },
    { chave: 'intra', rotulo: '(+) Intraorçamentárias', nivel: 0, v: pick(R, 'intra') },
    { chave: 'ded', rotulo: '(−) Deduções (municípios e Fundeb)', nivel: 0, v: pick(R, 'deducoes') },
    { chave: 'rcl', rotulo: '= RCL (aproximada)', nivel: 0, negrito: true, v: rcl },
    { chave: 'dc', rotulo: '(−) Despesas correntes', nivel: 0, v: pick(D, 'despesas_correntes').map(neg) },
    { chave: 'sup', rotulo: '= Superávit corrente', nivel: 0, negrito: true, v: supCorrente },
    { chave: 'rk', rotulo: '(+) Receitas de capital', nivel: 0, v: pick(R, 'receitas_capital') },
    { chave: 'dk', rotulo: '(−) Despesas de capital', nivel: 0, v: pick(D, 'despesas_capital').map(neg) },
    { chave: 'res', rotulo: '(−) Reservas (RPPS e contingência)', nivel: 0, v: reservas.map(neg) },
    { chave: 'saldo', rotulo: '= Resultado orçamentário', nivel: 0, negrito: true, v: COL.map((_, j) => supCorrente[j] + pick(R, 'receitas_capital')[j] - pick(D, 'despesas_capital')[j] - reservas[j]) },
  ]

  const tituloGrafico = vista === 'despesa' ? 'Despesa total' : 'Receita total, líquida de deduções'
  const legendaGrafico = [
    { cor: COR.empenhado, rotulo: vista === 'despesa' ? 'Executado' : 'Arrecadado' },
    { cor: COR.atualizada, contorno: COR.contornoAtualizada, rotulo: 'Projeção 2026' },
    { cor: COR.ploa, rotulo: 'PLOA 2027' },
    { cor: COR.referencia, rotulo: 'Projeção 2027 (equipe)' },
  ]
  const notaReferencia = (
    <Nota titulo="Metodologia">
      <p>
        Proj. 26: acumulado até {nomeCorte} (receita) ou {nomeCorteDesp} (despesa empenhada) dividido pela participação média do período no ano em 2022–2025; faixa pelas participações extremas. Proj. 27: Proj. 26 corrigida pela variação nominal do PIB na receita (IPCA e PIB real, Focus: +{numero(g27 * 100, 1)}%) e pelo IPCA na despesa (+{numero(i27 * 100, 1)}%); operações de crédito e demais receitas de capital mantidas no nível de 2026; reservas excluídas da despesa. Não incorpora hipóteses sobre preço do petróleo (Brent de 2026 mantido), alíquotas, crédito a contratar ou ampliação real da despesa.
      </p>
      <p>
        Faixa de Proj. 27: na receita, ± o desvio da diferença entre o crescimento dos impostos do ES e o do PIB nominal desde {pibA.linhas[0].ano} ({numero(pibA.difDesvio, 1)} p.p.); na despesa, as participações sazonais extremas. Dif.: PLOA menos Proj. 27; azul acima, rosa abaixo (≥ {DIF_MIN}%). IPCA: {fonteIpca}{' '}
        <button type="button" onClick={irParaMetodo} className="font-semibold text-navy underline underline-offset-4">Testes e fontes</button>.
      </p>
    </Nota>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
        <div role="group" aria-label="O que ver" className="inline-flex max-w-full flex-wrap overflow-hidden rounded-brand border border-line text-small print:hidden">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" aria-pressed={vista === v.id} onClick={() => setVista(v.id)}
              className={`px-4 py-1.5 ${vista === v.id ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink hover:bg-surface'}`}>{v.rotulo}</button>
          ))}
        </div>
      </div>


      {(vista === 'receita' || vista === 'despesa') && (
        <div className="mt-3 space-y-3">
          <Cartao titulo={tituloGrafico} legenda={<Legenda itens={legendaGrafico} />}
            direita={
              <div role="group" aria-label="Valores" className="inline-flex overflow-hidden rounded-brand border border-line text-small">
                {([['nominal', 'Nominal'], ['real', 'Real (R$ de 2027)']] as const).map(([k, r]) => (
                  <button key={k} type="button" aria-pressed={base === k} onClick={() => setBase(k)} className={`px-3 py-1 ${base === k ? 'bg-navy font-semibold text-on-navy' : 'bg-paper text-ink'}`}>{r}</button>
                ))}
              </div>
            }>
            <ColunasAnuais colunas={colunas} descricao={`${tituloGrafico}, em R$ bilhões, ${base === 'real' ? 'a preços de 2027' : 'valores correntes'}: ${colunas.map((c) => `${c.rotulo}${c.sub ? ' ' + c.sub : ''} ${numero(c.v / 1e9, 1)}`).join('; ')}`} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              R$ bilhões, valores correntes{base === 'real' ? ' (reais de 2027)' : ''}. Linha preta: faixa; traço tracejado: PLOA 2027{vista === 'despesa' ? ' (sem reservas)' : ''}.
            </p>
          </Cartao>

          <Cartao longa titulo={vista === 'receita' ? 'Receita por categoria: PLOA 2027 e projeção' : 'Despesa por grupo de natureza: PLOA 2027 e projeção'}>
            <TabelaItens altura="livre" compacta itens={visiveis.map((l) => ({ ...l, chave: l.chave }))} colunas={colunasTabela} legenda={`${vista === 'receita' ? 'Receita por categoria' : 'Despesa por grupo de natureza'}, em R$ milhões`} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>
              Proj. 26: fechamento projetado ({vista === 'receita' ? `arrecadação até ${nomeCorte}` : `despesa empenhada até ${nomeCorteDesp}`}). Dif.: PLOA 2027 menos Proj. 27.{vista === 'receita' ? ` † Exclui receita pontual de 2026 (indenizações, restituições e ressarcimentos: R$ ${mi(comProj.find((x) => x.chave === 'demais')?.proj?.pontual ?? 0)} mi até ${nomeCorte}).` : ''}
            </p>
            {notaReferencia}
          </Cartao>

        </div>
      )}

      {vista === 'resultado' && (
        <div className="mt-3 space-y-3">
          <Cartao titulo="Resultado orçamentário">
            <TabelaItens altura="livre" itens={linhasResultado} legenda="Resultado orçamentário, em R$ milhões" colunas={[
              { rotulo: 'R$ milhões', valor: celulaLinha },
              ...ANOS.map((a, j) => ({ rotulo: a, valor: (l: Linha) => <span className={l.negrito || j === 4 ? 'font-semibold' : ''}>{mi(l.v[j])}</span> })),
            ]} />
          </Cartao>
          <Cartao titulo="Indicadores (% da RCL aproximada)">
            <TabelaItens altura="livre" itens={indicadores} legenda="Indicadores, em % da RCL aproximada" colunas={[
              { rotulo: 'Indicador', valor: (x) => x.rotulo },
              ...ANOS.map((a, j) => ({ rotulo: a, valor: (x: (typeof indicadores)[number]) => `${numero(x.v[j], 1)}%` })),
            ]} />
            <p className={`mt-2 ${NOTA_DISCRETA}`}>RCL aproximada: receitas correntes + intraorçamentárias − deduções da receita (quadro da PLOA); difere da RCL do art. 2º, IV, da LRF. Provável 26: estimativa de 2026 informada na PLOA.</p>
          </Cartao>
        </div>
      )}
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fonte: PLOA 2027, Mensagem nº 189/2026, quadros Evolução da Receita (p. 97) e Evolução da Despesa (p. 130); arrecadação mensal do Portal de Dados Abertos do ES; despesa empenhada: Siconfi, RREO; IPCA: {fonteIpca}</p>
    </div>
  )
}
