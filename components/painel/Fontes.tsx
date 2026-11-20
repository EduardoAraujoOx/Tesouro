'use client'

import { useMemo, useState } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'
import cafRaw from '@/data/icms-caf.json'
import { BRENT_CENTRAL, CAMBIO_CENTRAL, EDICAO_EIA, PRODUCAO_CENTRAL, PRODUCAO_LDO, prev, receitaPetroleo, sens } from './petroleo'
import { analisaFontes, implicitoPetroleo, mesesCorte, projecaoItens, type AnaliseFonte, type DadosReceita } from './projecao'

export type PetroleoSefaz = {
  fonte: string; coletado_em: string
  meses: { ano: number; mes: number; naturezas: Record<string, { prevista: number; mes: number; acumulado: number }> }[]
}

export type PetroleoMercado = {
  coletado_em: string
  fontes: Record<'brent' | 'cambio' | 'producao', string>
  brent: Record<string, number>; cambio: Record<string, number>; producao: Record<string, number>
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mi = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : milhoes(x === 0 ? 0 : x, 0))
const dMi = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${milhoes(Math.abs(x), 0)}`

/** Cor de fundo de uma variação: azul para aumento, rosa para queda, com intensidade até ±30%. */
function fundo(v: number | null): string | undefined {
  if (v === null) return undefined
  const a = Math.min(Math.abs(v) / 30, 1) * 0.28
  return v >= 0 ? `rgb(var(--serie3) / ${a.toFixed(2)})` : `rgb(var(--serie2) / ${a.toFixed(2)})`
}

/**
 * Petróleo aberto por natureza (demonstrativo mensal da SEFAZ). O Portal agrega as quatro naturezas numa alínea só; aqui se separa o que é
 * recorrente (royalties e excedente da produção) do que é lumpy e muito sensível a preço, câmbio e produção (participação especial).
 */
function PetroleoPorNatureza({ dados }: { dados: PetroleoSefaz }) {
  const achar = (ano: number, mes: number) => dados.meses.find((m) => m.ano === ano && m.mes === mes)
  const ultima = dados.meses.filter((m) => m.ano === 2026).at(-1)!
  const k = ultima.mes
  const acum = (ano: number, mes: number, cods: string[]) => cods.reduce((s, c) => s + (achar(ano, mes)?.naturezas[c]?.acumulado ?? 0), 0)
  const mensal = (ano: number, mes: number, cods: string[]) => cods.reduce((s, c) => s + (achar(ano, mes)?.naturezas[c]?.mes ?? 0), 0)
  const ROY = '17125211', EXC = '17125221', PE = '17125231', FEP = '17125241'
  const linhas = [
    { chave: 'roy', rotulo: 'Royalties (Lei 7.990/89)', c: [ROY], ldo: null as number | null, ident: false },
    { chave: 'exc', rotulo: 'Excedente da produção (Lei 9.478/97, art. 49)', c: [EXC], ldo: null, ident: false },
    { chave: 'sub', rotulo: 'Royalties + excedente', c: [ROY, EXC], ldo: 693.8e6, ident: true },
    { chave: 'pe', rotulo: 'Participação especial', c: [PE], ldo: 527.2e6, ident: true },
    { chave: 'fep', rotulo: 'Fundo Especial do Petróleo', c: [FEP], ldo: 19.8e6, ident: true },
    { chave: 'tot', rotulo: 'Total das quatro (principal)', c: [ROY, EXC, PE, FEP], ldo: 1240.8e6, ident: true },
  ].map((l) => ({ ...l, a25: acum(2025, 12, l.c), p25: acum(2025, k, l.c), p26: acum(2026, k, l.c) }))
  const nomeMes = MESES[k - 1]
  const meses = Array.from({ length: k }, (_, i) => i + 1)
  const serie = [
    { chave: 'r26', rotulo: 'Royalties + excedente, 2026', c: [ROY, EXC], ano: 2026 },
    { chave: 'r25', rotulo: 'Royalties + excedente, 2025', c: [ROY, EXC], ano: 2025 },
    { chave: 'p26', rotulo: 'Participação especial, 2026', c: [PE], ano: 2026 },
    { chave: 'p25', rotulo: 'Participação especial, 2025', c: [PE], ano: 2025 },
  ]
  const pe = linhas.find((l) => l.chave === 'pe')!
  const sub = linhas.find((l) => l.chave === 'sub')!
  return (
    <Cartao titulo="Petróleo por natureza: royalties, excedente e participação especial">
      <Nota titulo="Notas"><p>
        De janeiro a {nomeMes}, a participação especial somou R$ {numero(pe.p26 / 1e6, 0)} mi, {numero((pe.p26 / pe.p25 - 1) * 100, 0)}% acima do mesmo período de 2025; royalties e excedente, juntos, R$ {numero(sub.p26 / 1e6, 0)} mi ({fmtPct((sub.p26 / sub.p25 - 1) * 100)}).
      </p></Nota>
      <div className="mt-3">
        <TabelaItens altura="livre" itens={linhas} legenda="Petróleo por natureza, acumulado em R$ milhões" colunas={[
          { rotulo: 'R$ milhões', valor: (l) => <span className={l.ident ? 'font-semibold' : ''}>{l.rotulo}</span> },
          { rotulo: '2025 (ano)', secundaria: true, valor: (l) => mi(l.a25) },
          { rotulo: `Jan–${nomeMes} 2025`, secundaria: true, valor: (l) => mi(l.p25) },
          { rotulo: `Jan–${nomeMes} 2026`, valor: (l) => <span className="font-semibold">{mi(l.p26)}</span> },
          { rotulo: 'Variação', valor: (l) => fmtPct((l.p26 / l.p25 - 1) * 100) },
          { rotulo: 'Base LDO 2027', valor: (l) => (l.ldo === null ? '–' : mi(l.ldo)) },
        ]} />
      </div>
      <div className="mt-3">
        <TabelaItens altura="livre" itens={serie} legenda="Arrecadação de cada mês, em R$ milhões" colunas={[
          { rotulo: 'Realizado no mês, R$ milhões', valor: (s) => s.rotulo },
          ...meses.map((m) => ({ rotulo: MESES[m - 1], valor: (s: (typeof serie)[number]) => mi(mensal(s.ano, m, s.c)) })),
        ]} />
      </div>
      <Nota titulo="Metodologia e limites">
        <p>
          A participação especial é paga por trimestre (fevereiro, maio, agosto e novembro concentram o valor): por isso a linha mensal tem picos e meses quase vazios, e o acumulado do ano é a leitura confiável. Royalties e excedente da produção são mais regulares, e a alta de 2026 neles aparece a partir do segundo trimestre (no 1º trimestre royalties e excedente ficaram em R$ {numero(((achar(2026, 3)?.naturezas[ROY].acumulado ?? 0) + (achar(2026, 3)?.naturezas[EXC].acumulado ?? 0)) / 1e6, 0)} mi, contra R$ {numero(((achar(2025, 3)?.naturezas[ROY].acumulado ?? 0) + (achar(2025, 3)?.naturezas[EXC].acumulado ?? 0)) / 1e6, 0)} mi em 2025).
        </p>
        <p>
          A coluna da LDO reproduz o cenário base de 2027 (Brent a US$ 60). A LDO não diz se a linha “royalties” (R$ 693,8 mi) inclui o excedente da produção; a hipótese de que inclui é sugerida pelo realizado de 2025, em que royalties mais excedente somaram R$ {numero(sub.a25 / 1e6, 0)} mi, e é a que a tabela adota. Se for isso, a base de 2027 fica próxima do patamar de 2025, e a participação especial da base (R$ 527 mi) abaixo dos R$ {numero(pe.a25 / 1e6, 0)} mi de 2025, ambos bem abaixo do ritmo de 2026. Os valores são das naturezas “principal” (sem multas e juros de mora, cerca de 2% a 3% do total da alínea). Fonte: demonstrativo mensal da realização da receita, SEFAZ-ES, até {nomeMes}/2026; o Portal de Dados Abertos é mais recente, mas não abre as naturezas.
        </p>
      </Nota>
    </Cartao>
  )
}

/**
 * As três premissas que movem a receita de petróleo (Brent, câmbio e produção do Estado), no realizado, contra as da LDO 2027.
 * Responde se a base de 2027 é prudente ou apenas baixa: aqui se vê o que o mercado e a produção de fato fizeram em 2026.
 */
function PetroleoMercadoCartao({ m }: { m: PetroleoMercado }) {
  const media = (serie: Record<string, number>, ano: number, ate?: number) => {
    const v = Object.entries(serie).filter(([k]) => Number(k.slice(0, 4)) === ano && (ate === undefined || Number(k.slice(5)) <= ate)).map(([, x]) => x)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN
  }
  const ultimos3 = (serie: Record<string, number>) => {
    const ks = Object.keys(serie).sort().slice(-3)
    return ks.reduce((a, k) => a + serie[k], 0) / ks.length
  }
  const ult = (serie: Record<string, number>) => Object.keys(serie).sort().at(-1)!
  const rot = (serie: Record<string, number>) => { const k = ult(serie); return `${MESES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}` }
  const linhas = [
    { chave: 'brent', rotulo: 'Brent (US$ por barril)', serie: m.brent, casas: 0, base: 60, frust: 54 },
    { chave: 'cambio', rotulo: 'Câmbio (R$ por US$)', serie: m.cambio, casas: 2, base: 5.4, frust: 5.2 },
    { chave: 'prod', rotulo: 'Produção do ES (mil barris/dia)', serie: m.producao, casas: 0, base: 224.5, frust: 162.3 },
  ].map((l) => {
    const a25 = media(l.serie, 2025), a26 = media(l.serie, 2026), u3 = ultimos3(l.serie)
    return { ...l, a25, a26, u3, ate: rot(l.serie), pct: (a26 / l.base - 1) * 100 }
  })
  const f = (x: number, c: number) => numero(x, c)
  const brent = linhas[0], prod = linhas[2]
  return (
    <Cartao titulo="Petróleo: Brent, câmbio e produção realizados e premissas da LDO 2027">
      <Nota titulo="Notas"><p>
        Em 2026 o Brent médio foi US$ {f(brent.a26, 0)} e a produção do Espírito Santo {f(prod.a26, 0)} mil barris por dia: {f(brent.pct, 0)}% e {f(prod.pct, 0)}% acima do cenário base da LDO 2027 (US$ {f(brent.base, 0)} e {f(prod.base, 1)} mil), com o câmbio próximo do suposto.
      </p></Nota>
      <div className="mt-3">
        <TabelaItens altura="livre" itens={linhas} legenda="Brent, câmbio e produção: realizado e premissas da LDO 2027" colunas={[
          { rotulo: 'Variável', valor: (l) => <span className="font-semibold">{l.rotulo}</span> },
          { rotulo: '2025 (média)', secundaria: true, valor: (l) => f(l.a25, l.casas) },
          { rotulo: '2026 (média)', valor: (l) => <span className="font-semibold">{f(l.a26, l.casas)}</span> },
          { rotulo: '3 últimos meses', secundaria: true, valor: (l) => f(l.u3, l.casas) },
          { rotulo: 'LDO 2027 base', valor: (l) => f(l.base, l.casas === 0 && l.chave === 'prod' ? 1 : l.casas) },
          { rotulo: '2026 sobre a base', valor: (l) => fmtPct(l.pct) },
        ]} />
      </div>
      <Nota titulo="Metodologia e limites">
        <p>
          A receita de petróleo do Estado depende do preço do barril, do câmbio e da produção (a participação especial, ainda, da escala dos campos). A tabela compara a média de 2026 (até o último mês de cada série: Brent {linhas[0].ate}, câmbio {linhas[1].ate}, produção {linhas[2].ate}) com as premissas do cenário base de 2027 na LDO. Com o Brent no patamar de 2026, a base da LDO é de fato um cenário de preços bem mais baixos, não uma projeção do que vem sendo realizado: a diferença não vem do câmbio. O Brent oscila muito (média mensal de US$ {f(Math.min(...Object.entries(m.brent).filter(([k]) => k.startsWith('2026')).map(([, x]) => x)), 0)} a US$ {f(Math.max(...Object.entries(m.brent).filter(([k]) => k.startsWith('2026')).map(([, x]) => x)), 0)} em 2026), então o cenário prudente da LDO protege contra reversão, mas deixa de fora o que o preço atual já entrega.
        </p>
        <p>
          Limites: a produção é a do Estado (terra e mar), e a receita depende também de campo, alíquota e do mês de pagamento, que defasa o preço da arrecadação em dois ou três meses. Brent: média mensal da série diária FOB do Ipeadata (EIA). Câmbio: PTAX de venda, Banco Central. Produção: ANP, dados abertos. Dados coletados em {new Date(m.coletado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
        </p>
      </Nota>
    </Cartao>
  )
}

/* ICMS por segmento econômico (CAF), do Receita em Foco da SEFAZ-ES: anual de 2023 a 2025 e 1º trimestre de 2024 a 2026. */
type Caf = { fonte: string; anual: Record<string, Record<string, number>>; primeiro_trimestre: Record<string, Record<string, number>> }
const caf = cafRaw as unknown as Caf
const NOMES_CAF: Record<string, string> = {
  'comercio atacadista': 'Comércio atacadista', 'industria do petroleo': 'Indústria do petróleo', 'substituicao tributaria': 'Substituição tributária',
  'comercio varejista': 'Comércio varejista', industria: 'Indústria', 'comercio exterior': 'Comércio exterior', 'energia eletrica': 'Energia elétrica',
  'comercio atacadista de cafe': 'Comércio atacadista de café', transporte: 'Transporte', 'simples nacional': 'Simples Nacional', comunicacao: 'Comunicação',
}
function IcmsPorSegmento() {
  const t = (d: Record<string, number>) => Object.values(d).reduce((a, b) => a + b, 0)
  const a24 = caf.anual['2024'], a25 = caf.anual['2025'], q25 = caf.primeiro_trimestre['2025'], q26 = caf.primeiro_trimestre['2026']
  const T24 = t(a24), T25 = t(a25), Q25 = t(q25), Q26 = t(q26)
  const chaves = Object.keys(a25).sort((x, y) => a25[y] - a25[x])
  const principais = chaves.filter((c) => NOMES_CAF[c])
  const demais = chaves.filter((c) => !NOMES_CAF[c])
  const soma = (d: Record<string, number>, cs: string[]) => cs.reduce((a, c) => a + (d[c] ?? 0), 0)
  const linha = (chave: string, rotulo: string, cs: string[], negrito = false) => {
    const v24 = soma(a24, cs), v25 = soma(a25, cs), w25 = soma(q25, cs), w26 = soma(q26, cs)
    return { chave, rotulo, negrito, v25, part: (v25 / T25) * 100, g25: v24 ? (v25 / v24 - 1) * 100 : null, c25: ((v25 - v24) / T24) * 100, g26: w25 ? (w26 / w25 - 1) * 100 : null, c26: ((w26 - w25) / Q25) * 100 }
  }
  const itens = [...principais.map((c) => linha(c, NOMES_CAF[c], [c])), linha('demais', 'Demais segmentos', demais), linha('total', 'ICMS total (CAF)', chaves, true)]
  const pp = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${numero(Math.abs(x), 1)}`
  return (
    <Cartao titulo="ICMS por segmento econômico (CAF)">
      <TabelaItens altura="livre" compacta itens={itens} legenda="ICMS por segmento econômico: arrecadação de 2025 e contribuição ao crescimento, em R$ milhões e pontos percentuais" colunas={[
        { rotulo: 'R$ milhões', valor: (l) => <span className={l.negrito ? 'font-semibold' : 'font-medium'}>{l.rotulo}</span> },
        { rotulo: '2025', valor: (l) => <span className={l.negrito ? 'font-semibold' : ''}>{mi(l.v25)}</span> },
        { rotulo: 'Part. %', secundaria: true, valor: (l) => numero(l.part, 1) },
        { rotulo: 'Δ% 2025', valor: (l) => fmtPct(l.g25 ?? undefined) },
        { rotulo: 'Contrib. 2025 (p.p.)', secundaria: true, valor: (l) => pp(l.c25) },
        { rotulo: 'Δ% 1T26', valor: (l) => fmtPct(l.g26 ?? undefined) },
        { rotulo: 'Contrib. 1T26 (p.p.)', secundaria: true, valor: (l) => pp(l.c26) },
      ]} />
      <Nota titulo="Metodologia e fontes">
        <p>
          Arrecadação de ICMS por Código de Atividade Fiscal (CAF) do contribuinte, do relatório Receita em Foco da SEFAZ-ES (quadro anual de 2025 e quadro do 1º trimestre de 2026). Δ%: variação sobre 2024 e sobre o 1º trimestre de 2025. Contribuição: variação do segmento dividida pela arrecadação total do período anterior, em pontos percentuais (soma o crescimento do total: {fmtPct((T25 / T24 - 1) * 100)} em 2025 e {fmtPct((Q26 / Q25 - 1) * 100)} no 1º trimestre de 2026). “Demais segmentos”: combustíveis, rochas ornamentais, inexatas, agropecuária, MEI e demais atividades.
        </p>
        <p>
          O total do relatório (R$ {numero(T25 / 1e9, 2)} bi em 2025) difere em cerca de 0,7% do ICMS do RREO e do Portal. O relatório trimestral não traz o detalhamento mensal por segmento depois de dezembro de 2024 (as planilhas mensais da SEFAZ vão até 2024) e os segmentos podem ser reclassificados entre edições.
        </p>
      </Nota>
    </Cartao>
  )
}

