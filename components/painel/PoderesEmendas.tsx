'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import rreoRaw from '@/data/rreo.json'
import { Cartao, TabelaItens } from './Graficos'
import { Nota, NOTA_DISCRETA } from './Estrutura'
import { fmtPct, variacoes } from './GraficosMacro'
import { ATU, INI, PLOA, agrupa, type Linha } from './dados'

/** Limites percentuais da LDO 2027 (Lei nº 12.967/2026, art. 21, § 1º) sobre a receita corrente líquida de julho de 2025 a junho de 2026. */
const PODERES: { chave: string; rotulo: string; uos: string[]; limite: number }[] = [
  { chave: 'ales', rotulo: 'Assembleia Legislativa', uos: ['01101'], limite: 1.281 },
  { chave: 'tce', rotulo: 'Tribunal de Contas', uos: ['02101'], limite: 1.017 },
  { chave: 'tj', rotulo: 'Tribunal de Justiça e fundo especial', uos: ['03101', '03901'], limite: 6.131 },
  { chave: 'mp', rotulo: 'Ministério Público e fundo especial', uos: ['05101', '05902'], limite: 2.456 },
  { chave: 'dpe', rotulo: 'Defensoria Pública e fundo', uos: ['06101', '06901'], limite: 0.75 },
]
/** RCL de julho de 2025 a junho de 2026 (RREO do 3º bimestre de 2026, Anexo 03, Siconfi): R$ 30.126,1 milhões. */
const RCL_JUL25_JUN26 = 30126.1e6
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
  const limites = PODERES.map((p) => {
    const it = itens.find((i) => i.chave === p.chave)!
    return { chave: p.chave, rotulo: p.rotulo, pct: p.limite, limite: (p.limite / 100) * RCL_JUL25_JUN26, ploa: it.v[PLOA] }
  })
  const totalLimites = { chave: 'tot', rotulo: 'Total', pct: PODERES.reduce((t, p) => t + p.limite, 0), limite: limites.reduce((t, l) => t + l.limite, 0), ploa: limites.reduce((t, l) => t + l.ploa, 0) }
  const soma = itens.find((i) => i.chave === 'soma')!
  const exec = itens.find((i) => i.chave === 'exec')!
  const rcl25 = (rreoRaw as unknown as { serie: { ano: number; rcl12m: number }[] }).serie.find((s) => s.ano === 2025)?.rcl12m ?? 0
  const emendas27 = rcl25 * 0.0155

  const limitesAjuste = PODERES.map((p) => ({ lim: (p.limite / 100) * RCL_JUL25_JUN26, ploa: (itens.find((i) => i.chave === p.chave)?.v[PLOA] ?? 0) })).filter((x) => x.ploa < x.lim).reduce((t, x) => t + (x.lim - x.ploa), 0)
  return (
    <div className="space-y-3">
      <Cartao titulo="Ajustes à PLOA na votação da LOA: Poderes e emendas impositivas">
        <p className="text-small text-ink">Estimativa de ajuste entre R$ {mi(limitesAjuste + emendas27 - 90e6)} e R$ {mi(limitesAjuste + emendas27)} milhões (limites dos Poderes e emendas impositivas), com a hipótese de que o recurso venha da despesa. Será atualizada com a votação da LOA.</p>
        <Nota titulo="Metodologia e calendário">
          <p>
            Base: PLOA original (enviada em 29 de setembro). Pressões previstas em lei sobre a despesa: ajuste dos limites dos Poderes (cerca de R$ {mi(limitesAjuste)} milhões nos quatro órgãos abaixo do limite) e emendas individuais impositivas (cerca de R$ {mi(emendas27 - 90e6)} milhões além da reserva de R$ 90 milhões, ou até R$ {mi(emendas27)} milhões se essa reserva tiver outra finalidade). A hipótese de ajuste pela despesa decorre de a receita total da PLOA estar próxima da projeção de 2026.
          </p>
          <p>
            Calendário: apresentação das emendas de 12 a 30 de novembro; votação do parecer na comissão em 9 de dezembro. Os remanejamentos (origem dos recursos, unidades e ações) serão registrados com a LOA aprovada; até lá, os valores são cálculos a partir da LDO, não alterações realizadas.
          </p>
        </Nota>
      </Cartao>

      <Cartao titulo="Despesa dos Poderes e órgãos autônomos: PLOA 2027 e 2026">
        <Nota titulo="Notas"><p>
          Nos cinco Poderes e órgãos autônomos a PLOA soma R$ {mi(soma.v[PLOA])} milhões, {fmtPct(variacoes(soma.v[INI], soma.v[PLOA], 0).nominal)} sobre o orçamento inicial de 2026, contra {fmtPct(variacoes(exec.v[INI], exec.v[PLOA], 0).nominal)} nas demais unidades (Executivo). Sobre a dotação atualizada de 2026, que já incorpora os créditos abertos no ano, o aumento é de {fmtPct(variacoes(soma.v[ATU], soma.v[PLOA], 0).nominal)}.
        </p></Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={itens} legenda="Despesa dos Poderes e órgãos autônomos, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.chave === 'soma' ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'PLOA 2027', valor: (x) => <span className="font-semibold">{mi(x.v[PLOA])}</span> },
            { rotulo: 'Inicial 2026', valor: (x) => mi(x.v[INI]) },
            { rotulo: 'Δ% sobre inicial', valor: (x) => fmtPct(variacoes(x.v[INI], x.v[PLOA], 0).nominal) },
            { rotulo: 'Atualizada 2026', valor: (x) => mi(x.v[ATU]) },
            { rotulo: 'Δ% sobre atualizada', valor: (x) => fmtPct(variacoes(x.v[ATU], x.v[PLOA], 0).nominal) },
          ]} />
          <p className={`mt-2 ${NOTA_DISCRETA}`}>Programa de Trabalho da PLOA 2027 (Mensagem nº 189/2026) e Portal de Dados Abertos do ES. O repasse aos Poderes divulgado pelo Governo (R$ 3,9 bi, segundo a imprensa) inclui parcelas que não estão neste recorte por unidade orçamentária.</p>
        </div>
        <Nota titulo="O que a LDO 2027 determina para os Poderes">
          <p>
            <span className="font-semibold text-ink">O que a LDO 2027 determina.</span> A Lei nº 12.967/2026, publicada em 27 de outubro, fixa para cada órgão um limite percentual da receita corrente líquida de julho de 2025 a junho de 2026 (R$ {numero(RCL_JUL25_JUN26 / 1e9, 2)} bi, RREO): Judiciário 6,131%, Assembleia 1,281%, Tribunal de Contas 1,017%, Ministério Público 2,456% e Defensoria 0,750%, o que soma {numero(totalLimites.pct, 3)}% (art. 21, § 1º). Os órgãos tinham dez dias úteis da publicação para ajustar suas propostas no SIGEFES aos limites, “para fins de consolidação ou atualização” da PLOA (art. 21, § 4º), e na apuração entram as despesas com a insuficiência do fundo financeiro de cada órgão (art. 21, § 2º, e art. 22).
          </p>
          <p>
            A tabela compara cada limite com o que a PLOA, enviada em 29 de setembro, já traz. O Judiciário está acima do limite; os outros quatro órgãos estão abaixo, de R$ 60 a R$ 105 milhões cada. A comparação é aproximada, porque o limite é calculado com regras próprias (inclusive a cobertura do fundo financeiro) que o recorte por unidade não reproduz. Ainda assim indica o sentido: se Assembleia, Tribunal de Contas, Ministério Público e Defensoria ajustarem as propostas aos limites, a despesa desses órgãos aumenta em torno de R$ {mi(limites.filter((l) => l.ploa < l.limite).reduce((t, l) => t + (l.limite - l.ploa), 0))} milhões sobre a PLOA original.
          </p>
        </Nota>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={[...limites, totalLimites]} legenda="Limite da LDO 2027 para cada órgão contra a PLOA, em R$ milhões" colunas={[
            { rotulo: 'R$ milhões', valor: (x) => <span className={x.chave === 'tot' ? 'font-semibold' : ''}>{x.rotulo}</span> },
            { rotulo: 'Limite (% da RCL)', valor: (x) => `${numero(x.pct, 3)}%` },
            { rotulo: 'Limite em R$', valor: (x) => mi(x.limite) },
            { rotulo: 'PLOA 2027', valor: (x) => <span className="font-semibold">{mi(x.ploa)}</span> },
            { rotulo: 'PLOA menos limite', valor: (x) => `${x.ploa - x.limite > 0 ? '+' : x.ploa - x.limite < 0 ? '−' : ''}${mi(Math.abs(x.ploa - x.limite))}` },
          ]} />
          <p className={`mt-2 ${NOTA_DISCRETA}`}>Fonte dos limites: Lei nº 12.967/2026 (LDO 2027), Diário Oficial dos Poderes de 27/10/2026, art. 21; texto guardado em painel-es/fontes/ldo. RCL: RREO do 3º bimestre de 2026 (Siconfi).</p>
        </div>
      </Cartao>

      <Cartao titulo="Emendas parlamentares impositivas: LDO 2027 e PLOA">
        <Nota titulo="Regras da LDO, origem do recurso e calendário"><p>Emendas individuais: 1,55% da RCL de 2025, cerca de R$ {mi(emendas27)} milhões, de execução obrigatória. A PLOA só reserva R$ 90 milhões (indício), e a LDO permite cobrir a diferença anulando a reserva de contingência (art. 9º, § 3º).</p>
          <p>
            <span className="font-semibold text-ink">O que a LDO 2027 determina</span> (Lei nº 12.967/2026, arts. 9º e 23 a 27). As emendas individuais à LOA são aprovadas no limite de 1,55% da receita corrente líquida de 2025 (RGF do 3º quadrimestre de 2025, R$ {numero(rcl25 / 1e9, 1)} bi), o que dá cerca de R$ {mi(emendas27)} milhões, distribuídos por igual entre os 30 deputados (R$ 14,5 milhões cada). Metade do valor de cada deputado vai para ações e serviços de saúde, sem pagamento de pessoal. A execução é obrigatória e integral, salvo impedimento de ordem técnica, que segue um rito com prazos (60 dias para o Executivo justificar, mais 30 para o deputado sanear e 30 para o remanejamento); conveniência e oportunidade não são impedimento. Cada emenda tem marcador próprio na LOA e no SIGEFES, e o Executivo publica a execução todo mês. Em 2026 o valor era de R$ 3 milhões por deputado, ou R$ 90 milhões, segundo a imprensa: o aumento é de uns R$ {mi(emendas27 - 90e6)} milhões.
          </p>
          <p>
            <span className="font-semibold text-ink">De onde sai o recurso.</span> As emendas só podem ser financiadas por anulação de despesa, e não de pessoal, dívida, transferências constitucionais aos municípios, contrapartidas, recursos vinculados, precatórios, PPP e orçamento de investimento (art. 23). O art. 9º, § 2º, manda a PLOA conter uma reserva específica do tamanho desse limite, que não conta para o mínimo de 2% da RCL da reserva de contingência. E o § 3º prevê o caso em que a PLOA já enviada não traz a reserva ou traz menos: as emendas podem então indicar como fonte a anulação da reserva de contingência, e o mínimo de 2% deixa de valer na medida das anulações.
          </p>
          <p>
            <span className="font-semibold text-ink">O que a PLOA traz.</span> Nenhuma das 353 ações do Programa de Trabalho tem “emenda” no nome. Há uma ação nova, “Reserva técnica” (0995), de exatamente R$ 90,0 milhões, em investimentos (GND 4), fonte 500, na unidade 80104 (Administração Geral a cargo da Secretaria de Economia e Planejamento), que coincide com 30 deputados × R$ 3 milhões. O documento não descreve a finalidade; se for a reserva do art. 9º, § 2º, está em R$ 90 milhões contra os cerca de R$ {mi(emendas27)} milhões exigidos, e vale o § 3º. A reserva de contingência (ação 9999, mesma unidade) é de R$ 668,8 milhões, contra R$ 614,2 milhões no início de 2026, quando quase toda foi usada para abrir créditos (R$ 5 milhões restantes na dotação atualizada). O mínimo da LDO é 2% da RCL, ou cerca de R$ {mi(0.02 * RCL_JUL25_JUN26)} milhões com a RCL de julho de 2025 a junho de 2026. Se as emendas anularem a diferença de R$ {mi(emendas27 - 90e6)} milhões, a contingência cairia para perto de R$ {mi(668.8e6 - (emendas27 - 90e6))} milhões, abaixo desse mínimo, o que o § 3º permite.
          </p>
          <p>
            <span className="font-semibold text-ink">Calendário (imprensa).</span> A Emenda Constitucional 120/2026 foi aprovada em 13 de outubro, depois do envio da PLOA em 29 de setembro. Para o PL 525/2026 (a LOA), os deputados apresentam emendas de 12 a 30 de novembro; a comissão analisa de 1º a 7 de dezembro, vota o parecer em 9 de dezembro e envia ao Plenário; a data da votação em Plenário não aparece nas notícias. As emendas entram, portanto, na votação, e não por mensagem do Executivo.
          </p>
          <p>
            <span className="font-semibold text-ink">Para o painel.</span> O que está no painel é a proposta original, e não a LOA. As emendas aprovadas realocam dotações existentes (da contingência e de outras ações), então o total da despesa muda pouco, mas a composição por unidade e ação muda. Quando a LOA for aprovada, o procedimento de leitura do programa de trabalho se repete.
          </p>
          <p className="text-label normal-case tracking-normal">
            Fontes: Lei nº 12.967/2026 (LDO 2027), Diário Oficial dos Poderes de 27/10/2026 (texto guardado em painel-es/fontes/ldo). Imprensa, ES Hoje, para o calendário e a EC 120: <a className="underline underline-offset-4" href="https://eshoje.com.br/?p=902328">Ales aprova emendas impositivas</a> (13/10/2026); <a className="underline underline-offset-4" href="https://eshoje.com.br/?p=908385">Orçamento entra na reta decisiva</a> (11/11/2026). A EC 120/2026 e a LC 1.158/2026 ainda precisam ser conferidas nos textos oficiais.
          </p>
        </Nota>
      </Cartao>
    </div>
  )
}
