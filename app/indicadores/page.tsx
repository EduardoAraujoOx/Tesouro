import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ExploradorIndicadores } from '@/components/ExploradorIndicadores'
import { IconExternal } from '@/components/Icons'
import { formatarData, maisRecente } from '@/lib/acervo'
import {
  bilhoes, capagAtualizadaEm, catalogoIndicadores, classificacoesCapag, coletadoEm, degrauHaveres, fontes, periodoUltimoRreo, rotuloPeriodo, ultimoLrf, ultimoRreo,
} from '@/lib/indicadores'

export const metadata: Metadata = {
  title: 'Painel fiscal',
  description: 'Painel quantitativo com os indicadores fiscais oficiais do Espírito Santo: execução do orçamento, metas fiscais, limites da Lei de Responsabilidade Fiscal e nota da CAPAG, em séries históricas atualizadas automaticamente.',
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
  for (const id of ['receita', 'despesa', 'investimentos', 'primario', 'nominal']) {
    notas.push({ id, ano: 0, sub: 0, texto: `Valores correntes, sem correção pela inflação. ${parcial ? `O ponto marcado com asterisco (${ultimoRreo.ano}) reúne o ${periodoUltimoRreo} e por isso é parcial; a previsão, a dotação e a meta com que ele se compara são as do ano inteiro.` : ''}`.trim() })
  }
  if (parcial) notas.push({ id: 'rcl', ano: 0, sub: 0, texto: `O ponto marcado com asterisco (${ultimoRreo.ano}) soma os doze meses encerrados no ${periodoUltimoRreo.split(' (')[0]}. Valores correntes, sem correção pela inflação.` })
  for (const id of ['primario', 'nominal']) {
    notas.push({ id, ano: 0, sub: 0, texto: 'Até 2022 o demonstrativo trazia um único resultado. A partir de 2023 ele separa o regime próprio de previdência (RPPS), e o painel mostra o resultado sem o RPPS, que é o comparado com a meta da LDO. Ao comparar anos dos dois períodos, considere essa mudança.' })
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
        <p className="mt-1 hidden max-w-2xl text-body text-on-navy md:block">Acompanhe a execução do orçamento, as metas fiscais, os limites da Lei de Responsabilidade Fiscal (LRF) e a capacidade de pagamento do Estado, com dados oficiais atualizados automaticamente.</p>
      </div>
    </section>
    <div className="mx-auto max-w-page px-5 py-5 md:px-8 md:py-6">
      <ExploradorIndicadores indicadores={indicadores} notas={notas} classificacoes={classificacoesCapag} geradoEm={coletadoEm} />

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
            <p><strong className="text-ink">Orçamento e metas.</strong> A execução do orçamento, a receita corrente líquida e os resultados primário e nominal vêm do Relatório Resumido da Execução Orçamentária (RREO) do Poder Executivo, nos Anexos 01, 03 e 06, também lidos na API do Siconfi. Os valores do RREO acumulam no ano: cada barra mostra o último bimestre disponível do exercício, e o ano em curso aparece marcado com asterisco por ser parcial. As metas vêm do Anexo de Metas Fiscais da LDO, reproduzidas no próprio RREO. Último período: {periodoUltimoRreo}.</p>
            <p><strong className="text-ink">Atualização automática.</strong> Uma rotina semanal consulta as fontes oficiais e, havendo dado novo, abre uma proposta de atualização que, depois de verificada, publica os números sem digitação. O RGF é entregue a cada quadrimestre e a CAPAG, uma vez por ano. Último período do RGF: {rotuloPeriodo(ultimoLrf)}{ultimoLrf.entregaEm && <>, entregue em {formatarData(ultimoLrf.entregaEm)}</>}.</p>
            <p><strong className="text-ink">Limites antes de 2024.</strong> Nos relatórios anteriores a 2024, o limite da dívida (200%) e o das garantias (22%) não constam em reais; o painel usa o valor fixado pelo Senado Federal, o mesmo dos relatórios recentes.</p>
            <p><strong className="text-ink">Como a CAPAG classifica.</strong> Cada um dos três indicadores recebe uma nota parcial. Endividamento: A abaixo de 60%, B de 60% a menos de 100%, C a partir de 100%. Poupança corrente: A abaixo de 85%, B de 85% a menos de 95%, C a partir de 95%. Liquidez relativa: A a partir de 5%, B acima de zero e abaixo de 5%, C zero ou negativa. A nota final combina as três: A quando o endividamento está em A e, entre poupança e liquidez, no máximo uma está em B e nenhuma em C; B quando poupança e liquidez não estão em C e a combinação não chega a A; D quando os três estão em C; e C nas demais combinações. Base: Portaria Normativa MF nº 1.583/2023, alterada pela Portaria MF nº 1.764/2024. Os conceitos das variáveis são definidos pela STN (Portaria STN/MF nº 857/2026).</p>
            <p><strong className="text-ink">Documento oficial.</strong> O que vale como publicação é o relatório divulgado pela SEFAZ: {rgf ? ext(rgf.url, rgf.titulo) : 'RGF'} e as demais edições no <Link href="/tesouro/rgf" className="font-semibold text-navy underline underline-offset-4">acervo do RGF</Link>. A CAPAG é calculada pelo Tesouro Nacional e não vincula a posição dele na concessão de garantias.</p>
            <p className="flex flex-wrap gap-x-8 gap-y-2">
              <a href="/dados/limites-lrf-es.csv" download className="font-semibold text-navy underline underline-offset-4">Limites da LRF por quadrimestre (CSV)</a>
              <a href="/dados/capag-es.csv" download className="font-semibold text-navy underline underline-offset-4">CAPAG por edição (CSV)</a>
              <a href="/dados/rreo-es.csv" download className="font-semibold text-navy underline underline-offset-4">Orçamento e resultados por exercício (CSV)</a>
            </p>
          </div>
        </div>
      </details>
    </div>
    </>
  )
}
