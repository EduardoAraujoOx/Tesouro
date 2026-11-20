'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import rreoRaw from '@/data/rreo.json'
import { Cartao, TabelaItens } from './Graficos'
import { fmtPct, variacoes } from './GraficosMacro'
import { ATU, INI, PLOA, agrupa, type Linha } from './dados'

const PODERES: { chave: string; rotulo: string; uos: string[] }[] = [
  { chave: 'ales', rotulo: 'Assembleia Legislativa', uos: ['01101'] },
  { chave: 'tce', rotulo: 'Tribunal de Contas', uos: ['02101'] },
  { chave: 'tj', rotulo: 'Tribunal de Justiça e fundo especial', uos: ['03101', '03901'] },
  { chave: 'mp', rotulo: 'Ministério Público e fundo especial', uos: ['05101', '05902'] },
  { chave: 'dpe', rotulo: 'Defensoria Pública e fundo', uos: ['06101', '06901'] },
]
const mi = (x: number) => milhoes(x, 0)

/**
 * Despesa dos Poderes e órgãos autônomos na PLOA 2027 contra 2026, e o que se sabe sobre as emendas parlamentares impositivas
 * (Emenda Constitucional 120/2026), que a PLOA enviada em 30/09/2026 ainda não podia conter.
 * Os números da tabela vêm do Programa de Trabalho da PLOA e do Portal; os fatos sobre as emendas vêm da imprensa e estão indicados como tais.
 */
