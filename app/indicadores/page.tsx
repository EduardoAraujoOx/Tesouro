import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ExploradorIndicadores } from '@/components/ExploradorIndicadores'
import { IconExternal } from '@/components/Icons'
import { formatarData, maisRecente } from '@/lib/acervo'
import {
  bilhoes, capagAtualizadaEm, catalogoIndicadores, classificacoesCapag, coletadoEm, degrauHaveres, fontes, periodoUltimoRreo, precosEm, rotuloPeriodo, ultimoLrf, ultimoRreo,
} from '@/lib/indicadores'

export const metadata: Metadata = {
  title: 'Painel fiscal',
  description: 'Painel quantitativo com os indicadores fiscais oficiais do Espírito Santo: execução do orçamento, arrecadação, caixa, limites da Lei de Responsabilidade Fiscal e nota da CAPAG, em séries históricas atualizadas automaticamente.',
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)

export default function Indicadores() {
  const rgf = maisRecente({ tipos: ['rgf'] })
  const degrau = degrauHaveres()
  const indicadores = catalogoIndicadores()
  const notas: { id: string; ano: number; sub: number; texto: string }[] = degrau
    ? [{
        id: 'divida', ano: degrau.em.ano, sub: degrau.em.quad,
        texto: `No ${rotuloPeriodo(degrau.em)}, o item “demais haveres financeiros”, que reduz a dívida líquida, passou de ${bilhoes(degrau.de)} para ${bilhoes(degrau.para)}, enquanto a dívida bruta permaneceu estável. Por isso a série apresenta um degrau nesse ponto.`,
      }]
    : []
  const notaFaixas = 'As linhas marcam as faixas das notas da Portaria Normativa MF nº 1.583/2023, que o Tesouro Nacional aplica às edições mais recentes. Edições anteriores seguiram regras anteriores, com outras faixas e outros cálculos; por isso uma barra antiga pode passar de uma linha e ainda assim ter recebido nota A (a poupança corrente de 2019, de 88,3%, por exemplo). A nota de cada edição é sempre a divulgada pelo Tesouro Nacional.'
  const parcial = ultimoRreo.bimestre < 6
  for (const id of ['receita', 'despesa', 'investimentos', 'educacao', 'saude', 'seguranca', 'transporte', 'funcao-previdencia', 'encargos', 'aportes', 'capitalizacao', 'militares']) {
    notas.push({ id, ano: 0, sub: 0, texto: `Valores correntes; para comparar anos em poder de compra, ative a correção pelo IPCA em Opções. ${parcial ? `O ponto marcado com asterisco (${ultimoRreo.ano}) reúne o ${periodoUltimoRreo} e por isso é parcial; a previsão e a dotação com que ele se compara, quando há, são as do ano inteiro.` : ''}`.trim() })
  }
  if (parcial) notas.push({ id: 'rcl', ano: 0, sub: 0, texto: `O ponto marcado com asterisco (${ultimoRreo.ano}) soma os doze meses encerrados no ${periodoUltimoRreo.split(' (')[0]}. Valores correntes; para comparar anos em poder de compra, ative a correção pelo IPCA em Opções.` })
  notas.push({ id: 'educacao', ano: 0, sub: 0, texto: 'A série da função Educação tem um salto entre 2020 e 2021. O demonstrativo não explica a causa, que pode envolver mudança de classificação contábil; consulte o RREO do ano antes de interpretar a variação.' })
  notas.push({ id: 'militares', ano: 0, sub: 0, texto: 'O demonstrativo passou a trazer esta linha em 2021; por isso a série começa nesse ano.' })
  for (const id of ['caixa-apos', 'caixa-antes', 'caixa-bruto']) {
    notas.push({ id, ano: 0, sub: 0, texto: 'O RGF informa o caixa dos recursos livres em 31 de dezembro de cada ano; entre dezembros, o painel não tem posição oficial. Por padrão os valores aparecem corrigidos pelo IPCA; desative a correção em Opções para ver os valores publicados.' })
  }
  for (const id of ['icms', 'fpe', 'royalties']) {
    const ind = indicadores.find((i) => i.id === id)
    const ult = ind ? [...ind.pontos].reverse().find((p) => p.valor !== null) : undefined
    notas.push({ id, ano: 0, sub: 0, texto: `Série até ${ult?.extenso ?? 'o último mês disponível'}. Cada mês do ano anterior é corrigido pelo IPCA para os preços do mesmo mês do ano atual antes de ser somado.${id === 'royalties' ? ' Os dados da ANP são publicados com defasagem e não incluem a participação especial.' : ' Os valores são os de antes das transferências aos municípios e ao Fundeb.'}` })
  }
  for (const id of ['endividamento', 'poupanca', 'liquidez']) notas.push({ id, ano: 0, sub: 0, texto: notaFaixas })

  return (
    <>
    <section aria-labelledby="titulo-pagina" className="relative isolate overflow-hidden bg-navy-deep text-on-navy">
      <div aria-hidden="true" className="banner-img absolute inset-y-0 right-0 -z-20 hidden w-[72%] md:block">
        <Image src="/img/banner-indicadores.jpg" alt="" fill sizes="72vw" className="object-cover object-right" />
      </div>
      <div aria-hidden="true" className="banner-sombra absolute inset-0 -z-10 hidden md:block" />
      <div className="mx-auto max-w-page px-5 py-4 md:px-8 md:py-5">
        <nav aria-label="Você está em" className="hidden text-small md:block">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="underline underline-offset-4">Início</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Painel fiscal</li>
          </ol>
        </nav>
        <h1 id="titulo-pagina" className="text-headline !text-on-navy md:mt-2">Painel fiscal</h1>
        <p className="mt-1 hidden max-w-2xl text-body text-on-navy md:block">Acompanhe a execução do orçamento, a arrecadação, o caixa, os limites da Lei de Responsabilidade Fiscal (LRF) e a capacidade de pagamento do Estado, com dados oficiais atualizados automaticamente.</p>
      </div>
    </section>
    <div className="mx-auto max-w-page px-5 py-5 md:px-8 md:py-6">
      <ExploradorIndicadores indicadores={indicadores} notas={notas} classificacoes={classificacoesCapag} geradoEm={coletadoEm} precosEm={precosEm} />

      <details id="metodo" className="group mt-10 border-t border-line pt-2">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 text-body font-semibold text-ink">Metodologia, definições e dados abertos<span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">⌄</span></summary>
        <div className="mt-2 pb-6">
          <h2 className="text-title">Definição de cada variável</h2>
          <dl className="mt-4 grid max-w-5xl gap-x-12 gap-y-6 md:grid-cols-2">
            {indicadores.map((i) => (
              <div key={i.id}>
                <dt className="text-body font-semibold text-ink">{i.nome}</dt>
                <dd className="mt-1 text-body text-ink-soft">{i.definicao}</dd>
                <dd className="mt-1 text-small text-ink-soft"><strong className="text-ink">Cálculo:</strong> {i.formula}.</dd>
                <dd className="text-small text-ink-soft"><strong className="text-ink">Limite:</strong> {i.limite}. <strong className="text-ink">Base:</strong> {i.base}.</dd>
                <dd className="text-small text-ink-soft"><strong className="text-ink">Fonte:</strong> {i.fonte}.</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-10 text-title">Como os números chegam aqui</h2>
          <div className="mt-3 grid max-w-4xl gap-4 text-body text-ink-soft">
            <p><strong className="text-ink">Origem.</strong> Os limites da LRF vêm do Relatório de Gestão Fiscal do Poder Executivo, lido na {ext(fontes.siconfi, 'API de dados abertos do Siconfi')}. A CAPAG vem do conjunto de dados abertos do {ext(fontes.capag, 'Tesouro Transparente')}, atualizado em {formatarData(capagAtualizadaEm)}. O portal não altera os valores: apenas converte, quando o relatório informa o limite em reais, em percentual da receita corrente líquida ajustada.</p>
            <p><strong className="text-ink">Orçamento, arrecadação e caixa.</strong> A execução do orçamento, as despesas por função, a receita corrente líquida e as receitas e despesas previdenciárias vêm do Relatório Resumido da Execução Orçamentária (RREO) do Poder Executivo, nos Anexos 01, 02, 03 e 04, lidos na API do Siconfi. O ICMS e a cota-parte do FPE, mês a mês, vêm do Anexo 03; os royalties, dos dados abertos da ANP; e o caixa dos recursos livres, do Anexo 5 do RGF de dezembro. Os valores do RREO acumulam no ano: cada barra anual mostra o último bimestre disponível do exercício, e o ano em curso aparece marcado com asterisco por ser parcial. A correção pela inflação usa o IPCA do Banco Central. Os mínimos constitucionais de aplicação em educação e em saúde não são reproduzidos: seus demonstrativos (Anexos 08 e 12 do RREO) não constam dos dados abertos do Siconfi para o Estado. Último período do RREO: {periodoUltimoRreo}; preços de {precosEm}.</p>
            <p><strong className="text-ink">Atualização automática.</strong> Uma rotina semanal consulta as fontes oficiais e, havendo dado novo, abre uma proposta de atualização que, depois de verificada, publica os números sem digitação. O RGF é entregue a cada quadrimestre e a CAPAG, uma vez por ano. Último período do RGF: {rotuloPeriodo(ultimoLrf)}{ultimoLrf.entregaEm && <>, entregue em {formatarData(ultimoLrf.entregaEm)}</>}.</p>
            <p><strong className="text-ink">Limites antes de 2024.</strong> Nos relatórios anteriores a 2024, o limite da dívida (200%) e o das garantias (22%) não constam em reais; o painel usa o valor fixado pelo Senado Federal, o mesmo dos relatórios recentes.</p>
            <p><strong className="text-ink">Como a CAPAG classifica.</strong> Cada um dos três indicadores recebe uma nota parcial. Endividamento: A abaixo de 60%, B de 60% a menos de 100%, C a partir de 100%. Poupança corrente: A abaixo de 85%, B de 85% a menos de 95%, C a partir de 95%. Liquidez relativa: A a partir de 5%, B acima de zero e abaixo de 5%, C zero ou negativa. A nota final combina as três: A quando o endividamento está em A e, entre poupança e liquidez, no máximo uma está em B e nenhuma em C; B quando poupança e liquidez não estão em C e a combinação não chega a A; D quando os três estão em C; e C nas demais combinações. Base: Portaria Normativa MF nº 1.583/2023, alterada pela Portaria MF nº 1.764/2024. Os conceitos das variáveis são definidos pela STN (Portaria STN/MF nº 857/2026).</p>
            <p><strong className="text-ink">Documento oficial.</strong> O que vale como publicação é o relatório divulgado pela SEFAZ: {rgf ? ext(rgf.url, rgf.titulo) : 'RGF'} e as demais edições no <Link href="/tesouro/rgf" className="font-semibold text-navy underline underline-offset-4">acervo do RGF</Link>. A CAPAG é calculada pelo Tesouro Nacional e não vincula a posição dele na concessão de garantias.</p>
            <p className="flex flex-wrap gap-x-8 gap-y-2">
              <a href="/dados/limites-lrf-es.csv" download className="font-semibold text-navy underline underline-offset-4">Limites da LRF por quadrimestre (CSV)</a>
              <a href="/dados/capag-es.csv" download className="font-semibold text-navy underline underline-offset-4">CAPAG por edição (CSV)</a>
              <a href="/dados/rreo-es.csv" download className="font-semibold text-navy underline underline-offset-4">Orçamento, funções e previdência por exercício (CSV)</a>
              <a href="/dados/caixa-es.csv" download className="font-semibold text-navy underline underline-offset-4">Caixa dos recursos livres em dezembro (CSV)</a>
              <a href="/dados/arrecadacao-es.csv" download className="font-semibold text-navy underline underline-offset-4">ICMS, FPE e royalties por mês (CSV)</a>
            </p>
          </div>
        </div>
      </details>
    </div>
    </>
  )
}
