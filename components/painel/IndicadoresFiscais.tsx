'use client'

import { useMemo, type CSSProperties } from 'react'
import { numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, Legenda, COR } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { projecaoItens, projetaDespesa2026, type DadosReceita } from './projecao'
import type { IndicadoresFiscais as Fiscais } from './Agregado'

type Props = { receita: LinhaMacro[]; despesa: LinhaMacro[]; dados: DadosReceita; fiscais: Fiscais; rclPloa: number; pessoalExecPloa: number }

const pc = (x: number) => `${numero(x, 1)}%`
/** a partir de 90% do limite há alerta na LRF */
const CORTE_ALERTA = 90
/** edição da CAPAG usada para calibrar a aproximação da poupança: a mais recente com os três exercícios (2023 a 2025) nos quadros da PLOA */
const ED_CALIBRACAO = 2026

/**
 * Cálculo dos indicadores sobre os números da PLOA 2027. LRF: último RGF do Poder Executivo (2º quadrimestre de 2026) e indicadores sobre a RCL do
 * Quadro VI da Mensagem. CAPAG: última edição publicada e estimativa da edição de 2028 (a primeira que usa o exercício de 2027), com a poupança corrente
 * pela média ponderada dos três exercícios (0,5, 0,3 e 0,2) da Portaria Normativa MF nº 1.583/2023.
 */
function useCalculo({ receita, despesa, dados, fiscais, rclPloa, pessoalExecPloa }: Props) {
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const itensProj = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])
  return useMemo(() => {
    const lrfUlt = fiscais.lrf[fiscais.lrf.length - 1]
    const lrf3q25 = fiscais.lrf.find((x) => x.ano === 2025 && x.quad === 3) ?? lrfUlt
    const edicoes = [...fiscais.capag].sort((a, b) => a.ano - b.ano)
    const capagUlt = edicoes[edicoes.length - 1]
    /* pessoal líquido do RGF sobre o bruto empenhado de 2025, aplicado ao pessoal do Executivo na PLOA */
    const razaoLiqBruto = lrf3q25.pessoal.montante / fiscais.pessoalExecutivoEmpenhado2025
    const pessoalPloa = ((razaoLiqBruto * pessoalExecPloa) / rclPloa) * 100
    /* dívida consolidada: a do último RGF mais a captação e menos a amortização da PLOA */
    const dc26 = lrfUlt.divida.rcl_ajustada ? (lrfUlt.divida.dc / 100) * lrfUlt.divida.rcl_ajustada : NaN
    const dcPloa = ((dc26 + R.operacoes_credito[5] - D.amortizacao[5]) / rclPloa) * 100
    const creditoPloa = (R.operacoes_credito[5] / rclPloa) * 100
    const credito26 = lrfUlt.divida.rcl_ajustada ? (itensProj.cred.central / lrfUlt.divida.rcl_ajustada) * 100 : null
    /* poupança corrente: média ponderada de despesa corrente ÷ receita corrente ajustada; esta última aproximada por receitas correntes menos municípios e Fundeb */
    const prox = (dc: number, rc: number, ded: number) => (dc / (rc + ded)) * 100
    const rAno = (j: number) => prox(D.despesas_correntes[j], R.receitas_correntes[j], R.deducoes[j]) // j: 0 = 2023, 1 = 2024, 2 = 2025
    const rc26 = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais'].reduce((t, c) => t + itensProj[c].central, 0)
    const r26 = prox(projD.itens.corr.central, rc26, itensProj.ded.central)
    const pond = (a: number, b: number, c: number) => 0.5 * a + 0.3 * b + 0.2 * c
    const oficial = (ano: number) => edicoes.find((e) => e.ano === ano)?.poupanca ?? NaN
    /* edição de calibração: ano-base 2025 (exercícios 2025, 2024 e 2023) */
    const difUlt = oficial(ED_CALIBRACAO) - pond(rAno(2), rAno(1), rAno(0))
    /* erro da aproximação de um só exercício contra a edição de cada ano-base (2023, 2024 e 2025): a margem da estimativa */
    const banda = Math.max(...[2024, 2025, 2026].map((ed, k) => Math.abs(rAno(k) - oficial(ed))).filter(Number.isFinite))
    const poupPloa = pond(rAno(5), r26, rAno(2)) + difUlt
    return {
      lrf: {
        pessoal: { ultimo: lrfUlt.pessoal.valor, ploa: pessoalPloa, limite: lrfUlt.pessoal.limite, prud: lrfUlt.pessoal.prudencial },
        credito: { ultimo: lrfUlt.credito.valor, proj26: credito26, ploa: creditoPloa, limite: lrfUlt.credito.limite },
        garantias: { ultimo: lrfUlt.garantias.valor, limite: lrfUlt.garantias.limite },
        dcl: { ultimo: lrfUlt.divida.valor, limite: lrfUlt.divida.limite },
        rclAjustada: lrfUlt.divida.rcl_ajustada ?? NaN,
      },
      capag: {
        ano: capagUlt.ano, nota: capagUlt.classificacao ?? '–', informacao: capagUlt.qualidadeInformacao,
        endiv: { ultimo: capagUlt.endividamento ?? NaN, nota: capagUlt.notaEndividamento ?? '–', ploa: dcPloa },
        poup: { ultimo: capagUlt.poupanca ?? NaN, nota: capagUlt.notaPoupanca ?? '–', ploa: poupPloa, banda },
        liq: { ultimo: capagUlt.liquidez ?? NaN, nota: capagUlt.notaLiquidez ?? '–' },
      },
    }
  }, [fiscais, R, D, itensProj, projD, rclPloa, pessoalExecPloa])
}

