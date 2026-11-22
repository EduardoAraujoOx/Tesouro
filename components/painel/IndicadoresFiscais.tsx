'use client'

import { useMemo } from 'react'
import { numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { projecaoItens, projetaDespesa2026, type DadosReceita } from './projecao'
import type { IndicadoresFiscais as Fiscais } from './Agregado'

type Ind = {
  chave: string; rotulo: string; base: string
  /** limite da LRF ou corte da nota A da CAPAG, em % */
  limite: number
  ultimo: number; ultimoRot: string
  proj26?: number | null
  ploa: number | null
  /** nome do ano ou edição a que se refere o valor da PLOA, quando não for 2027 */
  ploaRot?: string
  /** margem de erro da estimativa da PLOA, em pontos percentuais */
  banda?: number
}

const pc = (x: number) => `${numero(x, 1)}%`
const CORTE_ALERTA = 90
/** edição da CAPAG usada para calibrar a aproximação da poupança: a mais recente com os três exercícios (2023 a 2025) nos quadros da PLOA */
const ED_CALIBRACAO = 2026

const METODO: { id: string; nome: string; num: string; den: string; norma: string; ploa: string }[] = [
  { id: 'poup', nome: 'Poupança corrente (CAPAG)', num: 'Despesa corrente de cada um dos três últimos exercícios encerrados.',
    den: 'Receita corrente ajustada de cada exercício. A média é ponderada: 0,50 (exercício mais recente), 0,30 e 0,20.',
    norma: 'Portaria Normativa MF nº 1.583/2023, art. 2º, § 3º: balanços anuais, DCA e RREO do 6º bimestre. Notas: A abaixo de 85%; B de 85% a menos de 95%; C a partir de 95%.',
    ploa: 'Edição de 2028 (exercícios 2027, 2026 e 2025): PLOA, projeção de 2026 e realizado de 2025, com a receita corrente ajustada aproximada; o resultado é corrigido pela diferença observada na edição de 2026.' },
  { id: 'pessoal', nome: 'Pessoal líquido do Executivo (LRF)', num: 'Despesa total com pessoal do Poder Executivo (ativos, inativos, pensionistas e encargos), líquida das exclusões previstas na LRF e no MDF, em 12 meses.',
    den: 'RCL ajustada dos 12 meses.', norma: 'LRF, arts. 19 e 20; RGF, Anexo 1 (Siconfi). Limite de 49%; alerta a 90% e limite prudencial a 95% do limite (46,55%).',
    ploa: 'Pessoal do Executivo na PLOA, vezes a razão entre o pessoal líquido do RGF e o bruto empenhado em 2025, sobre a RCL do Quadro VI.' },
  { id: 'endiv', nome: 'Endividamento (CAPAG)', num: 'Dívida consolidada bruta.', den: 'Receita corrente líquida.',
    norma: 'Portaria Normativa MF nº 1.583/2023, art. 2º, §§ 1º e 2º: RGF do Executivo do 3º quadrimestre do último exercício. Notas: A abaixo de 60%; B de 60% a menos de 100%; C a partir de 100%.',
    ploa: 'Dívida consolidada do último RGF, mais a captação e menos a amortização da PLOA, sobre a RCL do Quadro VI; não inclui a atualização monetária da dívida.' },
  { id: 'credito', nome: 'Operações de crédito (LRF)', num: 'Operações de crédito contratadas no exercício, acumuladas desde janeiro.', den: 'RCL ajustada.',
    norma: 'Resolução do Senado Federal nº 43/2001; RGF, Anexo 4. Limite de 16%, alerta a 90% (14,4%).',
    ploa: 'Operações de crédito previstas na PLOA sobre a RCL do Quadro VI. O último RGF cobre só janeiro a agosto; a Proj. 26 é o ano inteiro.' },
  { id: 'garantias', nome: 'Garantias (LRF)', num: 'Saldo das garantias concedidas.', den: 'RCL ajustada.',
    norma: 'Resolução do Senado Federal nº 43/2001; RGF, Anexo 3. Limite de 22%, alerta a 90% (19,8%).', ploa: 'Não estimada: depende de contratações e de decisões fora do orçamento.' },
  { id: 'dcl', nome: 'Dívida consolidada líquida (LRF)', num: 'Dívida consolidada menos as deduções (caixa e haveres financeiros).', den: 'RCL ajustada.',
    norma: 'Resolução do Senado Federal nº 40/2001; RGF, Anexo 2. Limite de 200%, alerta a 90% (180%). Negativa quando os ativos financeiros superam a dívida.', ploa: 'Não estimada: depende do caixa ao fim do exercício.' },
  { id: 'liq', nome: 'Liquidez relativa (CAPAG)', num: 'Disponibilidade de caixa bruta menos obrigações financeiras, nas fontes não vinculadas, e insuficiências de caixa em fontes vinculadas.',
    den: 'Receita corrente líquida.', norma: 'Portaria Normativa MF nº 1.583/2023, art. 2º, § 4º; RGF do 3º quadrimestre. Notas: A a partir de 5%; B acima de zero e abaixo de 5%; C zero ou negativa.', ploa: 'Não estimada: o orçamento não informa o caixa.' },
]

/**
 * Indicadores da LRF e da CAPAG sobre os números da PLOA 2027, como parcela do limite: quanto mais perto de 100%, menor a folga.
 * Último valor oficial: RGF do Poder Executivo (2º quadrimestre de 2026) e CAPAG 2025. PLOA: indicadores calculados sobre a RCL do Quadro VI
 * da Mensagem e sobre a despesa e a receita da proposta (aproximações).
 */
export function IndicadoresFiscais({ receita, despesa, dados, fiscais, rclPloa, pessoalExecPloa }: {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; dados: DadosReceita; fiscais: Fiscais; rclPloa: number; pessoalExecPloa: number
}) {
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const itensProj = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])

  const inds = useMemo((): Ind[] => {
    const lrfUlt = fiscais.lrf[fiscais.lrf.length - 1]
    const lrf3q25 = fiscais.lrf.find((x) => x.ano === 2025 && x.quad === 3) ?? lrfUlt
    /* CAPAG: a edição de um ano usa o último exercício encerrado (ano-base = edição − 1) */
    const edicoes = [...fiscais.capag].sort((a, b) => a.ano - b.ano)
    const capagUlt = edicoes[edicoes.length - 1]
    const rotCapag = `CAPAG ${capagUlt.ano}, ano-base ${capagUlt.ano - 1}`
    /* pessoal líquido do RGF sobre o bruto empenhado de 2025, aplicado ao pessoal do Executivo na PLOA */
    const razaoLiqBruto = lrf3q25.pessoal.montante / fiscais.pessoalExecutivoEmpenhado2025
    const pessoalPloa = ((razaoLiqBruto * pessoalExecPloa) / rclPloa) * 100
    /* dívida consolidada: a do último RGF mais a captação e menos a amortização da PLOA */
    const dc26 = lrfUlt.divida.rcl_ajustada ? (lrfUlt.divida.dc / 100) * lrfUlt.divida.rcl_ajustada : NaN
    const dcPloa = ((dc26 + R.operacoes_credito[5] - D.amortizacao[5]) / rclPloa) * 100
    const creditoPloa = (R.operacoes_credito[5] / rclPloa) * 100
    const credito26 = lrfUlt.divida.rcl_ajustada ? (itensProj.cred.central / lrfUlt.divida.rcl_ajustada) * 100 : null
    /* poupança corrente da CAPAG: média ponderada (0,5; 0,3; 0,2) de despesa corrente ÷ receita corrente ajustada dos três últimos exercícios.
       Receita corrente ajustada aproximada por receitas correntes menos municípios e Fundeb; a diferença para a CAPAG oficial é medida nas edições publicadas. */
    const prox = (dc: number, rc: number, ded: number) => (dc / (rc + ded)) * 100
    const rAno = (j: number) => prox(D.despesas_correntes[j], R.receitas_correntes[j], R.deducoes[j]) // j: 0 = 2023, 1 = 2024, 2 = 2025
    const rc26 = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais'].reduce((t, c) => t + itensProj[c].central, 0)
    const r26 = prox(projD.itens.corr.central, rc26, itensProj.ded.central)
    const r27 = rAno(5)
    const pond = (a: number, b: number, c: number) => 0.5 * a + 0.3 * b + 0.2 * c
    const oficial = (ano: number) => edicoes.find((e) => e.ano === ano)?.poupanca ?? NaN
    /* edição de calibração: ano-base 2025 (exercícios 2025, 2024 e 2023) */
    const difUlt = oficial(ED_CALIBRACAO) - pond(rAno(2), rAno(1), rAno(0))
    /* erro da aproximação de um só exercício contra a edição de cada ano-base (2023, 2024 e 2025): a margem da estimativa */
    const banda = Math.max(...[2024, 2025, 2026].map((ed, k) => Math.abs(rAno(k) - oficial(ed))).filter(Number.isFinite))
    const poupPloa = pond(r27, r26, rAno(2)) + difUlt
    return [
      { chave: 'poup', rotulo: 'Poupança corrente (despesas ÷ receitas correntes ajustadas)', base: 'CAPAG: nota A abaixo de 85%', limite: 85, ultimo: capagUlt.poupanca ?? NaN, ultimoRot: rotCapag, ploa: poupPloa, ploaRot: 'CAPAG 2028 estimada', banda },
      { chave: 'pessoal', rotulo: 'Pessoal líquido do Executivo ÷ RCL', base: 'LRF: limite de 49%, prudencial de 46,55%', limite: 49, ultimo: lrfUlt.pessoal.valor, ultimoRot: 'RGF, 2º quad. 2026', ploa: pessoalPloa },
      { chave: 'endiv', rotulo: 'Endividamento (dívida consolidada ÷ RCL)', base: 'CAPAG: nota A abaixo de 60%', limite: 60, ultimo: capagUlt.endividamento ?? NaN, ultimoRot: rotCapag, ploa: dcPloa },
      { chave: 'credito', rotulo: 'Operações de crédito ÷ RCL', base: 'LRF: limite de 16%, acumulado no exercício', limite: 16, ultimo: lrfUlt.credito.valor, ultimoRot: 'RGF, jan–ago 2026', proj26: credito26, ploa: creditoPloa },
      { chave: 'garantias', rotulo: 'Garantias ÷ RCL', base: 'LRF: limite de 22%', limite: 22, ultimo: lrfUlt.garantias.valor, ultimoRot: 'RGF, 2º quad. 2026', ploa: null },
      { chave: 'dcl', rotulo: 'Dívida consolidada líquida ÷ RCL', base: 'LRF: limite de 200%', limite: 200, ultimo: lrfUlt.divida.valor, ultimoRot: 'RGF, 2º quad. 2026', ploa: null },
    ]
  }, [fiscais, R, D, itensProj, projD, rclPloa, pessoalExecPloa])

  const uso = (v: number, limite: number) => Math.min(Math.max((v / limite) * 100, 0), 100)
  const linhas = [...inds].sort((a, b) => uso(b.ploa ?? b.ultimo, b.limite) - uso(a.ploa ?? a.ultimo, a.limite))
  const capagUlt = [...fiscais.capag].sort((a, b) => a.ano - b.ano).slice(-1)[0]
  const liquidez = capagUlt?.liquidez
  const capagUltAno = capagUlt?.ano
  const rotLiquidez = `CAPAG ${capagUltAno}, ano-base ${(capagUltAno ?? 0) - 1}`
  const rclAjustada = fiscais.lrf[fiscais.lrf.length - 1].divida.rcl_ajustada ?? NaN

  return (
    <div className="space-y-3">
      <Cartao titulo="Indicadores fiscais: PLOA 2027 e limites da LRF e da CAPAG"
        legenda={<Legenda itens={[
          { cor: COR.empenhado, rotulo: 'Último oficial' },
          { cor: COR.ploa, rotulo: 'PLOA 2027 (aproximação)' },
        ]} />}>
        <div className="hidden items-end gap-x-4 pb-1 text-label font-semibold normal-case tracking-normal text-ink-soft md:grid md:grid-cols-[15rem_1fr_12rem]">
          <span />
          <span className="relative block h-4"><span className="absolute left-0">0</span><span className="absolute right-0">limite (100%)</span></span>
          <span />
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {linhas.map((l) => {
            const u = uso(l.ultimo, l.limite)
            const p = l.ploa === null ? null : uso(l.ploa, l.limite)
            const ref = l.ploa ?? l.ultimo
            const folga = l.limite - ref
            return (
              <li key={l.chave} className="grid items-center gap-x-4 gap-y-1 py-2 md:grid-cols-[15rem_1fr_12rem]">
                <div>
                  <span className="block text-small font-medium text-ink">{l.rotulo}</span>
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{l.base}</span>
                </div>
                <div className="relative h-10 rounded-sm bg-surface" role="img" aria-label={`${l.rotulo}: último ${pc(l.ultimo)}${l.ploa === null ? '' : `, PLOA ${pc(l.ploa)}`}, limite ${l.limite}%`}>
                  <span aria-hidden="true" className="absolute inset-y-0 right-0" style={{ left: `${CORTE_ALERTA}%`, background: 'rgb(var(--serie2) / 0.14)' }} />
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 border-r-2 border-dashed" style={{ borderColor: 'rgb(var(--serie2))' }} />
                  <span aria-hidden="true" className="absolute left-0 top-1 h-3.5" style={{ width: `${u}%`, background: COR.empenhado }} />
                  {p !== null && <span aria-hidden="true" className="absolute bottom-1 left-0 h-3.5" style={{ width: `${p}%`, background: COR.ploa }} />}
                  {p !== null && l.banda ? (
                    <span aria-hidden="true" className="absolute bottom-[0.45rem] h-[1.1rem] border-x-2" style={{ left: `${uso(Math.max((l.ploa ?? 0) - l.banda, 0), l.limite)}%`, width: `${uso((l.ploa ?? 0) + l.banda, l.limite) - uso(Math.max((l.ploa ?? 0) - l.banda, 0), l.limite)}%`, borderColor: 'rgb(var(--ink))' }}>
                      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgb(var(--ink))' }} />
                    </span>
                  ) : null}
                </div>
                <div className="text-small tabular-nums text-ink">
                  <span className="block"><span className="text-ink-soft">Último </span>{pc(l.ultimo)}<span className="block text-label normal-case tracking-normal text-ink-soft">{l.ultimoRot}</span></span>
                  {l.proj26 != null && <span className="block"><span className="text-ink-soft">Proj. 26 </span>≈ {pc(l.proj26)}</span>}
                  {l.ploa !== null && <span className="block font-semibold"><span className="font-normal text-ink-soft">{l.ploaRot ? `${l.ploaRot} ` : 'PLOA '}</span>≈ {pc(l.ploa)}{l.banda ? ` ± ${numero(l.banda, 1)}` : ''}</span>}
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{ref < 0 ? 'dívida líquida negativa' : `folga de ${numero(folga, 1)} p.p.`}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          Cada barra é o indicador como parcela do limite (da LRF) ou do corte da nota A (da CAPAG); a faixa rosa marca os 10% finais e o traço sobre a barra da PLOA, a margem de erro da estimativa. PLOA: indicadores calculados sobre a RCL do Quadro VI da Mensagem (R$ {numero(rclPloa / 1e9, 1)} bi) e a receita e a despesa da proposta. Liquidez relativa da CAPAG ({rotLiquidez}): {liquidez != null ? pc(liquidez) : '–'}, nota A a partir de 5%; não se projeta pelo orçamento.
        </p>
        <Nota titulo="Como cada indicador é calculado" larga>
          <div className="space-y-2">
            <div className="rola overflow-auto rounded-brand border border-line">
              <table className="w-full min-w-[46rem] text-left text-small">
                <caption className="sr-only">Numerador, denominador, base legal e estimativa de cada indicador</caption>
                <thead>
                  <tr className="bg-surface text-ink">
                    <th scope="col" className="px-3 py-2 font-semibold">Indicador</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Numerador</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Denominador</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Norma, fonte e nota</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Estimativa para a PLOA 2027</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {METODO.map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <th scope="row" className="px-3 py-2 font-medium text-ink">{m.nome}</th>
                      <td className="px-3 py-2">{m.num}</td>
                      <td className="px-3 py-2">{m.den}</td>
                      <td className="px-3 py-2">{m.norma}</td>
                      <td className="px-3 py-2">{m.ploa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Conferido com o texto da Portaria Normativa MF nº 1.583/2023 (DOU de 15/12/2023): fórmulas, pesos da poupança corrente, faixas das notas e fontes de informação. O conceito de receita corrente ajustada fica no Manual de Análise Fiscal do Tesouro Nacional, que não foi conferido; a aproximação usada aqui é receitas correntes menos as transferências a municípios e ao Fundeb. A edição de um ano da CAPAG usa o último exercício encerrado (a de {capagUltAno} usa 2025); o orçamento de 2027 só entra na edição de 2028, com peso de 50% na poupança corrente. Os limites da LRF seguem os atos citados na coluna de normas. A PLOA traz a RCL do Quadro VI, e não a RCL ajustada do RGF; as duas têm a mesma ordem de grandeza (R$ {numero(rclAjustada / 1e9, 2)} bi nos 12 meses do último RGF e R$ {numero(rclPloa / 1e9, 2)} bi na PLOA 2027).
            </p>
          </div>
        </Nota>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026, Quadro VI e quadros de receita e despesa); RGF do Poder Executivo e CAPAG (Tesouro Nacional); Portal de Dados Abertos do ES.</p>
    </div>
  )
}
