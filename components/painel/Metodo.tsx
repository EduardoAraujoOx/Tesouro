'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { fmtPct } from './GraficosMacro'
import { Nota, Subvisoes } from './Estrutura'
import { ANOS_RITMO, conciliacao, NOMES_METODO, projetaReceita2026, retroteste, retrotesteDespesa, retrotesteFonte, retrotesteSefaz, type DadosReceita, type RetroDespesa, type RetroSefaz } from './projecao'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mi = (x: number | null) => (x === null ? '–' : milhoes(x === 0 ? 0 : x, 0))
const dif = (a: number | null, b: number | null) => (a === null || b === null ? '–' : Math.abs(a - b) < 5e5 ? '0' : `${a - b > 0 ? '+' : '−'}${milhoes(Math.abs(a - b), 0)}`)
const cod = (c: string) => <span className="block text-label normal-case tracking-normal tabular-nums text-ink-soft md:mr-1.5 md:inline-block md:min-w-[6.5rem] md:text-small md:normal-case">{c}</span>

/** Seção de método e fontes: as fontes batem entre si, como a projeção é feita e quão boa ela é, e o que significam os números. */
export function Metodo({ receita, dados }: { receita: LinhaMacro[]; dados: DadosReceita }) {
  const quadro = useMemo(() => Object.fromEntries(receita.map((x) => [x.chave, x.valores])) as Record<string, number[]>, [receita])
  const linhas = useMemo(() => conciliacao(dados, quadro, 2025).map((l) => ({ ...l, chave: l.chave })), [dados, quadro])
  const totais = useMemo(() => ANOS_RITMO.map((a) => {
    const r = conciliacao(dados, quadro, a === 2025 ? 2025 : a)
    return { chave: String(a), ano: a, ploa: quadro.total[a - 2023], rreo: r[r.length - 1].rreo }
  }), [dados, quadro])
  const retro = useMemo(() => retroteste(), [])
  const retroDesp = useMemo(() => retrotesteDespesa(), [])
  const retroSefaz = useMemo(() => retrotesteSefaz(), [])
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const retroFontes = useMemo(() => [{ id: 'icms', rotulo: 'ICMS', r: retrotesteFonte(dados, 'icms') }, { id: 'fpe', rotulo: 'Cota-parte do FPE', r: retrotesteFonte(dados, 'fpe') }], [dados])
  const mes = NOMES_MES[proj.meses - 1]
  const total25 = linhas[linhas.length - 1]
  const dedLinha = linhas.find((l) => l.chave === 'ded')

  return (
    <Subvisoes rotulo="O que ver no método" itens={[
      { id: 'fontes', rotulo: 'As fontes batem?', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="As fontes batem entre si?">
            <p className="max-w-3xl text-small text-ink-soft">O painel usa três fontes de receita: o quadro “Evolução da Receita” da PLOA 2027 (p. 97), o Balanço Orçamentário do RREO no Siconfi (Anexo 01) e o arquivo de receitas do Portal de Dados Abertos do ES. A conferência abaixo, para 2025 (ano fechado), mostra onde elas coincidem.</p>
              <Nota titulo="Como foi feito, limites e leitura">
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
              <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
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
      { id: 'projecao', rotulo: 'Como projetamos 2026', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="Receita: como projetamos o fechamento de 2026">
            <p className="max-w-3xl text-small text-ink-soft">
                O método é o da participação sazonal: para cada tipo de receita, mede-se que fração da arrecadação do ano já estava feita até {mes} nos anos anteriores (média de 2022 a 2025) e divide-se o acumulado de 2026 por essa fração. Para a receita líquida total, {bilhoes(proj.acumulado)} ÷ {numero(proj.participacao * 100, 1)}% = {bilhoes(proj.central)}. A faixa de {numero(proj.min / 1e9, 1)} a {numero(proj.max / 1e9, 1)} bi usa a menor e a maior fração observadas ({proj.sazonalidade.map((s) => `${numero(s.participacao * 100, 1)}% em ${s.ano}`).join('; ')}).
              </p>
              <Nota titulo="Como foi feito, limites e leitura">
              <p>
                Só entra arrecadação realizada (Siconfi, RREO, Anexo 01, até 2025; Portal de Dados Abertos para 2026, que coincide com o RREO). Não se usa orçamento nem previsão de nenhum ano. Para o ICMS a fração é mês a mês (RREO, Anexo 03); IPVA, IRRF e ITCD usam a sazonalidade de 2023 a 2025 do demonstrativo mensal da SEFAZ (o Portal só tem mês a mês a partir de 2025); em demais receitas correntes, indenizações, restituições e ressarcimentos (espécie 192) são tratados como pontuais e entram só pelo que já foi realizado; as deduções são o resíduo entre a receita líquida projetada e a soma das linhas brutas.
              </p>
              <p>O método supõe que o resto do ano se comporta como nos anos anteriores: não enxerga receita extraordinária, operação de crédito que ainda não entrou nem mudança de alíquota. A tabela abaixo mostra o quanto ele erraria se tivesse sido usado em cada ano passado.</p>
              </Nota>
            <div className="mt-3">
              <TabelaItens altura="livre" itens={[...retro.grupos, retro.total].map((g) => ({ ...g, chave: g.id }))} legenda="Teste retroativo da projeção, erro de cada ano em %" colunas={[
                { rotulo: 'Erro da projeção feita em outubro', valor: (g) => <span className={g.id === 'total' ? 'font-semibold' : ''}>{g.rotulo}</span> },
                ...[2022, 2023, 2024, 2025].map((a) => ({ rotulo: String(a), valor: (g: (typeof retro.total)) => fmtPct(g.erros.find((e) => e.ano === a)?.erro ?? undefined) })),
                { rotulo: 'Erro médio', valor: (g) => <span className="font-semibold">{g.erroMedio === null ? '–' : `${numero(g.erroMedio, 1)}%`}</span> },
                { rotulo: 'Leitura', valor: (g) => (g.erroMedio === null ? '–' : g.erroMedio <= 3 ? 'confiável' : g.erroMedio <= 8 ? 'razoável' : 'pouco confiável') },
              ]} />
              <p className="mt-2 text-label normal-case tracking-normal text-ink-soft">
                Erro = projeção feita com o acumulado até outubro e as frações dos até quatro anos anteriores, menos o realizado do ano, em % do realizado. “Erro médio”: média dos erros em módulo. Confiável: até 3%; razoável: até 8%; pouco confiável: acima disso.
                A projeção de 2026 usa 2022–2025, a mesma janela dos testes.
              </p>
            </div>
          </Cartao>
          <Cartao titulo="IPVA, IRRF, ITCD e demais receitas: quão boa é a projeção?">
        <p className="max-w-3xl text-small text-ink-soft">Essas linhas usam a sazonalidade de 2023 a 2025 do demonstrativo mensal da SEFAZ. O teste refaz a projeção de outubro de 2024 e de 2025 com os anos anteriores disponíveis.</p>
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

      <Cartao titulo="Despesa: como projetamos o fechamento de 2026">
            <p className="max-w-3xl text-small text-ink-soft">
                Mesma lógica da receita, aplicada à despesa empenhada de cada grupo: divide-se o que já foi empenhado até agosto (4º bimestre do RREO) pela fração que o mesmo período costuma representar no ano (média de 2022 a 2025). O RREO traz a despesa exceto intraorçamentária; para ficar na base dos quadros da PLOA, cada grupo é multiplicado pela razão entre o valor de 2025 no quadro da PLOA e o de 2025 no RREO. Reservas não são executadas e entram com zero.
              </p>
              <Nota titulo="Como foi feito, limites e leitura">
              <p>O erro é maior onde a execução é concentrada no fim do ano, como os investimentos: ver o teste retroativo.</p>
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
      { id: 'metodos', rotulo: 'ICMS e FPE: métodos', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="ICMS e FPE: qual método de projeção erra menos?">
            <p className="max-w-3xl text-small text-ink-soft">Para as duas maiores fontes há série mensal longa (RREO, Anexo 03, desde 2019), o que permite comparar quatro métodos: a sazonalidade média de quatro anos e três variações do ritmo recente (últimos 3 meses, acumulado do ano e últimos 12 meses sobre o mesmo período do ano anterior). O ritmo recente capta aceleração ou desaceleração durante o ano, que a sazonalidade não vê.</p>
              <Nota titulo="Como foi feito, limites e leitura">
              <p>Cada método foi aplicado, como se fosse outubro, a cada ano de 2021 a 2025; a tabela mostra o erro (projeção menos realizado, em % do realizado) e a média dos erros em módulo. A diferença entre os métodos é pequena (a pior média fica em 2%) e baseada em cinco anos, por isso a projeção por fonte mostra também a faixa entre os métodos.</p>
              </Nota>
            <div className="mt-3 space-y-3">
              {retroFontes.map((f) => (
                <TabelaItens key={f.id} altura="livre" itens={f.r.map((x) => ({ ...x, chave: x.metodo }))} legenda={`Teste dos métodos de projeção, ${f.rotulo}, erro em %`} colunas={[
                  { rotulo: `${f.rotulo}: erro da projeção feita em outubro`, valor: (x) => NOMES_METODO[x.metodo] },
                  ...[2021, 2022, 2023, 2024, 2025].map((a) => ({ rotulo: String(a), valor: (x: (typeof f.r)[number]) => fmtPct(x.erros.find((e) => e.ano === a)?.erro) })),
                  { rotulo: 'Erro médio', valor: (x) => <span className={x.mae === Math.min(...f.r.map((y) => y.mae)) ? 'font-semibold text-navy' : 'font-semibold'}>{numero(x.mae, 1)}%{x.mae === Math.min(...f.r.map((y) => y.mae)) ? ' ✓' : ''}</span> },
                ]} />
              ))}
              <p className="text-label normal-case tracking-normal text-ink-soft">✓ marca o método de menor erro médio, usado na projeção da aba Receita. O petróleo (compensação financeira pela produção) não tem história mensal no Portal antes de 2025 e chega em parcelas trimestrais: nele o ritmo recente é a única referência, com faixa indicativa.</p>
            </div>
          </Cartao>
        </div>
      ) },
      { id: 'def', rotulo: 'Definições', conteudo: (
        <div className="space-y-3">
          <Cartao titulo="Definições usadas nas telas">
            <dl className="max-w-3xl space-y-2 text-small">
              {[
                ['Receita líquida', 'Arrecadação bruta menos as deduções (transferências constitucionais aos municípios, Fundeb e outras). É o valor que o RREO apresenta.'],
                ['Real', 'Variação nominal deflacionada pelo IPCA do ano de destino: (1 + variação nominal) ÷ (1 + IPCA) − 1. IPCA de 2023 a 2025 observado; 2026 e 2027 do Focus.'],
                ['Receita corrente líquida aproximada', 'Receitas correntes mais intraorçamentárias menos as deduções do quadro da PLOA. Não é a RCL da LRF, que tem regras próprias de apuração.'],
                ['Δ% sobre a projeção', 'Quanto a receita proposta para 2027 se afasta do fechamento de 2026 projetado pelo ritmo de arrecadação, e não do “provável” informado na PLOA.'],
                ['≈ (oscila)', 'A fração do ano arrecadada até o corte varia mais de 8 pontos percentuais entre os anos: a projeção dessa linha é pouco confiável.'],
                ['▲ ▼ (destaque)', 'A variação da linha difere em 5 pontos percentuais ou mais da do total e envolve ao menos R$ 100 milhões. Serve para indicar onde olhar primeiro, não como conclusão.'],
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