const NOMES_MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function SensibilidadePetroleo({ implicito }: { implicito: number }) {
  const [cambio, setCambio] = useState(CAMBIO_CENTRAL)
  const [producao, setProducao] = useState(PRODUCAO_CENTRAL)
  const [brent, setBrent] = useState(BRENT_CENTRAL)
  const lin = (b: number, rotulo: string, destaque = false) => ({ chave: rotulo, rotulo, b, destaque, ...receitaPetroleo(b, cambio, producao) })
  const grade = [60, 70, 80, 90, 100].map((b) => lin(b, `US$ ${b}`))
  const escolhida = lin(brent, `US$ ${numero(brent, 0)} (escolhido)`, true)
  const media26 = lin(sens.base_2026.brent, `US$ ${numero(sens.base_2026.brent, 0)} (média 2026)`)
  let lo = 10, hi = 300
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (receitaPetroleo(mid, cambio, producao).transferencias < implicito) lo = mid; else hi = mid }
  const equivalente = (lo + hi) / 2
  const itens = [...grade.filter((g) => g.b !== brent), escolhida, media26].sort((x, y) => x.b - y.b)
  const fontesBrent = [
    { chave: 'eia', fonte: `EIA, ${EDICAO_EIA} (valor central)`, valor: prev.eia.media_2027, central: true },
    ...prev.outras_previsoes_2027.map((o, i) => ({ chave: `o${i}`, fonte: o.fonte, valor: o.preco_2027, central: false })),
    { chave: 'ldo', fonte: 'LDO 2027 (premissa)', valor: 60, central: false },
    { chave: 'm26', fonte: 'Média de 2026 (realizado até novembro)', valor: sens.base_2026.brent, central: false },
  ]
  const campo = 'w-24 rounded-brand border border-line bg-paper px-2 py-1 text-small tabular-nums'
  return (
    <Cartao titulo="Petróleo: receita do Estado por cotação média do Brent em 2027">
      <div className="mb-3">
        <TabelaItens altura="livre" compacta itens={fontesBrent} legenda="Brent médio de 2027: previsões e premissas, em US$ por barril" colunas={[
          { rotulo: 'Brent médio de 2027', valor: (f) => <span className={f.central ? 'font-semibold' : ''}>{f.fonte}</span> },
          { rotulo: 'US$/bbl', valor: (f) => <span className={f.central ? 'font-semibold' : ''}>{numero(f.valor, 1)}</span> },
          { rotulo: '', valor: (f) => <button type="button" onClick={() => setBrent(Math.round(f.valor))} className="text-label underline underline-offset-4">usar</button> },
        ]} />
      </div>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-small text-ink-soft">
        <label className="flex flex-col gap-1">Brent (US$/barril)<input type="number" inputMode="decimal" min={20} max={200} step={5} value={brent} onChange={(e) => setBrent(Number(e.target.value) || 0)} className={campo} /></label>
        <label className="flex flex-col gap-1">Câmbio (R$/US$)<input type="number" inputMode="decimal" min={3} max={8} step={0.1} value={cambio} onChange={(e) => setCambio(Number(e.target.value) || 0)} className={campo} /></label>
        <label className="flex flex-col gap-1">Produção do ES (mil bbl/d)<input type="number" inputMode="decimal" min={100} max={500} step={10} value={producao} onChange={(e) => setProducao(Number(e.target.value) || 0)} className={campo} /></label>
        <span className="flex gap-2 pb-1">
          <button type="button" onClick={() => setProducao(PRODUCAO_CENTRAL)} className="text-label underline underline-offset-4">média de 2026</button>
          <button type="button" onClick={() => setProducao(PRODUCAO_LDO)} className="text-label underline underline-offset-4">base da LDO</button>
        </span>
      </div>
      <div className="mt-3">
        <TabelaItens altura="livre" compacta itens={[...itens, { chave: 'ploa', rotulo: `PLOA 2027 (implícito): US$ ${numero(equivalente, 0)}`, b: equivalente, destaque: false, royExc: NaN, pe: NaN, transferencias: implicito, icms: NaN }]} legenda="Receita de petróleo do Estado em 2027 por cotação do Brent, em R$ milhões" colunas={[
          { rotulo: 'Brent', valor: (l) => <span className={l.destaque ? 'font-semibold' : ''}>{l.rotulo}</span> },
          { rotulo: 'Royalties + excedente', secundaria: true, valor: (l) => (Number.isFinite(l.royExc) ? mi(l.royExc) : '–') },
          { rotulo: 'Part. especial', secundaria: true, valor: (l) => (Number.isFinite(l.pe) ? mi(l.pe) : '–') },
          { rotulo: 'Transferências', valor: (l) => <span className="font-semibold">{mi(l.transferencias)}</span> },
          { rotulo: 'ICMS petróleo', valor: (l) => (Number.isFinite(l.icms) ? mi(l.icms) : '–') },
        ]} />
      </div>
      <Nota titulo="Metodologia e fontes">
        <p>
          Valor central do Brent: média de 2027 da previsão mais recente da EIA (Short-Term Energy Outlook, {EDICAO_EIA}), com câmbio da mediana do Focus (R$ {numero(CAMBIO_CENTRAL, 2)}, {prev.cambio_focus_2027.respondentes} respondentes) e produção da média de 2026; Banco Mundial e FMI conforme divulgados (o FMI usa a média de Brent, Dubai e WTI). A previsão da EIA é revista todo mês: em janeiro de 2026 estimava US$ 54 para 2027. Intervalo de sensibilidade não tratado aqui.
        </p>
        <p>
          Transferências (alínea 171252): royalties + excedente (proporcionais a preço em reais × produção, defasagem de {sens.royalties.defasagem_meses} meses) e participação especial (elasticidade {numero(sens.participacao_especial.elasticidade, 1)} à média trimestral de preço × produção), vezes {numero(sens.fator_alinea_171252, 3)} (multas, juros e FEP, que completam a alínea 171252). ICMS da indústria do petróleo (CAF): elasticidade {numero(sens.icms_petroleo.elasticidade_preco, 2)} ao preço em reais (R² {numero(sens.icms_petroleo.r2, 2)}), a partir da arrecadação de 2025 (R$ {mi(sens.base_2025.icms_petroleo)} mi). O ICMS não entra no total das transferências. Valores anuais, brutos de deduções.
        </p>
        <p>
          PLOA 2027 (implícito): petróleo deduzido das transferências da União da PLOA (aba Fontes e grupos), comparado com as transferências do modelo no câmbio e na produção informados. Brent de 2026: média até {NOMES_MES_CURTO[10]}; produção de 2026: média até setembro (ANP).
        </p>
      </Nota>
    </Cartao>
  )
}

