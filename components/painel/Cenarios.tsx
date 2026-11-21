'use client'

import { useMemo, useState } from 'react'
import { milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'
import { BRENT_CENTRAL, CAMBIO_CENTRAL, PRODUCAO_CENTRAL, PRODUCAO_LDO, receitaPetroleo } from './petroleo'
import { analisaFontes, ipcaAnual, projecaoItens, projetaDespesa2026, tendenciaPessoal, type DadosReceita } from './projecao'
import type { RclOficial } from './Agregado'

/** limite de créditos suplementares do art. 6º do projeto de lei da PLOA 2027 (30% da receita dos Orçamentos Fiscal e da Seguridade) */
const LIMITE_SUPLEMENTAR = 10627969219.2
/** pressão sobre a despesa pelos limites da LDO dos Poderes e pelas emendas impositivas, acima da reserva técnica (Observações, Poderes e emendas), em R$ milhões */
const PRESSAO_PODERES_EMENDAS = 650
const SEM_CRESCIMENTO = new Set(['cap', 'cred', 'capout'])
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const dMi = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${milhoes(Math.abs(x), 0)}`
const campo = 'w-24 rounded-brand border border-line bg-paper px-2 py-1 text-small tabular-nums'

type Premissas = { brent: number; cambio: number; producao: number; g: number; credito: number; gp: number; go: number; pressoes: number; compressao: number }

/**
 * Cenários de 2027: receita e despesa dependem das premissas abaixo e o resultado do cenário mostra o que cada combinação faz com o orçamento
 * (receita total, RCL, despesa executável, resultado, créditos suplementares necessários e pessoal sobre a RCL). A base de cada linha é a mesma
 * da referência da Visão geral; com as premissas iniciais o cenário reproduz a referência da equipe.
 */
export function Cenarios({ receita, despesa, ipca: ipcaParams, pib, dados, rclOficial, contingencia }: {
  receita: LinhaMacro[]; despesa: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; dados: DadosReceita; rclOficial: RclOficial; contingencia: number
}) {
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const D = useMemo(() => Object.fromEntries(despesa.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [despesa])
  const i27 = useMemo(() => ipcaAnual(Object.fromEntries(Object.entries(ipcaParams).map(([a, v]) => [a, v])))[2027], [ipcaParams])
  const gBase = (1 + i27) * (1 + (pib['2027'] ?? 0)) - 1
  const itens = useMemo(() => projecaoItens(dados), [dados])
  const projD = useMemo(() => projetaDespesa2026(), [])
  const petroleo26 = useMemo(() => analisaFontes(dados).find((a) => a.id === 'petroleo')!.central, [dados])
  const tend = useMemo(() => tendenciaPessoal().media, [])
  /* deduções previdenciárias sobre as receitas correntes: média de 2023–25 */
  const propPrevid = useMemo(() => {
    const h = ['2023', '2024', '2025']
    return [0, 1, 2].reduce((t, j) => t + (R.receitas_correntes[j] + R.deducoes[j] - rclOficial.historico[h[j]]) / R.receitas_correntes[j], 0) / 3
  }, [R, rclOficial])

  const inicio: Premissas = {
    brent: BRENT_CENTRAL, cambio: CAMBIO_CENTRAL, producao: PRODUCAO_CENTRAL, g: gBase * 100,
    credito: itens.cred.central / 1e6, gp: i27 * 100, go: i27 * 100, pressoes: 0, compressao: 0,
  }
  const PRESETS: { id: string; rotulo: string; p: Premissas }[] = [
    { id: 'ref', rotulo: 'Referência da equipe', p: inicio },
    { id: 'prud', rotulo: 'Prudente', p: { ...inicio, brent: 60, producao: PRODUCAO_LDO, g: i27 * 100, gp: tend * 100, pressoes: PRESSAO_PODERES_EMENDAS } },
    { id: 'pressao', rotulo: 'Pressão de despesa', p: { ...inicio, gp: tend * 100, pressoes: PRESSAO_PODERES_EMENDAS } },
  ]
  const [preset, setPreset] = useState('ref')
  const [p, setP] = useState<Premissas>(inicio)
  const muda = (k: keyof Premissas) => (e: { target: { value: string } }) => { setPreset(''); setP((a) => ({ ...a, [k]: Number(e.target.value) || 0 })) }
  const escolhe = (id: string) => { setPreset(id); setP(PRESETS.find((x) => x.id === id)!.p) }

  const res = useMemo(() => {
    const g = p.g / 100
    const ajuste = receitaPetroleo(p.brent, p.cambio, p.producao).transferencias - petroleo26 * (1 + g)
    const nivel = (k: string) => {
      const it = itens[k]
      if (k === 'cap') return itens.capout.central + p.credito * 1e6
      let b = (it.central - (it.pontual ?? 0)) * (SEM_CRESCIMENTO.has(k) ? 1 : 1 + g)
      if (k === 'transf') b += ajuste
      return b
    }
    const correntes = ['imp', 'taxas', 'contrib', 'patrim', 'transf', 'demais'].reduce((t, k) => t + nivel(k), 0)
    const intra = nivel('intra'), cap = nivel('cap'), ded = nivel('ded')
    const total = correntes + intra + cap + ded
    const rcl = correntes + ded - propPrevid * correntes
    const pessoal = projD.itens.pessoal.central * (1 + p.gp / 100)
    const demais = (projD.itens.tot.central - projD.itens.pessoal.central) * (1 + p.go / 100)
    const desp = pessoal + demais + p.pressoes * 1e6 - p.compressao * 1e6
    return { total, rcl, desp, pessoal, resultado: total - desp }
  }, [p, itens, projD, petroleo26, propPrevid])

  /* referências alternativas para a despesa executável de 2027: inercial, limite pela receita do cenário e folha pela tendência */
  const resultadoMedio = [0, 1, 2].reduce((t, c) => t + (R.total[c] - D.total[c]), 0) / 3
  const refInercial = projD.itens.tot.central * (1 + i27)
  const limiteReceita = res.total - resultadoMedio
  const pessoalInercial = projD.itens.pessoal.central * (1 + i27)
  const comPessoalTendencia = refInercial - pessoalInercial + projD.itens.pessoal.central * (1 + tend)
  const compressaoNecessaria = comPessoalTendencia - limiteReceita

  const ploa = {
    total: R.total[5], rcl: rclOficial.ploa27.rcl, desp: D.total[5] - D.reserva_rpps[5] - D.reserva_contingencia[5], pessoal: D.pessoal[5],
  }
  const reservas = D.reserva_rpps[5] + D.reserva_contingencia[5]
  const refsDespesa = [
    { chave: 'inercial', rotulo: 'Inercial', sub: 'Proj. 26 corrigida pelo IPCA', v: refInercial },
    { chave: 'receita', rotulo: 'Limite pela receita', sub: `Receita do cenário menos o resultado médio de 2023–25 (R$ ${numero(resultadoMedio / 1e9, 2)} bi)`, v: limiteReceita },
    { chave: 'pessoal', rotulo: 'Pessoal pela tendência', sub: `Folha +${numero(tend * 100, 1)}% a.a. (média de 2024–26); demais despesas inerciais`, v: comPessoalTendencia },
  ].map((x) => ({ ...x, d: ploa.desp - x.v, pct: (ploa.desp / x.v - 1) * 100 }))
  const excesso = res.total - ploa.total
  const creditos = Math.max(res.desp - ploa.desp, 0)
  const linhas = [
    { chave: 'rec', rotulo: 'Receita total (líquida de deduções)', ploa: mi(ploa.total), cen: mi(res.total), dif: dMi(res.total - ploa.total) },
    { chave: 'rcl', rotulo: 'RCL (LRF, art. 2º, IV)', ploa: mi(ploa.rcl), cen: mi(res.rcl), dif: dMi(res.rcl - ploa.rcl) },
    { chave: 'desp', rotulo: 'Despesa executável (sem reservas)', ploa: mi(ploa.desp), cen: mi(res.desp), dif: dMi(res.desp - ploa.desp) },
    { chave: 'res', rotulo: 'Resultado antes das reservas', ploa: mi(ploa.total - ploa.desp), cen: mi(res.resultado), dif: dMi(res.resultado - (ploa.total - ploa.desp)) },
    { chave: 'exc', rotulo: 'Excesso de arrecadação sobre a PLOA', ploa: '–', cen: mi(excesso), dif: '' },
    { chave: 'cont', rotulo: 'Reserva de contingência (fonte admitida no art. 6º, V)', ploa: mi(contingencia), cen: mi(contingencia), dif: '' },
    { chave: 'cred', rotulo: 'Créditos suplementares necessários (despesa acima da PLOA)', ploa: '–', cen: mi(creditos), dif: '' },
    { chave: 'lim', rotulo: 'Créditos necessários ÷ limite do art. 6º', ploa: '–', cen: `${numero((creditos / LIMITE_SUPLEMENTAR) * 100, 0)}%`, dif: '' },
    { chave: 'cob', rotulo: 'Excesso e contingência menos créditos necessários', ploa: '–', cen: mi(excesso + contingencia - creditos), dif: '' },
    { chave: 'pes', rotulo: 'Pessoal bruto ÷ RCL', ploa: `${numero((ploa.pessoal / ploa.rcl) * 100, 1)}%`, cen: `${numero((res.pessoal / res.rcl) * 100, 1)}%`, dif: '' },
  ]

  return (
    <div className="space-y-3">
      <Cartao titulo="Cenários de 2027: premissas">
        <div role="group" aria-label="Cenários prontos" className="mb-3 flex flex-wrap gap-1.5">
          {PRESETS.map((x) => (
            <button key={x.id} type="button" aria-pressed={preset === x.id} onClick={() => escolhe(x.id)}
              className={`rounded-brand border px-3 py-1.5 text-small ${preset === x.id ? 'border-navy bg-navy font-semibold text-on-navy' : 'border-line bg-paper text-ink'}`}>{x.rotulo}</button>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-small font-semibold text-ink">Receita</legend>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-small text-ink-soft">
              <label className="flex flex-col gap-1">Brent (US$/barril)<input type="number" inputMode="decimal" min={20} max={200} step={5} value={p.brent} onChange={muda('brent')} className={campo} /></label>
              <label className="flex flex-col gap-1">Câmbio (R$/US$)<input type="number" inputMode="decimal" min={3} max={8} step={0.1} value={p.cambio} onChange={muda('cambio')} className={campo} /></label>
              <label className="flex flex-col gap-1">Produção do ES (mil bbl/d)<input type="number" inputMode="decimal" min={100} max={500} step={10} value={p.producao} onChange={muda('producao')} className={campo} /></label>
              <label className="flex flex-col gap-1">Crescimento nominal, exceto petróleo (%)<input type="number" inputMode="decimal" min={-5} max={20} step={0.5} value={Number(p.g.toFixed(1))} onChange={muda('g')} className={campo} /></label>
              <label className="flex flex-col gap-1">Operações de crédito (R$ mi)<input type="number" inputMode="decimal" min={0} max={4000} step={100} value={Math.round(p.credito)} onChange={muda('credito')} className={campo} /></label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-small font-semibold text-ink">Despesa</legend>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-small text-ink-soft">
              <label className="flex flex-col gap-1">Crescimento do pessoal (%)<input type="number" inputMode="decimal" min={0} max={20} step={0.5} value={Number(p.gp.toFixed(1))} onChange={muda('gp')} className={campo} /></label>
              <label className="flex flex-col gap-1">Crescimento das demais despesas (%)<input type="number" inputMode="decimal" min={-10} max={20} step={0.5} value={Number(p.go.toFixed(1))} onChange={muda('go')} className={campo} /></label>
              <label className="flex flex-col gap-1">Poderes e emendas (R$ mi)<input type="number" inputMode="decimal" min={0} max={2000} step={50} value={p.pressoes} onChange={muda('pressoes')} className={campo} /></label>
              <label className="flex flex-col gap-1">Compressão de despesas (R$ mi)<input type="number" inputMode="decimal" min={0} max={5000} step={100} value={p.compressao} onChange={muda('compressao')} className={campo} /></label>
            </div>
          </fieldset>
        </div>
        <p className={`mt-3 ${NOTA_DISCRETA}`}>
          Com as premissas iniciais o cenário reproduz a referência da equipe da Visão geral: petróleo pelo Brent da EIA (US$ {numero(BRENT_CENTRAL, 0)}) e pelo câmbio do Focus, demais receitas crescendo {numero(gBase * 100, 1)}% (IPCA e PIB real), crédito no nível de 2026, pessoal e demais despesas pelo IPCA ({numero(i27 * 100, 1)}%). &ldquo;Prudente&rdquo;: Brent de US$ 60 e produção da LDO, receita sem PIB real, pessoal na tendência de 2024–26 ({numero(tend * 100, 1)}%) e R$ {PRESSAO_PODERES_EMENDAS} mi de Poderes e emendas. &ldquo;Pressão de despesa&rdquo;: receita da referência, com pessoal na tendência e os mesmos R$ {PRESSAO_PODERES_EMENDAS} mi. Poderes e emendas somam despesa; a compressão a retira, por exemplo das dotações livres.
        </p>
      </Cartao>

      <Cartao titulo="Cenários de 2027: resultado">
        <TabelaItens altura="livre" compacta itens={linhas} legenda="Resultado do cenário de 2027 contra a PLOA, em R$ milhões" colunas={[
          { rotulo: 'R$ milhões', valor: (l) => <span className={l.chave === 'res' || l.chave === 'cob' ? 'font-semibold' : 'font-medium text-ink'}>{l.rotulo}</span> },
          { rotulo: 'PLOA 27', valor: (l) => l.ploa },
          { rotulo: 'Cenário', valor: (l) => <span className="font-semibold">{l.cen}</span> },
          { rotulo: 'Dif.', secundaria: true, valor: (l) => l.dif || '–' },
        ]} />
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          A PLOA fecha em zero porque as reservas (R$ {mi(reservas)} mi) são despesa orçada; o resultado antes das reservas é a folga que a proposta guarda. Créditos suplementares necessários: a despesa do cenário acima da despesa executável da PLOA; o limite do art. 6º (R$ {numero(LIMITE_SUPLEMENTAR / 1e9, 2)} bi) vale para todas as fontes (anulação, excesso de arrecadação, superávit financeiro, crédito e reserva de contingência). &ldquo;Excesso e contingência menos créditos&rdquo; positivo indica que o excesso de arrecadação e a reserva de contingência cobririam os créditos; negativo, que o resto precisaria vir de superávit financeiro de 2026, de anulação de outras dotações ou de compressão (a reserva do RPPS não é fonte). Pessoal e demais despesas partem do fechamento projetado de 2026 ({fmtPct(((projD.itens.tot.central / 1e9) / (D.total[2] / 1e9) - 1) * 100)} sobre 2025).
        </p>
      </Cartao>
      <Cartao titulo="Despesa de 2027: referências alternativas">
        <TabelaItens altura="livre" compacta itens={refsDespesa} legenda="Referências para a despesa executável de 2027 e a PLOA, em R$ milhões" colunas={[
          { rotulo: 'R$ milhões', valor: (x) => <><span className="font-medium text-ink">{x.rotulo}</span><span className="block text-label font-normal normal-case tracking-normal text-ink-soft">{x.sub}</span></> },
          { rotulo: 'Proj. 27', valor: (x) => mi(x.v) },
          { rotulo: 'PLOA 27', valor: () => mi(ploa.desp) },
          { rotulo: 'Dif. R$ mi', valor: (x) => <span className="font-semibold">{dMi(x.d)}</span> },
          { rotulo: 'Dif. %', secundaria: true, valor: (x) => fmtPct(x.pct) },
        ]} />
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          Despesa executável, sem reservas. O resultado orçamentário (receita líquida menos despesa empenhada) foi positivo em 2023, 2024 e 2025: a despesa ficou abaixo da receita, e o limite pela receita supõe que isso se repita; ele acompanha a receita do cenário escolhido acima. Com a folha na tendência recente e o total no limite da receita, as demais despesas teriam de ficar R$ {mi(compressaoNecessaria)} milhões ({numero((compressaoNecessaria / (refInercial - pessoalInercial)) * 100, 1)}%) abaixo da trajetória inercial. A PLOA é o orçamento inicial, que historicamente fecha abaixo do executado e é complementado por créditos adicionais ao longo do ano.
        </p>
      </Cartao>
    </div>
  )
}