/* ------------------------------------------------------------------ LRF: limites legais */

type IndLrf = { chave: string; rotulo: string; base: string; limite: number; ultimo: number; ultimoRot: string; proj26?: number | null; ploa: number | null; prud?: number }

const METODO_LRF: { id: string; nome: string; num: string; den: string; norma: string; ploa: string }[] = [
  { id: 'pessoal', nome: 'Pessoal líquido do Executivo', num: 'Despesa total com pessoal do Poder Executivo (ativos, inativos, pensionistas e encargos), líquida das exclusões previstas na LRF e no MDF, em 12 meses.',
    den: 'RCL ajustada dos 12 meses.', norma: 'LRF, arts. 19 e 20; RGF, Anexo 1 (Siconfi). Limite de 49%; alerta a 90% do limite (44,1%) e limite prudencial a 95% (46,55%).',
    ploa: 'Pessoal do Executivo na PLOA, vezes a razão entre o pessoal líquido do RGF e o bruto empenhado em 2025, sobre a RCL do Quadro VI.' },
  { id: 'credito', nome: 'Operações de crédito', num: 'Operações de crédito contratadas no exercício, acumuladas desde janeiro.', den: 'RCL ajustada.',
    norma: 'Resolução do Senado Federal nº 43/2001; RGF, Anexo 4. Limite de 16%, alerta a 90% (14,4%).',
    ploa: 'Operações de crédito previstas na PLOA sobre a RCL do Quadro VI. O último RGF cobre só janeiro a agosto; a Proj. 26 é o ano inteiro.' },
  { id: 'garantias', nome: 'Garantias', num: 'Saldo das garantias concedidas.', den: 'RCL ajustada.',
    norma: 'Resolução do Senado Federal nº 43/2001; RGF, Anexo 3. Limite de 22%, alerta a 90% (19,8%).', ploa: 'Não estimada: depende de contratações e de decisões fora do orçamento.' },
  { id: 'dcl', nome: 'Dívida consolidada líquida', num: 'Dívida consolidada menos as deduções (caixa e haveres financeiros).', den: 'RCL ajustada.',
    norma: 'Resolução do Senado Federal nº 40/2001; RGF, Anexo 2. Limite de 200%, alerta a 90% (180%). Negativa quando os ativos financeiros superam a dívida.', ploa: 'Não estimada: depende do caixa ao fim do exercício.' },
]