function RelacoesPetroleo() {
  const r = sens.royalties, pe = sens.participacao_especial, ic = sens.icms_petroleo
  const melhor = r.por_defasagem.find((l) => l.defasagem === r.defasagem_meses)!
  const itens = [
    { chave: 'roy', rotulo: 'Royalties + excedente', espec: `preço em reais e produção, defasagem de ${r.defasagem_meses} meses`, ep: numero(melhor.elast_preco, 2), eq: numero(melhor.elast_producao, 2), r2: numero(melhor.r2, 2), n: `${r.amostra.n} meses`, oos: `jan–jul/2026: previsto ${mi(r.fora_da_amostra.previsto)}, realizado ${mi(r.fora_da_amostra.realizado)}` },
    { chave: 'pe', rotulo: 'Participação especial', espec: 'preço × produção, média dos 3 meses que terminam 2 meses antes do pagamento', ep: numero(pe.elasticidade, 2), eq: '–', r2: numero(pe.r2, 2), n: `${pe.n} pagamentos`, oos: `calibrada até 2025 (elasticidade ${numero(pe.elasticidade_ate_2025, 1)}), prevê ${mi(pe.fora_da_amostra[pe.fora_da_amostra.length - 1].previsto)} para ${pe.fora_da_amostra[pe.fora_da_amostra.length - 1].mes.slice(5, 7)}/${pe.fora_da_amostra[pe.fora_da_amostra.length - 1].mes.slice(0, 4)}; realizado estimado ${mi(pe.fora_da_amostra[pe.fora_da_amostra.length - 1].realizado)}` },
    { chave: 'icms', rotulo: 'ICMS da indústria do petróleo', espec: 'preço em reais, defasagem de 1 mês', ep: numero(ic.elasticidade_preco, 2), eq: '–', r2: numero(ic.r2, 2), n: `${ic.n} meses`, oos: '–' },
  ]
  return (
    <Cartao titulo="Relações estimadas entre receita e cotação (2019–2026)">
      <TabelaItens altura="livre" itens={itens} legenda="Relações estimadas entre a receita de petróleo e a cotação" colunas={[
        { rotulo: 'Receita', valor: (l) => <span className="font-medium">{l.rotulo}</span> },
        { rotulo: 'Elast. preço', valor: (l) => l.ep },
        { rotulo: 'Elast. produção', secundaria: true, valor: (l) => l.eq },
        { rotulo: 'R²', valor: (l) => l.r2 },
        { rotulo: 'Amostra', secundaria: true, valor: (l) => l.n },
      ]} />
      <Nota titulo="Especificação e validação">
        <p>
          Royalties + excedente: {itens[0].espec}; regressão log-log livre sobre a receita mensal (RREO até 2025, demonstrativo da SEFAZ em 2026); elasticidades próximas de 1 indicam receita proporcional a preço × volume; defasagem de 2 meses escolhida pelo R² ({r.por_defasagem.map((l) => `${l.defasagem}: ${numero(l.r2, 2)}`).join('; ')}). Para a projeção, a elasticidade é fixada em 1 e só se estima o fator k (estável entre 2019 e 2026). Fora da amostra: ajustado até 2025, o modelo prevê R$ {mi(r.fora_da_amostra.previsto)} mi para jan–jul/2026, contra R$ {mi(r.fora_da_amostra.realizado)} mi realizados.
        </p>
        <p>
          Participação especial: {itens[1].espec}. {itens[1].oos}. O pagamento de agosto de 2026 é derivado do Portal (alínea 171252 menos royalties + excedente estimados). Relação convexa e instável: a elasticidade cai quando se incluem os pagamentos de 2026, e a incerteza é maior do que nas demais.
        </p>
        <p>
          ICMS da indústria do petróleo: {itens[2].espec}; arrecadação mensal por CAF (planilhas da SEFAZ, 2019–2024). A relação é fraca: parte do segmento não depende do preço do barril.
        </p>
      </Nota>
    </Cartao>
  )
}

