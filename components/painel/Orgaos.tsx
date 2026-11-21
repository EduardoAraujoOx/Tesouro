'use client'

import { milhoes, numero } from '@/lib/formato'
import { Cartao, TabelaItens } from './Graficos'
import { NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'
import { ATU, agrupa, type Linha } from './dados'

/** Distribuição da despesa por órgão (art. 5º) e receitas do Tesouro e de outras fontes (art. 3º) do projeto de lei da PLOA 2027 */
export type OrgaosArt5 = {
  poderes: { poder: string; tesouro: number; outras: number; total: number; orgaos: { cod: string; nome: string; tesouro: number; outras: number; total: number; detalhe?: { nome: string; valor: number; inclui?: string }[] }[] }[]
  total: { tesouro: number; outras: number; total: number }
  receita: { tesouro: number; outras_fontes: number; total: number; caixa_do_tesouro_mensagem: number; observacao_caixa: string }
}
const mi = (x: number) => milhoes(x, 0)

/** Despesa por órgão, no formato do art. 5º (Tesouro e outras fontes), com a dotação atualizada de 2026 e a variação da PLOA. */
export function DespesaPorOrgao({ orgaos, linhas }: { orgaos: OrgaosArt5; linhas: Linha[] }) {
  const atu26 = agrupa(linhas, (l) => l[0].slice(0, 2))
  const a26 = (cod: string) => atu26.get(cod)?.[ATU] ?? 0
  type L = { chave: string; rotulo: string; nivel: 0 | 1; tesouro: number; outras: number; total: number; a26: number }
  const itens: L[] = []
  for (const p of orgaos.poderes) {
    const ref = p.orgaos.reduce((t, o) => t + a26(o.cod), 0)
    itens.push({ chave: p.poder, rotulo: p.poder, nivel: 0, tesouro: p.tesouro, outras: p.outras, total: p.total, a26: ref })
    if (p.orgaos.length > 1) for (const o of p.orgaos) itens.push({ chave: `${p.poder}-${o.cod}`, rotulo: o.nome, nivel: 1, tesouro: o.tesouro, outras: o.outras, total: o.total, a26: a26(o.cod) })
  }
  const total26 = orgaos.poderes.reduce((t, p) => t + p.orgaos.reduce((s, o) => s + a26(o.cod), 0), 0)
  itens.push({ chave: 'total', rotulo: 'Total', nivel: 0, tesouro: orgaos.total.tesouro, outras: orgaos.total.outras, total: orgaos.total.total, a26: total26 })
  const encargos = orgaos.poderes.flatMap((p) => p.orgaos).find((o) => o.detalhe)
  return (
    <Cartao titulo="Despesa por órgão: Tesouro e outras fontes (art. 5º)">
      <TabelaItens altura="livre" compacta itens={itens} legenda="Despesa da PLOA 2027 por Poder e órgão, em R$ milhões, com a parte do Tesouro e de outras fontes" colunas={[
        { rotulo: 'R$ milhões', valor: (x) => x.nivel === 0 ? <span className="font-semibold">{x.rotulo}</span> : <span className="block pl-4 text-ink-soft">{x.rotulo}</span> },
        { rotulo: 'Tesouro', secundaria: true, valor: (x) => mi(x.tesouro) },
        { rotulo: 'Outras fontes', secundaria: true, valor: (x) => (x.outras ? mi(x.outras) : '–') },
        { rotulo: 'PLOA 27', valor: (x) => <span className="font-semibold">{mi(x.total)}</span> },
        { rotulo: 'Atual. 26', secundaria: true, valor: (x) => mi(x.a26) },
        { rotulo: 'Dif. %', valor: (x) => fmtPct(x.a26 > 0 ? (x.total / x.a26 - 1) * 100 : undefined) },
      ]} />
      <p className={`mt-2 ${NOTA_DISCRETA}`}>
        Art. 5º do projeto de lei (Mensagem nº 189/2026): a despesa fixada à conta dos recursos do Tesouro e de outras fontes, que somam R$ {numero(orgaos.total.total / 1e9, 2)} bi, igual à receita estimada. Em outras fontes, R$ {mi(orgaos.poderes.flatMap((p) => p.orgaos).find((o) => o.cod === '60')?.outras ?? 0)} milhões são do Instituto de Previdência (recursos do RPPS). Dif. %: PLOA 2027 sobre a dotação atualizada de 2026 do órgão (Portal de Dados Abertos).
        {encargos?.detalhe && <> Encargos gerais: {encargos.detalhe.map((d) => `${d.nome.replace('Encargos gerais, ', '')} R$ ${mi(d.valor)} mi${d.inclui ? ` (inclui ${d.inclui.replace('reserva de contingência de R$ 668.822.016', 'a reserva de contingência de R$ 669 mi')})` : ''}`).join('; ')}.</>}
      </p>
    </Cartao>
  )
}

/** Receitas do Tesouro e de outras fontes (art. 3º) e a receita de caixa do Tesouro citada na Mensagem. */
export function ReceitaTesouro({ orgaos }: { orgaos: OrgaosArt5 }) {
  const r = orgaos.receita
  const ipajm = orgaos.poderes.flatMap((p) => p.orgaos).find((o) => o.cod === '60')?.outras ?? 0
  const itens = [
    { chave: 'tes', rotulo: 'Receitas do Tesouro (A)', v: r.tesouro, forte: false },
    { chave: 'out', rotulo: 'Receitas de outras fontes (B)', v: r.outras_fontes, forte: false },
    { chave: 'ipajm', rotulo: 'dos quais: recursos do RPPS (Instituto de Previdência)', v: ipajm, forte: false },
    { chave: 'tot', rotulo: 'Receita total (A + B)', v: r.total, forte: true },
    { chave: 'caixa', rotulo: 'Receita de caixa do Tesouro, segundo a Mensagem', v: r.caixa_do_tesouro_mensagem, forte: false },
  ]
  return (
    <Cartao titulo="Receitas do Tesouro e de outras fontes (art. 3º)">
      <TabelaItens altura="livre" compacta itens={itens} legenda="Receitas do Tesouro e de outras fontes na PLOA 2027, em R$ milhões" colunas={[
        { rotulo: 'R$ milhões', valor: (x) => <span className={x.forte ? 'font-semibold' : x.chave === 'ipajm' ? 'block pl-4 text-ink-soft' : ''}>{x.rotulo}</span> },
        { rotulo: 'PLOA 27', valor: (x) => <span className={x.forte ? 'font-semibold' : ''}>{x.chave === 'caixa' ? `≈ ${mi(x.v)}` : mi(x.v)}</span> },
        { rotulo: '% do total', secundaria: true, valor: (x) => `${numero((x.v / r.total) * 100, 1)}%` },
      ]} />
      <p className={`mt-2 ${NOTA_DISCRETA}`}>{r.observacao_caixa} A receita do Tesouro (R$ {numero(r.tesouro / 1e9, 2)} bi) é a que financia a despesa do Tesouro no art. 5º. A Mensagem não explica a diferença de R$ {numero((r.tesouro - r.caixa_do_tesouro_mensagem) / 1e9, 1)} bi entre ela e a receita de caixa; vale pedir o conceito à Secretaria da Fazenda.</p>
    </Cartao>
  )
}
