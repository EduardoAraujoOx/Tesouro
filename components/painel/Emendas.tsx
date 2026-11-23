'use client'

import type { ReactNode } from 'react'
import { milhoes, numero } from '@/lib/formato'
import type { DadosEmendas } from '@/lib/emendas'
import { Cartao, TabelaItens, COR } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'

const mi = (x: number) => milhoes(x, 0)
const bi = (x: number) => numero(x / 1e9, 1)
const nd = <span className="text-ink-soft">a informar</span>

/** Valor e, em tom discreto, a variação sobre o ano anterior. */
function Celula({ v, d, nota }: { v: ReactNode; d?: number | null; nota?: string }) {
  return (
    <span className="block leading-tight">
      {v}{nota && <span className="text-ink-soft"> {nota}</span>}
      {d !== undefined && d !== null && <span className="block text-label font-semibold normal-case tracking-normal">{fmtPct(d)}</span>}
    </span>
  )
}

type Linha = { chave: string; rotulo: ReactNode; emendas?: ReactNode; rcl?: ReactNode; disc?: ReactNode }

type ItemLista = { chave: string; rotulo: ReactNode; campos: { r: string; v: ReactNode }[] }
/** Visão das tabelas em tela estreita: cada linha vira um bloco com os campos nomeados, sem rolagem lateral. */
function Lista({ itens, legenda }: { itens: ItemLista[]; legenda: string }) {
  return (
    <ul role="list" aria-label={legenda} className="divide-y divide-line rounded-brand border border-line text-small md:hidden print:hidden">
      {itens.map((i) => (
        <li key={i.chave} className="px-2.5 py-2">
          <p className="font-semibold">{i.rotulo}</p>
          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
            {i.campos.filter((c) => c.v !== '' && c.v !== undefined).map((c) => (
              <div key={c.r} className="min-w-max">
                <dt className="text-label tracking-normal text-ink-soft">{c.r}</dt>
                <dd className="whitespace-nowrap">{c.v}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  )
}


/**
 * Subitem Emendas de Despesa: as emendas individuais de 2027 (PEC 04/2026) contra o crescimento que o critério do STF para emendas impositivas
 * permitiria, e a despesa dos Poderes ao longo da LOA 2025, da LOA 2026 e da PLOA 2027. O critério é tratado como parâmetro de referência.
 */
export function Emendas({ dados }: { dados: DadosEmendas }) {
  const { emendas: E, rcl, disc, discSemPoderes: sem, poderes, ipca } = dados
  const vSem = (sem.a2027 / sem.a2026 - 1) * 100
  const vRcl26 = (rcl.a2026 / rcl.a2025 - 1) * 100
  const vRcl27 = (rcl.a2027 / rcl.a2026 - 1) * 100
  const vDisc27 = (disc.a2027 / disc.a2026 - 1) * 100
  const vE27 = (E.a2027 / E.a2026 - 1) * 100
  const vE26 = E.a2025 ? (E.a2026 / E.a2025 - 1) * 100 : null
  const teto = Math.min(vDisc27, vRcl27)
  const maximo = E.a2026 * (1 + teto / 100)
  const excesso = E.a2027 - maximo

  const linhas: Linha[] = [
    { chave: '2025', rotulo: '2025', emendas: E.a2025 === null ? nd : <Celula v={mi(E.a2025)} />, rcl: <Celula v={bi(rcl.a2025)} nota="(2023)" />, disc: nd },
    { chave: '2026', rotulo: '2026', emendas: <Celula v={mi(E.a2026)} d={vE26} nota="(teto)" />, rcl: <Celula v={bi(rcl.a2026)} d={vRcl26} nota="(2024)" />, disc: <Celula v={bi(disc.a2026)} nota="(autorizado)" /> },
    { chave: '2027', rotulo: '2027 (PEC)', emendas: <Celula v={<span className="font-semibold">{mi(E.a2027)}</span>} d={vE27} />, rcl: <Celula v={bi(rcl.a2027)} d={vRcl27} nota="(2025)" />, disc: <Celula v={bi(disc.a2027)} d={vDisc27} nota="(PLOA)" /> },
    { chave: 'max', rotulo: <span className="text-ink-soft">2027, máximo (aprox.)</span>, emendas: <Celula v={mi(maximo)} d={teto} /> },
  ]

  const barras = [
    { rotulo: '2026 (teto)', v: E.a2026, cor: COR.empenhado },
    { rotulo: '2027, máximo pelo critério (aprox.)', v: maximo, cor: COR.atualizada, tracejado: true },
    { rotulo: '2027, PEC 04/2026', v: E.a2027, cor: COR.ploa },
  ]
  const topo = Math.max(...barras.map((b) => b.v))

  type Poder = { chave: string; rotulo: string; v25?: number; v26?: number; v27?: number; d26: number | null; d27: number | null; ref?: boolean; total?: boolean }
  const dd = (a: number, b: number) => (a > 0 ? (b / a - 1) * 100 : null)
  const tot = poderes.reduce((t, p) => ({ v25: t.v25 + p.v25, v26: t.v26 + p.v26, v27: t.v27 + p.v27 }), { v25: 0, v26: 0, v27: 0 })
  const linhasPoderes: Poder[] = [
    ...poderes.map((p) => ({ chave: p.rotulo, ...p, d26: dd(p.v25, p.v26), d27: dd(p.v26, p.v27) })),
    { chave: 'total', rotulo: 'Total', ...tot, d26: dd(tot.v25, tot.v26), d27: dd(tot.v26, tot.v27), total: true },
    { chave: 'ipca', rotulo: 'IPCA jul–jun', d26: ipca.a2026, d27: ipca.a2027, ref: true },
    { chave: 'disc', rotulo: 'Desp. discricionária', v26: disc.a2026, v27: disc.a2027, d26: null, d27: vDisc27, ref: true },
  ]

  return (
    <div className="space-y-3">
      <Cartao titulo="Emendas individuais: previsto e máximo pelo critério do STF">
        <ul className="space-y-1.5">
          {barras.map((b) => (
            <li key={b.rotulo} className="grid items-center gap-x-3 sm:grid-cols-[12rem_1fr]">
              <span className="text-small text-ink">{b.rotulo}</span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span className="block h-5 rounded-r-sm" style={{ width: `${(b.v / topo) * 80}%`, minWidth: '0.25rem', background: b.cor, outline: b.tracejado ? `1.5px dashed ${COR.contornoAtualizada}` : undefined, outlineOffset: -1.5 }} />
                <span className="text-small font-semibold tabular-nums">R$ {mi(b.v)} mi</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-small text-ink">
          A previsão para 2027 é {numero(E.a2027 / maximo, 1)} vezes o máximo pelo critério, um excesso de R$ {mi(excesso)} milhões.
        </p>
        <div className="mt-3">
          <div className="hidden md:block print:block">
            <TabelaItens compacta altura="livre" itens={linhas} legenda="Emendas individuais, RCL e despesa primária discricionária do Executivo, por ano" colunas={[
              { rotulo: 'Ano', valor: (l: Linha) => l.rotulo },
              { rotulo: 'Emendas (mi)', valor: (l: Linha) => l.emendas ?? '' },
              { rotulo: 'RCL (bi)', valor: (l: Linha) => l.rcl ?? '' },
              { rotulo: 'Discricionária, Estado (bi)', valor: (l: Linha) => l.disc ?? '' },
            ]} />
          </div>
          <Lista legenda="Emendas individuais, RCL e despesa primária discricionária do Executivo, por ano" itens={linhas.map((l) => ({ chave: l.chave, rotulo: l.rotulo, campos: [{ r: 'Emendas (R$ mi)', v: l.emendas ?? '' }, { r: 'RCL (R$ bi)', v: l.rcl ?? '' }, { r: 'Discricionária, Estado (R$ bi)', v: l.disc ?? '' }] }))} />
        </div>
        <Nota titulo="Critério, decisões e fontes" larga>
          <div className="space-y-2">
            <p>
              A PEC 04/2026 (Assembleia Legislativa, 13/10/2026) e o art. 24 da LDO 2027 fixam as emendas individuais em 1,55% da RCL de 2025 (R$ 14,5 milhões por deputado), com metade em saúde e execução obrigatória. Em 2026 o teto foi de R$ 3 milhões por deputado. O critério de crescimento é o das decisões do STF sobre emendas impositivas: de um ano para o outro, as emendas não podem crescer mais que a despesa discricionária do Poder Executivo ou que a RCL, o que for menor (ADI 7697, ministro Dino, em dezembro de 2024, para a União; aplicado à Paraíba na ADI 7867, ministro Fachin, em cautelar, com teto de R$ 182,3 milhões para 2026, contra R$ 283,9 milhões pela regra de 1,5% da RCL). O limite de 1,55% da RCL coincide com o fixado pelo ministro Moraes para a Paraíba na ADI 7869.
            </p>
            <p>
              São decisões cautelares e de outros entes, tomadas antes do julgamento de mérito; o painel as usa como parâmetro de referência, sem concluir sobre sua incidência no Espírito Santo. A RCL de cada linha é a do ano-base (2023 para 2025, 2024 para 2026 e 2025 para 2027). A despesa discricionária é a do demonstrativo da Mensagem nº 189/2026 (autorizado de 2026 em 25/09/2026 e PLOA 2027), que é consolidado e inclui os demais Poderes; a série só do Executivo não foi localizada. Mesmo supondo que todo o custeio e o investimento dos Poderes fosse discricionário, a variação do Executivo seria de {fmtPct(vSem)}, de modo que o valor consolidado é o mais conservador. O demonstrativo de 2025 não foi localizado, e o valor das emendas de 2025 também não. O máximo é o valor de 2026 corrigido pelo menor crescimento e, por isso, aproximado.
            </p>
          </div>
        </Nota>
      </Cartao>

      <Cartao titulo="Poderes: recursos não vinculados de impostos">
        <div className="hidden md:block print:block">
          <TabelaItens compacta altura="livre" itens={linhasPoderes} legenda="Dotação dos Poderes em recursos não vinculados de impostos, LOA 2025, LOA 2026 e PLOA 2027, em R$ milhões, com a variação e referências" colunas={[
            { rotulo: 'R$ milhões', valor: (l: Poder) => <span className={l.total ? 'font-semibold' : l.ref ? 'text-ink-soft' : ''}>{l.rotulo}</span> },
            { rotulo: 'LOA 2025', secundaria: true, valor: (l: Poder) => (l.v25 === undefined ? '' : mi(l.v25)) },
            { rotulo: 'LOA 2026', secundaria: true, valor: (l: Poder) => (l.v26 === undefined ? '' : <span className={l.ref ? 'text-ink-soft' : ''}>{mi(l.v26)}</span>) },
            { rotulo: 'PLOA 2027', valor: (l: Poder) => (l.v27 === undefined ? '' : <span className={l.ref ? 'text-ink-soft' : 'font-semibold'}>{mi(l.v27)}</span>) },
            { rotulo: '2025→26', valor: (l: Poder) => (l.d26 === null ? '' : <span className={l.total ? 'font-semibold' : ''}>{fmtPct(l.d26)}</span>) },
            { rotulo: '2026→27', valor: (l: Poder) => (l.d27 === null ? '' : <span className="font-semibold">{fmtPct(l.d27)}</span>) },
          ]} />
        </div>
        <Lista legenda="Dotação dos Poderes em recursos não vinculados de impostos, em R$ milhões" itens={linhasPoderes.map((l) => ({ chave: l.chave, rotulo: <span className={l.ref ? 'text-ink-soft' : ''}>{l.rotulo}</span>, campos: [
          { r: 'PLOA 2027', v: l.v27 === undefined ? '' : <span className="font-semibold">{mi(l.v27)}</span> },
          { r: '2025→26', v: l.d26 === null ? '' : fmtPct(l.d26) }, { r: '2026→27', v: l.d27 === null ? '' : <span className="font-semibold">{fmtPct(l.d27)}</span> },
        ] }))} />
        <Nota titulo="LDO e decisão do STF" larga>
          <div className="space-y-2">
            <p>
              Na LDO 2026 o limite das propostas dos Poderes era a dotação do ano anterior em recursos não vinculados de impostos (fonte 500), corrigida pelo IPCA mais 1,5%. O projeto da LDO 2027 do Executivo propunha o IPCA mais 2,5%. A lei sancionada trocou o critério por percentuais fixos da RCL de julho de 2025 a junho de 2026 (11,635% no total para os cinco órgãos, cerca de R$ 3,5 bilhões, valor que não é diretamente comparável à tabela, restrita a recursos não vinculados de impostos), alteração feita na tramitação na Assembleia Legislativa. As linhas de IPCA e de despesa discricionária servem de régua: em 2027 as dotações dos Poderes avançam mais que ambas.
            </p>
            <p>
              A ADI 7868 (ministro Toffoli, plenário virtual, por unanimidade, encerrada em 19/6/2026) invalidou regra da Constituição da Paraíba (Emenda 61/2025) que reajustava automaticamente as propostas dos Poderes pela correção monetária, por violar a separação dos Poderes e a iniciativa do Executivo em matéria orçamentária. O caso é distinto do capixaba, em que o veículo é a LDO, e serve como referência, não como conclusão.
            </p>
          </div>
        </Nota>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026: Programa de Trabalho e demonstrativo da despesa primária); Portal de Dados Abertos do ES (dotação inicial); LDO 2026 e LDO 2027; Siconfi (RCL e IPCA); STF (ADI 7867, 7868 e 7869); ES Hoje (PEC 04/2026).</p>
    </div>
  )
}