/**
 * Os três maiores motores da receita bruta: ICMS, cota-parte do FPE e compensação pela produção de petróleo.
 * Mostra o ritmo mês a mês contra o mesmo mês do ano anterior (para ver aceleração ou desaceleração), o fechamento de 2026 por fonte
 * e o que a PLOA precisa supor para 2027.
 */
export function PrincipaisFontes({ dados, receita, ipca, pib, petroleo, mercado }: { dados: DadosReceita; receita: LinhaMacro[]; ipca: Record<string, number>; pib: Record<string, number>; petroleo?: PetroleoSefaz; mercado?: PetroleoMercado }) {
  const analise = useMemo(() => analisaFontes(dados), [dados])
  const { ultimo } = useMemo(() => mesesCorte(dados), [dados])
  const R = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const icms = analise.find((a) => a.id === 'icms')!
  const soma = analise.reduce((s, a) => s + a.participacao, 0)
  const g27 = (1 + ipca['2027']) * (1 + pib['2027']) - 1
  const impl = useMemo(() => implicitoPetroleo(dados, analise, R.transf_corr_uniao[5], g27), [dados, analise, R, g27])
  const topDownUniao = useMemo(() => projecaoItens(dados).tuniao.central, [dados])
  const nomeCorte = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][ultimo - 1]

  const cenariosIcms = [
    { chave: 'ploa', rotulo: 'PLOA 2027 (implícito)', g: R.icms[5] / icms.central - 1 },
    { chave: 'g3m', rotulo: 'Ritmo dos 3 últimos meses', g: icms.g3m ?? 0 },
    { chave: 'focus', rotulo: 'IPCA + PIB real (Focus)', g: g27 },
    { chave: 'ano', rotulo: 'Ritmo do acumulado no ano', g: icms.gAno ?? 0 },
  ].map((c) => ({ ...c, valor: icms.central * (1 + c.g) }))

  const linhaFonte = (a: AnaliseFonte) => ({ ...a, chave: a.id })
  return (
    <div className="space-y-3">
      <Cartao titulo="Arrecadação mensal de 2026: variação sobre o mesmo mês de 2025">
        <Nota titulo="Notas"><p>As três fontes somam {numero(soma * 100, 0)}% da receita bruta de 2025. Cada célula: crescimento da arrecadação do mês sobre o mesmo mês de 2025.</p><p>A leitura mês a mês separa tendência de sazonalidade e deixa ver se o crescimento está acelerando ou perdendo fôlego. Azul: acima do mesmo mês de 2025; rosa: abaixo (intensidade até ±30%). O petróleo chega em parcelas trimestrais (fevereiro, maio, agosto e novembro concentram a participação especial), por isso oscila muito. Fonte: Portal de Dados Abertos do ES; ICMS e FPE conferem com o RREO (Anexo 03).</p></Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={analise.map(linhaFonte)} legenda="Crescimento da arrecadação de cada mês sobre o mesmo mês de 2025, em %" colunas={[
            { rotulo: 'Fonte', valor: (a) => <span className="font-semibold">{a.rotulo}</span> },
            ...MESES.slice(0, ultimo).map((m, i) => ({
              rotulo: m,
              secundaria: i < ultimo - 3,
              valor: (a: AnaliseFonte) => <span className="block rounded px-1 py-0.5 text-center tabular-nums" style={{ background: fundo(a.yoy[i]) }}>{a.yoy[i] === null ? '–' : `${a.yoy[i]! > 0 ? '+' : a.yoy[i]! < 0 ? '−' : ''}${numero(Math.abs(a.yoy[i]!), 0)}%`}</span>,
            })),
            { rotulo: '3 últ. meses', valor: (a) => <span className="font-semibold">{fmtPct(a.g3m === undefined ? undefined : a.g3m * 100)}</span> },
            { rotulo: `Jan–${MESES[ultimo - 1]}`, valor: (a) => <span className="font-semibold">{fmtPct(a.gAno === undefined ? undefined : a.gAno * 100)}</span> },
          ]} />
        </div>
      </Cartao>

      <IcmsPorSegmento />

      <Cartao titulo="Fechamento de 2026 por fonte">
        <Nota titulo="Metodologia"><p>Pelo método de menor erro no teste retroativo (ICMS: ritmo dos 3 últimos meses; FPE: dos 12 últimos); a faixa vai do menor ao maior resultado entre os métodos.</p>
          <p>Para cada fonte, a projeção usa o método que menos errou quando aplicado aos anos passados: ICMS pelo ritmo dos três últimos meses, FPE pelo ritmo dos doze últimos. A faixa vai do menor ao maior resultado entre os métodos. No petróleo não há história mensal longa para testar; o ritmo recente é a melhor referência, e a faixa é só indicativa.</p>
        </Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={analise.map(linhaFonte)} legenda="Fechamento de 2026 por fonte, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (a) => <><span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[3.5rem] md:text-small">{a.cod}</span><span className="font-semibold">{a.rotulo}</span></> },
            { rotulo: '% da receita bruta 25', valor: (a) => `${numero(a.participacao * 100, 1)}%`, secundaria: true },
            { rotulo: 'Realizado 2025', valor: (a) => mi(a.fechou2025), secundaria: true },
            { rotulo: `Jan–${MESES[ultimo - 1]} 26`, valor: (a) => mi(a.acum26), secundaria: true },
            { rotulo: 'Método', valor: (a) => <span className="text-ink-soft">{({ sazonal: 'sazonal', ritmo3m: 'ritmo 3 meses', ritmoAno: 'ritmo do ano', ritmo12m: 'ritmo 12 meses' } as const)[a.escolhido]}</span>, secundaria: true },
            { rotulo: 'Fechamento 2026', valor: (a) => <span className="font-semibold">{mi(a.central)}</span> },
            { rotulo: 'Δ% sobre 2025', valor: (a) => fmtPct((a.central / a.fechou2025 - 1) * 100) },
            { rotulo: 'Faixa', valor: (a) => `${mi(a.min)} a ${mi(a.max)}`, secundaria: true },
          ]} />
        </div>
      </Cartao>

      <Cartao titulo="ICMS 2027: PLOA e hipóteses de crescimento">
        <Nota titulo="Notas"><p>A PLOA prevê ICMS de {bilhoes(R.icms[5])} em 2027. Sobre o fechamento projetado de 2026 ({bilhoes(icms.central)}), isso é um crescimento nominal de {fmtPct((R.icms[5] / icms.central - 1) * 100)}. A tabela compara com o que cada hipótese de crescimento daria.</p></Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={cenariosIcms} legenda="ICMS de 2027 sob hipóteses de crescimento, em R$ milhões" colunas={[
            { rotulo: 'Hipótese', valor: (c) => <span className={c.chave === 'ploa' ? 'font-semibold' : ''}>{c.rotulo}</span> },
            { rotulo: 'Crescimento 2027', valor: (c) => fmtPct(c.g * 100) },
            { rotulo: 'ICMS 2027', valor: (c) => <span className={c.chave === 'ploa' ? 'font-semibold' : ''}>{mi(c.valor)}</span> },
            { rotulo: 'PLOA menos hipótese', valor: (c) => (c.chave === 'ploa' ? '–' : dMi(R.icms[5] - c.valor)) },
          ]} />
          <p className={`mt-2 ${NOTA_DISCRETA}`}>Crescimento da hipótese aplicado ao fechamento projetado de 2026. Inflação e PIB do Focus: IPCA {numero(ipca['2027'] * 100, 2)}% e PIB {numero(pib['2027'] * 100, 2)}%. Valores brutos, antes das deduções (municípios e Fundeb).</p>
        </div>
      </Cartao>

      <Cartao titulo="Petróleo implícito nas transferências da União (PLOA 2027)">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>A PLOA traz as transferências da União numa linha só ({bilhoes(R.transf_corr_uniao[5])} em 2027). Tirando dela o FPE e as demais transferências crescendo como a economia esperada pelo Focus, sobra o que a proposta precisa supor para o petróleo.</p>
        </div>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={[
            { chave: 'a', rotulo: 'Transferências da União na PLOA 2027', v: R.transf_corr_uniao[5], forte: true },
            { chave: 'b', rotulo: '(−) FPE 2027 (projeção)', v: -impl.fpe27, forte: false },
            { chave: 'c', rotulo: '(−) Demais transferências da União 2027 (projeção)', v: -impl.outras27, forte: false },
            { chave: 'd', rotulo: '= Petróleo implícito na PLOA 2027', v: impl.implicito, forte: true },
            { chave: 'e', rotulo: 'Petróleo realizado em 2025', v: impl.petroleo25, forte: false },
            { chave: 'f', rotulo: 'Petróleo projetado para 2026', v: impl.petroleo26, forte: false },
          ]} legenda="Petróleo implícito na PLOA 2027, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.forte ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'Valor', valor: (x) => <span className={x.forte ? 'font-semibold' : ''}>{x.v < 0 ? `−${mi(-x.v)}` : mi(x.v)}</span> },
          ]} />
          <Nota titulo="Notas">          <p>
            O resultado indica que a PLOA supõe petróleo em {bilhoes(impl.implicito)}, {fmtPct((impl.implicito / impl.petroleo26 - 1) * 100)} sobre o fechamento projetado de 2026 e {fmtPct((impl.implicito / impl.petroleo25 - 1) * 100)} sobre 2025. É uma dedução, não um número publicado: a PLOA não detalha a linha. Para comparar com a leitura pela sazonalidade do grupo, a projeção top-down das transferências da União é {bilhoes(topDownUniao)} em 2026, contra {bilhoes(impl.fpe27 / (1 + g27) + impl.outras26 + impl.petroleo26)} somando as três partes pelo ritmo recente.
          </p></Nota>
        </div>
      </Cartao>

      {petroleo && <PetroleoPorNatureza dados={petroleo} />}

      {mercado && <PetroleoMercadoCartao m={mercado} />}

      <SensibilidadePetroleo implicito={impl.implicito} />

      <RelacoesPetroleo />

      <Cartao titulo="Petróleo: premissas da LDO 2027">
        <Nota titulo="Notas"><p>Cenário base da LDO para 2027: Brent a US$ 60, câmbio de R$ 5,40 e 224,5 mil barris por dia, o que dá R$ 1,24 bi, cerca de 60% abaixo do ritmo de 2026 ({bilhoes(impl.petroleo26)}).</p>
          <p>
            O Anexo de Riscos Fiscais da LDO 2027 (Lei nº 12.967/2026, p. 52, fonte Nupetro/Subser/Sefaz) traz o cenário base do Estado para as receitas de petróleo e gás em 2027: produção de 224,5 mil barris por dia, Brent a US$ 60 e câmbio de R$ 5,40, o que dá R$ 1.240,8 milhões (royalties R$ 693,8 mi, participação especial R$ 527,2 mi e Fundo do Petróleo R$ 19,8 mi). A dedução feita acima a partir da PLOA (cerca de {bilhoes(impl.implicito)}) é da mesma ordem de grandeza dessa base, o que sugere que a proposta usa o cenário de Brent a US$ 60 para 2027; a PLOA não detalha a linha, então isso continua sendo indício.
          </p>
          <p>
            Compare com 2026: a compensação pela produção de petróleo (R$ {numero(impl.petroleo25 / 1e9, 2)} bi em 2025) caminha para cerca de {bilhoes(impl.petroleo26)} em 2026. O cenário de 2027 supõe, portanto, uma queda de cerca de 60% sobre o ritmo atual. Se a diferença vier de preço e câmbio, ela é um risco conhecido, e a LDO a reconhece no sentido contrário (frustração de R$ 623,4 mi: Brent a US$ 54, câmbio a R$ 5,20 e produção de 162,3 mil barris). A comparação com o Brent, o câmbio e a produção realizados em 2026 está no cartão acima.
          </p>
        </Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={[
            { chave: 'base', rotulo: 'Cenário base 2027', prod: '224,5', brent: '60,0', cambio: '5,40', roy: 693.8, pe: 527.2, fundo: 19.8, total: 1240.8 },
            { chave: 'frust', rotulo: 'Cenário de frustração (risco fiscal)', prod: '162,3', brent: '54,0', cambio: '5,20', roy: 433.9, pe: 166.1, fundo: 17.4, total: 617.4 },
            { chave: 'red', rotulo: 'Redistribuição dos royalties (Lei 12.734/2012, ADI): perda', prod: '–', brent: '–', cambio: '–', roy: -154.8, pe: -263.6, fundo: -19.8, total: -438.1 },
          ]} legenda="Premissas e valores de petróleo e gás na LDO 2027, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.chave === 'base' ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'Produção (mil bbl/d)', valor: (x) => x.prod },
            { rotulo: 'Brent (US$)', valor: (x) => x.brent },
            { rotulo: 'Câmbio (R$/US$)', valor: (x) => x.cambio },
            { rotulo: 'Royalties', valor: (x) => (x.roy < 0 ? `−${numero(-x.roy, 1)}` : numero(x.roy, 1)) },
            { rotulo: 'Particip. especial', valor: (x) => (x.pe < 0 ? `−${numero(-x.pe, 1)}` : numero(x.pe, 1)) },
            { rotulo: 'Fundo do Petróleo', valor: (x) => (x.fundo < 0 ? `−${numero(-x.fundo, 1)}` : numero(x.fundo, 1)) },
            { rotulo: 'Total', valor: (x) => <span className="font-semibold">{x.total < 0 ? `−${numero(-x.total, 1)}` : numero(x.total, 1)}</span> },
          ]} />
          <p className={`mt-2 ${NOTA_DISCRETA}`}>Valores transcritos da LDO 2027 (texto guardado em painel-es/fontes/ldo). A frustração de R$ 623,4 mi do quadro de riscos fiscais é a diferença entre o cenário base e o de frustração (1.240,8 − 617,4). Câmbio: Relatório Focus de 06/02/2026. Os valores de Brent seguem estudos de agências de energia, fundos e contratos futuros, segundo a LDO.</p>
        </div>
      </Cartao>
    </div>
  )
}