export function PoderesEmendas({ linhas }: { linhas: Linha[] }) {
  const porUo = useMemo(() => agrupa(linhas, (l) => l[0]), [linhas])
  const itens = useMemo(() => {
    const base = PODERES.map((p) => {
      const v = Array(8).fill(0) as number[]
      for (const u of p.uos) { const s = porUo.get(u); if (s) for (let i = 0; i < 8; i++) v[i] += s[i] }
      return { chave: p.chave, rotulo: p.rotulo, v }
    })
    const soma = Array(8).fill(0) as number[]
    for (const b of base) for (let i = 0; i < 8; i++) soma[i] += b.v[i]
    const total = Array(8).fill(0) as number[]
    for (const s of porUo.values()) for (let i = 0; i < 8; i++) total[i] += s[i]
    const executivo = total.map((x, i) => x - soma[i])
    return [...base, { chave: 'soma', rotulo: 'Poderes e órgãos autônomos', v: soma }, { chave: 'exec', rotulo: 'Executivo (demais unidades)', v: executivo }]
  }, [porUo])
  const soma = itens.find((i) => i.chave === 'soma')!
  const exec = itens.find((i) => i.chave === 'exec')!
  const rcl25 = (rreoRaw as unknown as { serie: { ano: number; rcl12m: number }[] }).serie.find((s) => s.ano === 2025)?.rcl12m ?? 0
  const emendas27 = rcl25 * 0.0155

  return (
    <div className="space-y-3">
      <Cartao titulo="Despesa dos Poderes e órgãos autônomos: PLOA 2027 contra 2026">
        <p className="max-w-3xl text-small text-ink-soft">
          Nos cinco Poderes e órgãos autônomos a PLOA soma R$ {mi(soma.v[PLOA])} milhões, {fmtPct(variacoes(soma.v[INI], soma.v[PLOA], 0).nominal)} sobre o orçamento inicial de 2026, contra {fmtPct(variacoes(exec.v[INI], exec.v[PLOA], 0).nominal)} nas demais unidades (Executivo). Sobre a dotação atualizada de 2026, que já incorpora os créditos abertos no ano, o aumento é de {fmtPct(variacoes(soma.v[ATU], soma.v[PLOA], 0).nominal)}. Segundo a imprensa, uma emenda da LDO 2027 trocou a correção anual pelo IPCA por um percentual da receita corrente líquida entre julho de 2025 e junho de 2026, o que é compatível com esse crescimento acima do Executivo, mas o percentual aplicado não foi confirmado.
        </p>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={itens} legenda="Despesa dos Poderes e órgãos autônomos, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.chave === 'soma' ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'PLOA 2027', valor: (x) => <span className="font-semibold">{mi(x.v[PLOA])}</span> },
            { rotulo: 'Inicial 2026', valor: (x) => mi(x.v[INI]) },
            { rotulo: 'Δ% sobre inicial', valor: (x) => fmtPct(variacoes(x.v[INI], x.v[PLOA], 0).nominal) },
            { rotulo: 'Atualizada 2026', valor: (x) => mi(x.v[ATU]) },
            { rotulo: 'Δ% sobre atualizada', valor: (x) => fmtPct(variacoes(x.v[ATU], x.v[PLOA], 0).nominal) },
          ]} />
          <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">Programa de Trabalho da PLOA 2027 (Mensagem nº 189/2026) e Portal de Dados Abertos do ES. O repasse aos Poderes divulgado pelo Governo (R$ 3,9 bi, segundo a imprensa) inclui parcelas que não estão neste recorte por unidade orçamentária.</p>
        </div>
      </Cartao>

      <Cartao titulo="Emendas parlamentares impositivas: ainda não estão na proposta">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>
            <span className="font-semibold text-ink">O que a PLOA traz.</span> Nenhuma das 353 ações do Programa de Trabalho da PLOA 2027 tem “emenda” no nome. A proposta foi enviada em 30 de setembro de 2026, e a Emenda Constitucional 120/2026 só foi aprovada pela Assembleia em 13 de outubro (imprensa): a proposta não podia conter as regras novas. Há, porém, uma ação nova, “Reserva técnica” (0995), de exatamente R$ 90,0 milhões, em investimentos (GND 4), fonte 500, na unidade 80104 (Administração Geral a cargo da Secretaria de Economia e Planejamento). O valor coincide com 30 deputados × R$ 3 milhões, o teto de 2026. O documento não descreve a finalidade, então isso é um indício, a confirmar com a Secretaria: se for o caso, a PLOA reserva o valor antigo das emendas e não cobre o aumento.
          </p>
          <p>
            <span className="font-semibold text-ink">O que mudou (imprensa, a confirmar no texto oficial).</span> A execução das emendas individuais passa a ser obrigatória e integral a partir de 2027; o orçamento reserva 1,55% da receita corrente líquida, dividido por igual entre os 30 deputados, com metade em saúde. Com a RCL de 2025 (R$ {numero(rcl25 / 1e9, 1)} bi, RREO), 1,55% dá cerca de R$ {mi(emendas27)} milhões, o que coincide com os R$ 14,5 milhões por deputado (R$ 435 milhões) noticiados. Em 2026 eram R$ 3 milhões por deputado, ou R$ 90 milhões: o aumento é de uns R$ {mi(emendas27 - 90e6)} milhões.
          </p>
          <p>
            <span className="font-semibold text-ink">Como entram na LOA.</span> Pelo calendário aprovado pela comissão especial do PL 525/2026 (a LOA), os deputados apresentam emendas de 12 a 30 de novembro; a comissão analisa de 1º a 7 de dezembro, vota o parecer em 9 de dezembro e envia o projeto ao Plenário. A votação em Plenário ainda não tem data específica nas notícias. As emendas entram, portanto, na votação, e não por mensagem do Executivo. As notícias não dizem de onde viria o recurso adicional; a imprensa menciona que a LDO permite usar recursos reservados a calamidades. A reserva de contingência da PLOA (ação 9999, mesma unidade 80104) é de R$ 668,8 milhões, e na LOA de 2026 era de R$ 614,2 milhões no início do ano, quase toda usada para abrir créditos durante o exercício (R$ 5 milhões restantes na dotação atualizada); ela é a fonte natural de remanejamento, mas isso é uma hipótese, e não um fato dos documentos.
          </p>
          <p>
            <span className="font-semibold text-ink">Para o painel.</span> O que está no painel é a proposta original, e não a LOA: quando a LOA for aprovada, o procedimento de leitura do programa de trabalho se repete. As emendas aprovadas tendem a realocar dotações já existentes (de reservas ou de outras ações), então o total da despesa pode mudar pouco, mas a composição por unidade e ação muda.
          </p>
          <p className="text-label normal-case tracking-normal">
            Fontes (imprensa, ES Hoje): <a className="underline underline-offset-4" href="https://eshoje.com.br/?p=902328">Ales aprova emendas impositivas</a> (13/10/2026); <a className="underline underline-offset-4" href="https://eshoje.com.br/?p=904073">LDO 2027 aprovada</a> (21/10/2026); <a className="underline underline-offset-4" href="https://eshoje.com.br/?p=908385">Orçamento entra na reta decisiva</a> (11/11/2026, cronograma); <a className="underline underline-offset-4" href="https://eshoje.com.br/?p=900794">PLOA chega à Assembleia</a> (06/10/2026). Valores a confirmar nos textos oficiais (EC 120/2026, LC 1.158/2026, LDO 2027 e Ato da comissão).
          </p>
        </div>
      </Cartao>
    </div>
  )
}