/** Limites da LRF: cada indicador como parcela do limite legal; quanto mais perto de 100%, menor a folga. */
export function IndicadoresLrf(props: Props) {
  const { lrf } = useCalculo(props)
  const inds: IndLrf[] = [
    { chave: 'pessoal', rotulo: 'Pessoal líquido do Executivo ÷ RCL', base: 'Limite de 49%; alerta a 44,1% e prudencial a 46,55%', limite: lrf.pessoal.limite, ultimo: lrf.pessoal.ultimo, ultimoRot: 'RGF, 2º quad. 2026', ploa: lrf.pessoal.ploa, prud: lrf.pessoal.prud },
    { chave: 'credito', rotulo: 'Operações de crédito ÷ RCL', base: 'Limite de 16%, acumulado no exercício', limite: lrf.credito.limite, ultimo: lrf.credito.ultimo, ultimoRot: 'RGF, jan–ago 2026', proj26: lrf.credito.proj26, ploa: lrf.credito.ploa },
    { chave: 'garantias', rotulo: 'Garantias ÷ RCL', base: 'Limite de 22%', limite: lrf.garantias.limite, ultimo: lrf.garantias.ultimo, ultimoRot: 'RGF, 2º quad. 2026', ploa: null },
    { chave: 'dcl', rotulo: 'Dívida consolidada líquida ÷ RCL', base: 'Limite de 200%', limite: lrf.dcl.limite, ultimo: lrf.dcl.ultimo, ultimoRot: 'RGF, 2º quad. 2026', ploa: null },
  ]
  const uso = (v: number, limite: number) => Math.min(Math.max((v / limite) * 100, 0), 100)
  const linhas = [...inds].sort((a, b) => uso(b.ploa ?? b.ultimo, b.limite) - uso(a.ploa ?? a.ultimo, a.limite))

  return (
    <div className="space-y-3">
      <Cartao titulo="LRF: PLOA 2027 e limites legais"
        legenda={<Legenda itens={[{ cor: COR.empenhado, rotulo: 'Último RGF' }, { cor: COR.ploa, rotulo: 'PLOA 2027 (aproximação)' }]} />}>
        <div className="painel-lrf-escala painel-lrf-linha hidden items-end gap-x-4 pb-1 text-label font-semibold normal-case tracking-normal text-ink-soft print:grid print:grid-cols-[15rem_1fr_12rem]">
          <span />
          <span className="relative block h-4"><span className="absolute left-0">0</span><span className="absolute right-0">limite (100%)</span></span>
          <span />
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {linhas.map((l) => {
            const u = uso(l.ultimo, l.limite)
            const p = l.ploa === null ? null : uso(l.ploa, l.limite)
            const ref = l.ploa ?? l.ultimo
            return (
              <li key={l.chave} className="painel-lrf-linha grid items-center gap-x-4 gap-y-1 py-2 print:grid-cols-[15rem_1fr_12rem]">
                <div>
                  <span className="block text-small font-medium text-ink">{l.rotulo}</span>
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{l.base}</span>
                </div>
                <div className="relative h-10 rounded-sm bg-surface" role="img" aria-label={`${l.rotulo}: último ${pc(l.ultimo)}${l.ploa === null ? '' : `, PLOA ${pc(l.ploa)}`}, limite ${l.limite}%`}>
                  <span aria-hidden="true" className="absolute inset-y-0 right-0" style={{ left: `${CORTE_ALERTA}%`, background: 'rgb(var(--serie2) / 0.14)' }} />
                  {l.prud ? <span aria-hidden="true" className="absolute inset-y-0 border-l" style={{ left: `${uso(l.prud, l.limite)}%`, borderColor: 'rgb(var(--serie2) / 0.6)' }} /> : null}
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 border-r-2 border-dashed" style={{ borderColor: 'rgb(var(--serie2))' }} />
                  <span aria-hidden="true" className="absolute left-0 top-1 h-3.5" style={{ width: `${u}%`, background: COR.empenhado }} />
                  {p !== null && <span aria-hidden="true" className="absolute bottom-1 left-0 h-3.5" style={{ width: `${p}%`, background: COR.ploa }} />}
                </div>
                <div className="text-small tabular-nums text-ink">
                  <span className="block"><span className="text-ink-soft">Último </span>{pc(l.ultimo)}<span className="block text-label normal-case tracking-normal text-ink-soft">{l.ultimoRot}</span></span>
                  {l.proj26 != null && <span className="block"><span className="text-ink-soft">Proj. 26 </span>≈ {pc(l.proj26)}</span>}
                  {l.ploa !== null && <span className="block font-semibold"><span className="font-normal text-ink-soft">PLOA </span>≈ {pc(l.ploa)}</span>}
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{ref < 0 ? 'dívida líquida negativa' : `folga de ${numero(l.limite - ref, 1)} p.p.`}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          Barras: parcela do limite legal; faixa rosa: alerta (acima de 90%); traço fino: limite prudencial do pessoal (95%). PLOA: indicadores sobre a RCL do Quadro VI da Mensagem (R$ {numero(props.rclPloa / 1e9, 1)} bi) e a receita e a despesa da proposta.
        </p>
        <Nota titulo="Como cada indicador é calculado" larga>
          <div className="space-y-2">
            <TabelaMetodo linhas={METODO_LRF} />
            <p>
              A PLOA traz a RCL do Quadro VI, e não a RCL ajustada do RGF; as duas têm a mesma ordem de grandeza (R$ {numero(lrf.rclAjustada / 1e9, 2)} bi nos 12 meses do último RGF e R$ {numero(props.rclPloa / 1e9, 2)} bi na PLOA 2027). Os limites seguem os atos citados na coluna de normas, conforme as definições do painel; não foram conferidos de novo com o texto das normas nesta etapa.
            </p>
          </div>
        </Nota>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026, Quadro VI e quadros de receita e despesa); RGF do Poder Executivo (Siconfi); Portal de Dados Abertos do ES.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ CAPAG: faixas das notas */

type Zona = { de: number; ate: number; nota: 'A' | 'B' | 'C' }
type IndCapag = {
  chave: string; rotulo: string; formula: string; escala: [number, number]; zonas: Zona[]
  ultimo: number; nota: string; ploa: number | null; banda?: number
}

const METODO_CAPAG: { id: string; nome: string; num: string; den: string; norma: string; ploa: string }[] = [
  { id: 'poup', nome: 'Poupança corrente', num: 'Despesa corrente de cada um dos três últimos exercícios encerrados.',
    den: 'Receita corrente ajustada de cada exercício. A média é ponderada: 0,50 (exercício mais recente), 0,30 e 0,20.',
    norma: 'Portaria Normativa MF nº 1.583/2023, art. 2º, § 3º: balanços anuais, DCA e RREO do 6º bimestre. Notas: A abaixo de 85%; B de 85% a menos de 95%; C a partir de 95%.',
    ploa: 'Edição de 2028 (exercícios 2027, 2026 e 2025): PLOA, projeção de 2026 e realizado de 2025, com a receita corrente ajustada aproximada; o resultado é corrigido pela diferença observada na edição de 2026.' },
  { id: 'endiv', nome: 'Endividamento', num: 'Dívida consolidada bruta.', den: 'Receita corrente líquida.',
    norma: 'Portaria Normativa MF nº 1.583/2023, art. 2º, §§ 1º e 2º: RGF do Executivo do 3º quadrimestre do último exercício. Notas: A abaixo de 60%; B de 60% a menos de 100%; C a partir de 100%.',
    ploa: 'Dívida consolidada do último RGF, mais a captação e menos a amortização da PLOA, sobre a RCL do Quadro VI; não inclui a atualização monetária da dívida.' },
  { id: 'liq', nome: 'Liquidez relativa', num: 'Disponibilidade de caixa bruta menos obrigações financeiras, nas fontes não vinculadas, e insuficiências de caixa em fontes vinculadas.',
    den: 'Receita corrente líquida.', norma: 'Portaria Normativa MF nº 1.583/2023, art. 2º, § 4º; RGF do 3º quadrimestre. Notas: A a partir de 5%; B acima de zero e abaixo de 5%; C zero ou negativa.', ploa: 'Não estimada: o orçamento não informa o caixa.' },
]

const COR_NOTA: Record<string, string> = { A: 'rgb(var(--serie3) / 0.16)', B: 'rgb(var(--navy) / 0.07)', C: 'rgb(var(--serie2) / 0.16)' }

const CAMPOS_METODO = [
  { chave: 'num', rotulo: 'Numerador' },
  { chave: 'den', rotulo: 'Denominador' },
  { chave: 'norma', rotulo: 'Norma, fonte e nota' },
  { chave: 'ploa', rotulo: 'Estimativa para a PLOA 2027' },
] as const

function TabelaMetodo({ linhas }: { linhas: { id: string; nome: string; num: string; den: string; norma: string; ploa: string }[] }) {
  const legenda = 'Numerador, denominador, base legal e estimativa de cada indicador'

  return (
    <div className="painel-metodo">
      <div className="painel-metodo-colunas rola hidden overflow-auto rounded-brand border border-line">
        <table className="w-full min-w-[46rem] break-normal text-left text-small">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            <tr className="bg-surface text-ink">
              <th scope="col" className="px-3 py-2 font-semibold">Indicador</th>
              {CAMPOS_METODO.map(({ chave, rotulo }) => (
                <th key={chave} scope="col" className="px-3 py-2 font-semibold">{rotulo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            {linhas.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <th scope="row" className="px-3 py-2 font-medium text-ink">{m.nome}</th>
                {CAMPOS_METODO.map(({ chave }) => <td key={chave} className="px-3 py-2">{m[chave]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul role="list" aria-label={legenda} className="painel-metodo-linhas divide-y divide-line rounded-brand border border-line">
        {linhas.map((m) => (
          <li key={m.id} className="p-3">
            <p className="font-semibold text-ink">{m.nome}</p>
            <dl className="mt-2 space-y-2">
              {CAMPOS_METODO.map(({ chave, rotulo }) => (
                <div key={chave}>
                  <dt className="text-label font-semibold tracking-normal text-ink">{rotulo}</dt>
                  <dd>{m[chave]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** CAPAG: onde cada indicador está nas faixas das notas A, B e C, e como as notas parciais compõem a nota final. */
export function IndicadoresCapag(props: Props) {
  const { capag } = useCalculo(props)
  const inds: IndCapag[] = [
    { chave: 'endiv', rotulo: 'Endividamento', formula: 'dívida consolidada bruta ÷ RCL', escala: [0, 120], ultimo: capag.endiv.ultimo, nota: capag.endiv.nota, ploa: capag.endiv.ploa,
      zonas: [{ de: 0, ate: 60, nota: 'A' }, { de: 60, ate: 100, nota: 'B' }, { de: 100, ate: 120, nota: 'C' }] },
    { chave: 'poup', rotulo: 'Poupança corrente', formula: 'despesa corrente ÷ receita corrente ajustada, média ponderada de três exercícios', escala: [60, 105], ultimo: capag.poup.ultimo, nota: capag.poup.nota, ploa: capag.poup.ploa, banda: capag.poup.banda,
      zonas: [{ de: 60, ate: 85, nota: 'A' }, { de: 85, ate: 95, nota: 'B' }, { de: 95, ate: 105, nota: 'C' }] },
    { chave: 'liq', rotulo: 'Liquidez relativa', formula: '(caixa bruta − obrigações financeiras) ÷ RCL; quanto maior, melhor', escala: [-5, 12], ultimo: capag.liq.ultimo, nota: capag.liq.nota, ploa: null,
      zonas: [{ de: -5, ate: 0, nota: 'C' }, { de: 0, ate: 5, nota: 'B' }, { de: 5, ate: 12, nota: 'A' }] },
  ]
  const pos = (v: number, [min, max]: [number, number]) => Math.min(Math.max(((v - min) / (max - min)) * 100, 0), 100)
  /* a escala desenhada tem limites só de exibição: abaixo da primeira faixa vale a nota dela (A em endividamento e poupança, C em liquidez), e acima da última, a da última */
  const notaDe = (v: number, zonas: Zona[]) => (v < zonas[0].de ? zonas[0].nota : (zonas.find((z) => v >= z.de && v < z.ate)?.nota ?? zonas[zonas.length - 1].nota))
  const ponto = (left: number, top: string, cheio: boolean): CSSProperties => ({ left: `${left}%`, top, background: cheio ? COR.ploa : 'rgb(var(--paper))', border: `2px solid ${cheio ? COR.ploa : 'rgb(var(--navy) / 0.7)'}` })

  return (
    <div className="space-y-3">
      <Cartao titulo={`CAPAG · Nota ${capag.nota} em ${capag.ano}`}
        legenda={<Legenda itens={[{ cor: 'rgb(var(--paper))', contorno: 'rgb(var(--navy) / 0.7)', ponto: true, rotulo: `Edição ${capag.ano} (ano-base ${capag.ano - 1})` }, { cor: COR.ploa, ponto: true, rotulo: 'Estimativa 2028 com a PLOA' }]} />}>
        <ul className="divide-y divide-line border-y border-line">
          {inds.map((l) => {
            const nPloa = l.ploa === null ? null : notaDe(l.ploa, l.zonas)
            const total = l.escala[1] - l.escala[0]
            return (
              <li key={l.chave} className="painel-capag-linha grid items-center gap-x-4 gap-y-1 py-3 print:grid-cols-[15rem_1fr_13rem]">
                <div>
                  <span className="block text-small font-medium text-ink">{l.rotulo}</span>
                  <span className="block text-label normal-case tracking-normal text-ink-soft">{l.formula}</span>
                </div>
                <div className="painel-capag-grafico relative h-[3.875rem]" role="img" aria-label={`${l.rotulo}: última edição ${pc(l.ultimo)}, nota ${l.nota}${l.ploa === null ? '' : `; estimativa com a PLOA ${pc(l.ploa)}, nota ${nPloa}`}`}>
                  <div className="absolute inset-x-0 top-0 flex h-11 overflow-hidden rounded-sm">
                    {l.zonas.map((z) => (
                      <span key={z.nota} className="relative flex items-start justify-center border-r border-ink-soft/60 text-label font-semibold normal-case tracking-normal text-ink-soft last:border-0" style={{ width: `${((z.ate - z.de) / total) * 100}%`, background: COR_NOTA[z.nota] }}>{z.nota}</span>
                    ))}
                  </div>
                  <div className="painel-capag-limites absolute inset-x-0 top-11 h-4 text-label normal-case tracking-normal text-ink-soft">
                    {l.zonas.slice(1).map((z) => (
                      <span key={z.de} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(z.de, l.escala)}%` }}>{z.de}%</span>
                    ))}
                  </div>
                  <span aria-hidden="true" className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full" style={ponto(pos(l.ultimo, l.escala), '1rem', false)} />
                  {l.ploa !== null && l.banda ? (
                    <span aria-hidden="true" className="absolute h-px" style={{ left: `${pos(l.ploa - l.banda, l.escala)}%`, width: `${pos(l.ploa + l.banda, l.escala) - pos(l.ploa - l.banda, l.escala)}%`, top: '2.3125rem', background: 'rgb(var(--ink))' }} />
                  ) : null}
                  {l.ploa !== null && <span aria-hidden="true" className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full" style={ponto(pos(l.ploa, l.escala), '1.875rem', true)} />}
                </div>
                <div className="text-small tabular-nums text-ink">
                  <span className="block"><span className="text-ink-soft">Última edição </span>{pc(l.ultimo)} · nota {l.nota}</span>
                  {l.ploa !== null && <span className="block font-semibold"><span className="font-normal text-ink-soft">Edição 2028 </span>≈ {pc(l.ploa)}{l.banda ? ` ± ${numero(l.banda, 1)}` : ''} · nota {nPloa}</span>}
                  {l.ploa === null && <span className="block text-label normal-case tracking-normal text-ink-soft">não estimada pelo orçamento</span>}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-small text-ink">
          Nota final {capag.nota}. Pelo art. 4º da Portaria, a nota é A quando o endividamento é A e poupança e liquidez não estão ambas em B; B nas demais combinações sem nota C em poupança ou liquidez; C se uma das duas tiver C; D se as três tiverem C. Estados com A ou B e informação contábil “Aicf” sobem para A+ ou B+. Só A, A+, B e B+ permitem garantia da União (art. 13, I). Uma nota B isolada em poupança ou liquidez mantém a nota final A.
        </p>
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          A CAPAG não tem limite legal: as faixas definem a nota. A PLOA 2027 só entra na edição de 2028: no endividamento, pela dívida ao fim de 2027; na poupança corrente, com peso de 50%. A liquidez depende do caixa, que o orçamento não informa.
        </p>
        <Nota titulo="Como cada indicador é calculado" larga>
          <div className="space-y-2">
            <TabelaMetodo linhas={METODO_CAPAG} />
            <p>
              Conferido com o texto da Portaria Normativa MF nº 1.583/2023 (DOU de 15/12/2023): fórmulas, pesos da poupança corrente, faixas das notas, combinação das notas parciais e fontes de informação. O conceito de receita corrente ajustada fica no Manual de Análise Fiscal do Tesouro Nacional, que não foi conferido; a aproximação usada aqui é receitas correntes menos as transferências a municípios e ao Fundeb. A edição de um ano da CAPAG usa o último exercício encerrado (a de {capag.ano} usa {capag.ano - 1}).
            </p>
          </div>
        </Nota>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: CAPAG dos Estados e do DF (Tesouro Transparente); RGF do Poder Executivo (Siconfi); PLOA 2027 (Mensagem nº 189/2026, quadros de receita e despesa); Portal de Dados Abertos do ES.</p>
    </div>
  )
}
