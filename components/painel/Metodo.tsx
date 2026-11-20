'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { fmtPct } from './GraficosMacro'
import { Nota, Subvisoes, NOTA_DISCRETA } from './Estrutura'
import { ANOS_RITMO, conciliacao, NOMES_METODO, projetaReceita2026, retroteste, pibArrecadacao, projecaoItens, retrotesteDespesa, retrotesteFonte, retrotesteSefaz, type DadosReceita, type RetroDespesa, type RetroSefaz } from './projecao'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mi = (x: number | null) => (x === null ? '–' : milhoes(x === 0 ? 0 : x, 0))
const dif = (a: number | null, b: number | null) => (a === null || b === null ? '–' : Math.abs(a - b) < 5e5 ? '0' : `${a - b > 0 ? '+' : '−'}${milhoes(Math.abs(a - b), 0)}`)
const cod = (c: string) => <span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[6.5rem] md:text-small md:normal-case">{c}</span>

/** Seção de método e fontes: as fontes batem entre si, como a projeção é feita e quão boa ela é, e o que significam os números. */
export function Metodo({ receita, dados, pib27 }: { receita: LinhaMacro[]; dados: DadosReceita; /** crescimento nominal esperado do PIB em 2027 (inflação e PIB real do Focus) */ pib27: number }) {
  const quadro = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const linhas = useMemo(() => conciliacao(dados, quadro, 2025).map((l) => ({ ...l, chave: l.chave })), [dados, quadro])
  const totais = useMemo(() => ANOS_RITMO.map((a) => {
    const r = conciliacao(dados, quadro, a === 2025 ? 2025 : a)
    return { chave: String(a), ano: a, ploa: quadro.total[a - 2023], rreo: r[r.length - 1].rreo }
  }), [dados, quadro])
  const retro = useMemo(() => retroteste(), [])
  const retroDesp = useMemo(() => retrotesteDespesa(), [])
  const retroSefaz = useMemo(() => retrotesteSefaz(), [])
  const pibA = useMemo(() => pibArrecadacao(), [])
  const difMin = pibA.linhas.reduce((m, l) => (l.dif < m.dif ? l : m))
  const difMax = pibA.linhas.reduce((m, l) => (l.dif > m.dif ? l : m))
  const impostosPloa = quadro.impostos[5] / projecaoItens(dados).imp.central - 1
  const impostosRegressao = Math.exp(pibA.intercepto + pibA.elasticidade * Math.log(1 + pib27)) - 1
  const itensPib = [
    ...pibA.linhas.map((l) => ({ chave: String(l.ano), rotulo: String(l.ano), pib: l.pib, imp: l.impostos, dif: l.dif, forte: false })),
    { chave: 'media', rotulo: 'Média', pib: pibA.linhas.reduce((s, l) => s + l.pib, 0) / pibA.n, imp: pibA.linhas.reduce((s, l) => s + l.impostos, 0) / pibA.n, dif: pibA.difMedia, forte: true },
  ]
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const retroFontes = useMemo(() => [{ id: 'icms', rotulo: 'ICMS', r: retrotesteFonte(dados, 'icms') }, { id: 'fpe', rotulo: 'Cota-parte do FPE', r: retrotesteFonte(dados, 'fpe') }], [dados])
  const mes = NOMES_MES[proj.meses - 1]
  const total25 = linhas[linhas.length - 1]
  const dedLinha = linhas.find((l) => l.chave === 'ded')

  return (
    <Subvisoes rotulo="O que ver no método" itens={[
      { id: 'fontes', rotulo: 'Conciliação', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="Conciliação da receita de 2025: PLOA, RREO e Portal">
            <p className="max-w-3xl text-small text-ink-soft">Fontes de receita: quadro Evolução da Receita da PLOA 2027 (p. 97), Balanço Orçamentário do RREO (Siconfi, Anexo 01) e Portal de Dados Abertos do ES. Conciliação do exercício fechado de 2025.</p>
              <Nota titulo="Metodologia e limites">
              <p>
                O RREO e o Portal coincidem linha a linha, com diferença inferior a R$ 1 milhão em cada uma (ambos líquidos das deduções). O quadro da PLOA é bruto, com as deduções num bloco à parte, e para 2023 e 2024 o total líquido coincide com o RREO em até R$ 2 milhões. Em 2025 há diferença: o quadro da PLOA soma {mi(total25.ploa)} milhões contra {mi(total25.rreo)} milhões no RREO ({dif(total25.ploa, total25.rreo)} milhões), e as deduções do quadro são {mi(dedLinha?.ploa ?? 0)} milhões contra {mi(dedLinha?.portalBruto ?? 0)} milhões no Portal. Convém perguntar à SEFAZ de onde vem a diferença antes de tomar o quadro de 2025 como referência.
              </p>
              </Nota>
            <div className="mt-3">
              <TabelaItens altura="livre" itens={linhas} legenda="Conferência da receita de 2025 entre a PLOA, o Portal e o RREO, em R$ milhões" colunas={[
                { rotulo: 'Linha (R$ milhões, 2025)', valor: (l) => <span className={l.chave === 'total' ? 'font-semibold' : ''}>{cod(l.cod)}{l.rotulo}</span> },
                { rotulo: 'PLOA', valor: (l) => mi(l.ploa) },
                { rotulo: 'Portal', valor: (l) => mi(l.portalBruto) },
                { rotulo: 'Dif.', valor: (l) => dif(l.portalBruto, l.ploa) },
                { rotulo: 'RREO líq.', valor: (l) => mi(l.rreo) },
                { rotulo: 'Portal líq.', valor: (l) => (l.chave === 'ded' ? '–' : l.rreo === null ? '–' : mi(l.portalLiquido)) },
                { rotulo: 'Dif.', valor: (l) => (l.rreo === null || l.chave === 'ded' ? '–' : dif(l.portalLiquido, l.rreo)) },
              ]} />
              <p className={`mt-2 ${NOTA_DISCRETA}`}>
                PLOA e Portal: valores brutos, antes das deduções (na linha de deduções, os próprios valores negativos; no total, a receita líquida). RREO e Portal líquido: valores líquidos das deduções, linha a linha. “Dif.”: Portal menos PLOA, e Portal líquido menos RREO. Os códigos são os da natureza da receita (categoria econômica, origem e espécie); GND é o grupo de natureza da despesa.
              </p>
            </div>
            <div className="mt-3">
              <TabelaItens altura="livre" itens={totais} legenda="Receita líquida total: quadro da PLOA contra RREO, em R$ milhões" colunas={[
                { rotulo: 'Receita líquida total', valor: (x) => x.chave },
                { rotulo: 'PLOA', valor: (x) => mi(x.ploa) },
                { rotulo: 'RREO', valor: (x) => mi(x.rreo) },
                { rotulo: 'Dif.', valor: (x) => dif(x.ploa, x.rreo) },
              ]} />
            </div>
          </Cartao>
        </div>
      ) },
      { id: 'projecao', rotulo: 'Projeção de 2026', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="Projeção de fechamento de 2026: receita">
            <p className="max-w-3xl text-small text-ink-soft">
                Participação sazonal: acumulado de 2026 até {mes} ÷ participação média do período no ano em 2022–2025, por tipo de receita. Receita total, líquida de deduções: {bilhoes(proj.acumulado)} ÷ {numero(proj.participacao * 100, 1)}% = {bilhoes(proj.central)}. Faixa de {numero(proj.min / 1e9, 1)} a {numero(proj.max / 1e9, 1)} bi pelas participações extremas ({proj.sazonalidade.map((s) => `${numero(s.participacao * 100, 1)}% em ${s.ano}`).join('; ')}).
              </p>
              <Nota titulo="Metodologia e limites">
              <p>
                Só entra arrecadação realizada (Siconfi, RREO, Anexo 01, até 2025; Portal de Dados Abertos para 2026, que coincide com o RREO). Não se usa orçamento nem previsão de nenhum ano. Para o ICMS a fração é mês a mês (RREO, Anexo 03); IPVA, IRRF e ITCD usam a sazonalidade de 2023 a 2025 do demonstrativo mensal da SEFAZ (o Portal só tem mês a mês a partir de 2025); em demais receitas correntes, indenizações, restituições e ressarcimentos (espécie 192) são tratados como pontuais e entram só pelo que já foi realizado; as deduções são o resíduo entre a receita total projetada, líquida de deduções, e a soma das linhas brutas.
              </p>
              <p>Pressupõe que o restante do ano siga a sazonalidade dos anos anteriores: não capta receita extraordinária, operação de crédito ainda não ingressada nem mudança de alíquota. Teste retroativo abaixo.</p>
              </Nota>
            <div className="mt-3">
              <TabelaItens altura="livre" itens={[...retro.grupos, retro.total].map((g) => ({ ...g, chave: g.id }))} legenda="Teste retroativo da projeção, erro de cada ano em %" colunas={[
                { rotulo: 'Erro da projeção feita em outubro', valor: (g) => <span className={g.id === 'total' ? 'font-semibold' : ''}>{g.rotulo}</span> },
                ...[2022, 2023, 2024, 2025].map((a) => ({ rotulo: String(a), valor: (g: (typeof retro.total)) => fmtPct(g.erros.find((e) => e.ano === a)?.erro ?? undefined) })),
                { rotulo: 'Erro médio', valor: (g) => <span className="font-semibold">{g.erroMedio === null ? '–' : `${numero(g.erroMedio, 1)}%`}</span> },
              ]} />
              <p className={`mt-2 ${NOTA_DISCRETA}`}>
                Erro = projeção com acumulado até outubro e frações dos até quatro anos anteriores, menos o realizado, em % do realizado; erro médio em módulo. A projeção de 2026 usa 2022–2025, a mesma janela.
              </p>
            </div>
          </Cartao>
          <Cartao titulo="Teste retroativo: IPVA, IRRF, ITCD e demais receitas correntes">
        <p className="max-w-3xl text-small text-ink-soft">Sazonalidade de 2023 a 2025 (demonstrativo mensal da SEFAZ). Projeção de outubro de 2024 e de 2025 com os anos anteriores disponíveis.</p>
        <div className="mt-3">
          <TabelaItens altura="livre" itens={retroSefaz.map((g) => ({ ...g, chave: g.id }))} legenda="Teste retroativo da projeção de IPVA, IRRF, ITCD e demais receitas correntes, erro em %" colunas={[
            { rotulo: 'Erro da projeção feita em outubro', valor: (g) => g.rotulo },
            ...[2024, 2025].map((a) => ({ rotulo: String(a), valor: (g: RetroSefaz) => fmtPct(g.erros.find((e) => e.ano === a)?.erro ?? undefined) })),
            { rotulo: 'Erro médio', valor: (g) => <span className="font-semibold">{g.erroMedio === null ? '–' : `${numero(g.erroMedio, 1)}%`}</span> },
          ]} />
        </div>
        <Nota titulo="Limites">
          <p>Só há um ou dois anos de teste, por isso a leitura é indicativa. IPVA e IRRF erram pouco; o ITCD tende a ser subestimado (a fração arrecadada até outubro vem caindo), e a parte recorrente de demais receitas oscila com o calendário de multas e compensações. Indenizações, restituições e ressarcimentos (espécie 192) foram de R$ 149 mi em 2023, R$ 1,3 bi em 2024 e R$ 638 mi em 2025: por serem pontuais, entram na projeção de 2026 só pelo realizado e a referência de 2027 não os repete.</p>
        </Nota>
      </Cartao>

      <Cartao titulo="Projeção de fechamento de 2026: despesa empenhada">
            <p className="max-w-3xl text-small text-ink-soft">
                Despesa empenhada por grupo de natureza até agosto (4º bimestre do RREO, Anexo 01) ÷ participação média do período no ano em 2022–2025. O RREO exclui a despesa intraorçamentária; para a base dos quadros da PLOA, cada grupo é multiplicado pela razão entre o valor de 2025 no quadro da PLOA e no RREO. Reservas não são executadas (zero).
              </p>
              <Nota titulo="Metodologia e limites">
              <p>O erro é maior onde a execução se concentra no fim do exercício, como nos investimentos (teste retroativo).</p>
              </Nota>
            <div className="mt-3">
              <TabelaItens altura="livre" itens={retroDesp.map((g) => ({ ...g, chave: g.id }))} legenda="Teste retroativo da projeção da despesa, erro de cada ano em %" colunas={[
                { rotulo: 'Erro da projeção feita em agosto', valor: (g) => <span className={g.id === 'total' ? 'font-semibold' : ''}>{g.rotulo}</span> },
                ...[2022, 2023, 2024, 2025].map((a) => ({ rotulo: String(a), valor: (g: RetroDespesa) => fmtPct(g.erros.find((e) => e.ano === a)?.erro ?? undefined) })),
                { rotulo: 'Erro médio', valor: (g) => <span className="font-semibold">{g.erroMedio === null ? '–' : `${numero(g.erroMedio, 1)}%`}</span> },
              ]} />
            </div>
          </Cartao>
        </div>
      ) },
      { id: 'pib', rotulo: 'PIB e arrecadação', conteudo: (
        <Cartao titulo="Impostos do ES e PIB nominal do Brasil">
          <p className="max-w-3xl text-small text-ink-soft">
            Desde {pibA.linhas[0].ano}, os impostos do ES cresceram em média {numero(pibA.difMedia, 1)} p.p. acima do PIB nominal, com desvio de {numero(pibA.difDesvio, 1)} p.p. (R² {numero(pibA.r2, 2)}). A Proj. 27 supõe crescimento da receita igual ao do PIB nominal do Focus ({fmtPct(pib27 * 100)}).
          </p>
          <div className="mt-3">
            <TabelaItens altura="livre" itens={itensPib} legenda="Crescimento anual do PIB nominal e dos impostos do ES, em %" colunas={[
              { rotulo: 'Ano', valor: (l) => <span className={l.forte ? 'font-semibold' : ''}>{l.rotulo}</span> },
              { rotulo: 'PIB nominal', valor: (l) => fmtPct(l.pib) },
              { rotulo: 'Impostos do ES', valor: (l) => fmtPct(l.imp) },
              { rotulo: 'Diferença (p.p.)', valor: (l) => <span className={l.forte ? 'font-semibold' : ''}>{fmtPct(l.dif)}</span> },
            ]} />
          </div>
          <Nota titulo="Metodologia e limites">
            <p>A elasticidade estimada é {numero(pibA.elasticidade, 2)} (regressão dos log-crescimentos, {pibA.n} anos): em média, cada 1% de PIB nominal veio com {numero(pibA.elasticidade, 1)}% de impostos. Com o PIB nominal de {fmtPct(pib27 * 100)} em 2027, a regressão daria impostos {fmtPct(impostosRegressao * 100)}, contra {fmtPct(pib27 * 100)} na referência e {fmtPct(impostosPloa * 100)} na PLOA (sobre o fechamento projetado de 2026).</p>
            <p>O PIB entra como faixa de plausibilidade da Proj. 27, não como correção do valor central: a diferença para o PIB oscila de {fmtPct(difMin.dif)} ({difMin.ano}) a {fmtPct(difMax.dif)} ({difMax.ano}) p.p., o que pode refletir alíquotas, preços de combustíveis e petróleo ou atividade, sem separação de causas. A faixa usa o desvio de {numero(pibA.difDesvio, 1)} p.p. Fontes: PIB, Banco Central (SGS 1207); impostos, Siconfi (RREO, Anexo 01, 6º bimestre). Poucos anos e quebras estruturais: indicativo.</p>
          </Nota>
        </Cartao>
      ) },
      { id: 'metodos', rotulo: 'ICMS e FPE', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="Teste de métodos de projeção: ICMS e FPE">
            <p className="max-w-3xl text-small text-ink-soft">Série mensal do RREO (Anexo 03, desde 2019). Quatro métodos: sazonalidade média de quatro anos e variação sobre o mesmo período do ano anterior nos 3 últimos meses, no acumulado do ano e nos 12 últimos meses.</p>
              <Nota titulo="Metodologia e limites">
              <p>Cada método foi aplicado, com dados até outubro, a cada ano de 2021 a 2025; erro = projeção menos realizado, em % do realizado, e média dos erros em módulo. A diferença entre os métodos é pequena (pior média de 2%) e baseada em cinco anos; a projeção por fonte traz a faixa entre os métodos.</p>
              </Nota>
            <div className="mt-3 space-y-3">
              {retroFontes.map((f) => (
                <TabelaItens key={f.id} altura="livre" itens={f.r.map((x) => ({ ...x, chave: x.metodo }))} legenda={`Teste dos métodos de projeção, ${f.rotulo}, erro em %`} colunas={[
                  { rotulo: `${f.rotulo}: erro da projeção feita em outubro`, valor: (x) => NOMES_METODO[x.metodo] },
                  ...[2021, 2022, 2023, 2024, 2025].map((a) => ({ rotulo: String(a), valor: (x: (typeof f.r)[number]) => fmtPct(x.erros.find((e) => e.ano === a)?.erro) })),
                  { rotulo: 'Erro médio', valor: (x) => <span className={x.mae === Math.min(...f.r.map((y) => y.mae)) ? 'font-semibold text-navy' : 'font-semibold'}>{numero(x.mae, 1)}%{x.mae === Math.min(...f.r.map((y) => y.mae)) ? ' ✓' : ''}</span> },
                ]} />
              ))}
              <p className={`${NOTA_DISCRETA}`}>✓ método de menor erro médio, usado na projeção. Petróleo (compensação financeira pela produção): sem história mensal no Portal antes de 2025 e com parcelas trimestrais; ritmo recente como única referência, com faixa indicativa.</p>
            </div>
          </Cartao>
        </div>
      ) },
      { id: 'def', rotulo: 'Definições', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="Definições">
            <dl className="max-w-3xl space-y-2 text-small">
              {[
                ['Receita total, líquida de deduções', 'Arrecadação bruta (correntes, intraorçamentárias e de capital) menos as deduções da receita (transferências constitucionais aos municípios, Fundeb e outras). Corresponde ao subtotal das receitas (III) do Balanço Orçamentário (RREO) e ao total do quadro Evolução da Receita da PLOA. Distinta da RCL (LRF, art. 2º, IV).'],
                ['Real', 'Variação nominal deflacionada pelo IPCA do ano de destino: (1 + variação nominal) ÷ (1 + IPCA) − 1. IPCA de 2023 a 2025 observado; 2026 e 2027 do Focus.'],
                ['RCL aproximada', 'Receitas correntes mais intraorçamentárias menos as deduções do quadro da PLOA; difere da RCL apurada nos termos da LRF.'],
                ['Proj. 26 e Proj. 27', 'Proj. 26: fechamento de 2026 projetado pelo ritmo de arrecadação ou execução. Proj. 27: Proj. 26 corrigida por IPCA e PIB real (receita) ou IPCA (despesa), sem usar a PLOA. Dif. = PLOA 2027 menos Proj. 27.'],
                ['≈ (oscila)', 'Participação do período no ano varia mais de 8 p.p. entre os anos: projeção da linha de baixa precisão.'],
                              ].map(([t, d]) => (
                <div key={t}><dt className="font-semibold text-ink">{t}</dt><dd className="text-ink-soft">{d}</dd></div>
              ))}
            </dl>
          </Cartao>
        </div>
      ) },
    ]} />
  )
}
