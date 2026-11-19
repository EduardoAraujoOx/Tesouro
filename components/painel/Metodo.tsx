'use client'

import { useMemo } from 'react'
import { bilhoes, milhoes, numero } from '@/lib/formato'
import type { LinhaMacro } from '@/lib/macro'
import { Cartao, TabelaItens } from './Graficos'
import { fmtPct } from './GraficosMacro'
import { ANOS_RITMO, conciliacao, NOMES_METODO, projetaReceita2026, retroteste, retrotesteFonte, type DadosReceita } from './projecao'

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
  const proj = useMemo(() => projetaReceita2026(dados), [dados])
  const retroFontes = useMemo(() => [{ id: 'icms', rotulo: 'ICMS', r: retrotesteFonte(dados, 'icms') }, { id: 'fpe', rotulo: 'Cota-parte do FPE', r: retrotesteFonte(dados, 'fpe') }], [dados])
  const mes = NOMES_MES[proj.meses - 1]
  const total25 = linhas[linhas.length - 1]
  const dedLinha = linhas.find((l) => l.chave === 'ded')

  return (
    <div className="space-y-3">
      <Cartao titulo="1. As fontes batem entre si?">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>O painel usa três fontes de receita: o quadro “Evolução da Receita” da PLOA 2027 (p. 97), o Balanço Orçamentário do RREO no Siconfi (Anexo 01) e o arquivo de receitas do Portal de Dados Abertos do ES. A conferência abaixo, para 2025 (ano fechado), mostra onde elas coincidem.</p>
          <p>
            O RREO e o Portal coincidem linha a linha, com diferença inferior a R$ 1 milhão em cada uma (ambos líquidos das deduções). O quadro da PLOA é bruto, com as deduções num bloco à parte, e para 2023 e 2024 o total líquido coincide com o RREO em até R$ 2 milhões. Em 2025 há diferença: o quadro da PLOA soma {mi(total25.ploa)} milhões contra {mi(total25.rreo)} milhões no RREO ({dif(total25.ploa, total25.rreo)} milhões), e as deduções do quadro são {mi(dedLinha?.ploa ?? 0)} milhões contra {mi(dedLinha?.portalBruto ?? 0)} milhões no Portal. Convém perguntar à SEFAZ de onde vem a diferença antes de tomar o quadro de 2025 como referência.
          </p>
        </div>
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

      <Cartao titulo="2. Como projetamos o fechamento de 2026">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>
            O método é o da participação sazonal: para cada tipo de receita, mede-se que fração da arrecadação do ano já estava feita até {mes} nos anos anteriores (média de 2022 a 2025) e divide-se o acumulado de 2026 por essa fração. Para a receita líquida total, {bilhoes(proj.acumulado)} ÷ {numero(proj.participacao * 100, 1)}% = {bilhoes(proj.central)}. A faixa de {numero(proj.min / 1e9, 1)} a {numero(proj.max / 1e9, 1)} bi usa a menor e a maior fração observadas ({proj.sazonalidade.map((s) => `${numero(s.participacao * 100, 1)}% em ${s.ano}`).join('; ')}).
          </p>
          <p>
            Só entra arrecadação realizada (Siconfi, RREO, Anexo 01, até 2025; Portal de Dados Abertos para 2026, que coincide com o RREO). Não se usa orçamento nem previsão de nenhum ano. Para o ICMS a fração é mês a mês (RREO, Anexo 03); IPVA, IRRF e ITCD só têm sazonalidade de 2025 no Portal; as deduções são o resíduo entre a receita líquida projetada e a soma das linhas brutas.
          </p>
          <p>O método supõe que o resto do ano se comporta como nos anos anteriores: não enxerga receita extraordinária, operação de crédito que ainda não entrou nem mudança de alíquota. A tabela abaixo mostra o quanto ele erraria se tivesse sido usado em cada ano passado.</p>
        </div>
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

      <Cartao titulo="3. ICMS e FPE: qual método de projeção erra menos?">
        <div className="max-w-3xl space-y-2 text-small text-ink-soft">
          <p>Para as duas maiores fontes há série mensal longa (RREO, Anexo 03, desde 2019), o que permite comparar quatro métodos: a sazonalidade média de quatro anos e três variações do ritmo recente (últimos 3 meses, acumulado do ano e últimos 12 meses sobre o mesmo período do ano anterior). O ritmo recente capta aceleração ou desaceleração durante o ano, que a sazonalidade não vê.</p>
          <p>Cada método foi aplicado, como se fosse outubro, a cada ano de 2021 a 2025; a tabela mostra o erro (projeção menos realizado, em % do realizado) e a média dos erros em módulo. A diferença entre os métodos é pequena (a pior média fica em 2%) e baseada em cinco anos, por isso a projeção por fonte mostra também a faixa entre os métodos.</p>
        </div>
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

      <Cartao titulo="4. Definições usadas nas telas">
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
  )
}
