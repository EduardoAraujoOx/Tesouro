import type { Metadata } from 'next'
import Link from 'next/link'
import { IconArrow, IconExternal } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { PublicationRow } from '@/components/PublicationRow'
import { formatarData, maisRecente } from '@/lib/acervo'
import { pct, rotuloPeriodo, ultimaCapag, ultimoLrf } from '@/lib/indicadores'

export const metadata: Metadata = {
  title: 'Tesouro Cidadão',
  description: 'As contas públicas do Espírito Santo explicadas em linguagem simples: perguntas e respostas, balanço cidadão, glossário e ferramentas do Tesouro Nacional.',
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <>
      <h2 id={id} className="text-section">{children}</h2>
      <span className="accent-bar" aria-hidden="true" />
    </>
  )
}

const glossario = [
  ['Receita corrente líquida (RCL)', 'O quanto o Estado arrecada de forma regular, descontadas as partes que, por lei, pertencem a outros entes, como os municípios. É a régua usada para medir gastos e dívida.'],
  ['RREO', 'Relatório Resumido da Execução Orçamentária. Sai a cada dois meses e mostra o que o Estado arrecadou e gastou.'],
  ['RGF', 'Relatório de Gestão Fiscal. Sai a cada quatro meses e mostra se o Estado respeita os limites da lei para pessoal, dívida, garantias e empréstimos.'],
  ['Lei de Responsabilidade Fiscal (LRF)', 'A lei complementar nº 101, de 2000, que fixa regras de equilíbrio para as contas de União, estados e municípios.'],
  ['CAPAG', 'Capacidade de Pagamento. Nota que o Tesouro Nacional dá aos estados, a partir de endividamento, poupança corrente e liquidez.'],
  ['Dívida consolidada líquida (DCL)', 'A dívida de longo prazo menos o caixa e outros ativos financeiros. Quando é negativa, o Estado tem mais ativos financeiros do que dívida.'],
  ['Poupança corrente', 'A parte da receita corrente que sobra depois de pagar as despesas correntes. É o que o Estado pode usar para investir sem se endividar.'],
  ['Siconfi', 'Sistema do Tesouro Nacional em que estados e municípios entregam seus relatórios contábeis e fiscais. É a fonte dos números do painel fiscal deste portal.'],
] as const

const alemDoPortal = [
  { titulo: 'Em Busca do Tesouro', texto: 'Gibis da Turma da Mônica sobre educação fiscal e financeira, do Tesouro Nacional, para crianças e famílias.', href: 'https://www.gov.br/tesouronacional/pt-br/tesouro-educacional/em-busca-do-tesouro' },
  { titulo: 'Tesouro Educacional', texto: 'Programa do Tesouro Nacional com cursos online, vídeos e material sobre finanças públicas.', href: 'https://www.gov.br/tesouronacional/pt-br/tesouro-educacional/tesouro-educacional-subhome' },
  { titulo: 'Contas Públicas do Brasil', texto: 'Mapas e painéis com as finanças de estados e municípios, para comparar o Espírito Santo com os demais.', href: 'https://contaspublicasbrasil.tesourotransparente.gov.br/' },
  { titulo: 'Siconfi.IA', texto: 'Ferramenta do Tesouro Nacional que responde, em linguagem comum, perguntas sobre os relatórios fiscais.', href: 'https://www.gov.br/tesouronacional/pt-br/noticias/tesouro-lanca-siconfi-ia-para-facilitar-acesso-aos-dados-contabeis-e-fiscais-da-federacao' },
  { titulo: 'Glossário do Tesouro Nacional', texto: 'Definições oficiais de termos de finanças públicas.', href: 'https://www.tesourotransparente.gov.br/sobre/glossario-do-tesouro-nacional' },
] as const

export default function Cidadao() {
  const l = ultimoLrf
  const c = ultimaCapag
  const folgaPessoal = l.pessoal.limite != null && l.pessoal.valor != null ? l.pessoal.limite - l.pessoal.valor : null
  const notasIguais = c.notaEndividamento === c.notaPoupanca && c.notaPoupanca === c.notaLiquidez
  const balanco = maisRecente({ pagina: 'balanco-cidadao' })
  const rreo = maisRecente({ pagina: 'rreo-cidadao' })
  const rgf = maisRecente({ pagina: 'rgf-cidadao' })

  const perguntas: { p: string; r: React.ReactNode }[] = [
    {
      p: 'Quanto da arrecadação do Estado vai para a folha de pagamento?',
      r: (
        <>
          <p>No {rotuloPeriodo(l)}, a despesa com pessoal do Poder Executivo foi de <strong>{pct(l.pessoal.valor)}</strong> da receita corrente líquida. A Lei de Responsabilidade Fiscal fixa o teto em {pct(l.pessoal.limite, 0)} para esse poder. Sobram, portanto, {folgaPessoal !== null ? `${folgaPessoal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos percentuais` : 'alguns pontos percentuais'} até o limite.</p>
          <p className="mt-3"><Link href="/indicadores?g=lrf&i=pessoal" className="font-semibold text-navy underline underline-offset-4">Ver a série histórica</Link></p>
        </>
      ),
    },
    {
      p: 'O Estado está endividado?',
      r: (
        <>
          <p>Há duas formas de olhar. A dívida consolidada, sem descontar nada, equivale a {pct(l.divida.dc)} da receita corrente líquida. A dívida consolidada líquida, que desconta da dívida o dinheiro em caixa e outros ativos financeiros, é de <strong>{pct(l.divida.valor)}</strong>. Por ser negativa, significa que o Estado tem mais ativos financeiros do que dívida. O limite fixado pelo Senado Federal é de {pct(l.divida.limite, 0)}.</p>
          <p className="mt-3"><Link href="/indicadores?g=lrf&i=divida" className="font-semibold text-navy underline underline-offset-4">Ver a série histórica</Link></p>
        </>
      ),
    },
    {
      p: `O que significa a nota ${c.classificacao} da CAPAG?`,
      r: (
        <>
          <p>A CAPAG é a nota que o Tesouro Nacional dá à capacidade de pagamento de cada estado. Na edição {c.ano}, o Espírito Santo recebeu <strong>{c.classificacao}</strong>. Ela combina três medidas: endividamento ({pct(c.endividamento)}), poupança corrente ({pct(c.poupanca)}) e liquidez ({pct(c.liquidez)}). {notasIguais ? `Nos três, o Estado teve nota ${c.notaEndividamento}.` : `As notas foram ${c.notaEndividamento}, ${c.notaPoupanca} e ${c.notaLiquidez}, nessa ordem.`} O sinal de mais indica também a qualidade das informações contábeis e fiscais que o Estado envia ao Tesouro Nacional.</p>
          <p className="mt-3"><Link href="/indicadores?g=capag&i=endividamento,poupanca,liquidez" className="font-semibold text-navy underline underline-offset-4">Ver a série histórica</Link></p>
        </>
      ),
    },
    {
      p: 'Onde posso ver o que o Governo fez com o dinheiro público?',
      r: (
        <p>No Balanço Cidadão, que a Secretaria da Fazenda publica todo ano com linguagem acessível e fotos das entregas por área. Abaixo, nesta página, estão o de 2025 e os relatórios cidadãos mais recentes.</p>
      ),
    },
    {
      p: 'Os números do portal são os oficiais?',
      r: (
        <p>Sim. Os limites da Lei de Responsabilidade Fiscal vêm do Relatório de Gestão Fiscal entregue ao Siconfi, e a CAPAG vem do Tesouro Nacional. O portal não altera esses valores e informa a fonte de cada um. A explicação completa está na <Link href="/indicadores#metodo" className="font-semibold text-navy underline underline-offset-4">metodologia do painel fiscal</Link>.</p>
      ),
    },
    {
      p: 'Quero tirar uma dúvida com alguém do Tesouro. Como faço?',
      r: (
        <p>Escreva pelo <Link href="/contato" className="font-semibold text-navy underline underline-offset-4">Fale conosco</Link>: você escolhe a área que deve receber a mensagem. Se não souber qual é, envie para a Subsecretaria, que encaminha ao lugar certo.</p>
      ),
    },
  ]

  return (
    <>
      <PageHeader titulo="Tesouro Cidadão">
        As contas públicas do Espírito Santo explicadas em linguagem simples.
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
        {/* ---------- 2025 em números ---------- */}
        <section aria-labelledby="numeros">
          <Titulo id="numeros">O Estado em 2025, em poucos números</Titulo>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['R$ 5,1 bi', 'investidos com recursos próprios em 2025, o maior volume da história do Estado'],
              ['R$ 22,8 bi', 'investidos entre 2019 e 2025'],
              ['A+', 'nota do Tesouro Nacional pelo segundo ano seguido, com a qualidade da informação contábil e fiscal'],
              ['14 anos', 'seguidos com nota A na Capacidade de Pagamento (CAPAG)'],
            ].map(([n, t]) => (
              <li key={n} className="rounded-brand border border-line p-5">
                <p className="font-serif text-headline font-semibold text-navy">{n}</p>
                <p className="mt-2 text-body text-ink-soft">{t}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-small text-ink-soft">
            Fonte: apresentação do Balanço Cidadão 2025, da Secretaria da Fazenda{balanco && <>. {ext(balanco.url, 'Abrir o Balanço Cidadão 2025')}</>}
          </p>
        </section>

        {/* ---------- Perguntas e respostas ---------- */}
        <section aria-labelledby="perguntas" className="mt-16 border-t border-line pt-12">
          <Titulo id="perguntas">Perguntas que as pessoas fazem</Titulo>
          <p className="mt-3 max-w-3xl text-body text-ink-soft">As respostas usam os números mais recentes do painel fiscal e se atualizam sozinhas.</p>
          <div className="mt-6 max-w-4xl divide-y divide-line border-y border-line">
            {perguntas.map((q) => (
              <details key={q.p} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-body font-semibold text-ink">
                  <span>{q.p}</span>
                  <span aria-hidden="true" className="shrink-0 text-ink-soft transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="pb-5 text-body text-ink-soft [&_strong]:text-ink">{q.r}</div>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- Documentos cidadãos ---------- */}
        <section aria-labelledby="documentos" className="mt-16 border-t border-line pt-12">
          <Titulo id="documentos">Leia os documentos em linguagem cidadã</Titulo>
          <ul className="mt-4 max-w-4xl border-t border-line">
            {balanco && <PublicationRow titulo={balanco.titulo} descricao="Como o Estado administrou os recursos públicos no ano, com as entregas por área." atualizadoEm={formatarData(balanco.atualizadoEm)} tamanho={balanco.tamanho} formato={balanco.formato} href={balanco.url} acao="Baixar PDF" />}
            {rreo && <PublicationRow titulo={rreo.titulo} descricao="O que o Estado arrecadou e gastou no período, sem jargão." atualizadoEm={formatarData(rreo.atualizadoEm)} tamanho={rreo.tamanho} formato={rreo.formato} href={rreo.url} acao="Baixar PDF" />}
            {rgf && <PublicationRow titulo={rgf.titulo} descricao="Se o Estado cumpre os limites da lei para pessoal, dívida e crédito." atualizadoEm={formatarData(rgf.atualizadoEm)} tamanho={rgf.tamanho} formato={rgf.formato} href={rgf.url} acao="Baixar PDF" />}
          </ul>
          <p className="mt-4"><Link href="/publicacoes?tipo=cidadao" className="inline-flex min-h-11 items-center gap-2 text-body font-semibold text-navy underline underline-offset-4">Ver todas as edições <IconArrow className="h-[18px] w-[18px]" /></Link></p>
        </section>

        {/* ---------- Glossário ---------- */}
        <section aria-labelledby="glossario" className="mt-16 border-t border-line pt-12">
          <Titulo id="glossario">Glossário</Titulo>
          <dl className="mt-6 grid max-w-5xl gap-x-12 gap-y-6 md:grid-cols-2">
            {glossario.map(([t, d]) => (
              <div key={t}>
                <dt className="text-body font-semibold text-ink">{t}</dt>
                <dd className="mt-1 text-body text-ink-soft">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- Para ir além ---------- */}
        <section aria-labelledby="alem" className="mt-16 border-t border-line pt-12">
          <Titulo id="alem">Para ir além, no Tesouro Nacional</Titulo>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alemDoPortal.map((a) => (
              <li key={a.titulo} className="rounded-brand border border-line p-5">
                <h3 className="!font-sans text-body font-semibold !text-ink">{ext(a.href, a.titulo)}</h3>
                <p className="mt-2 text-small text-ink-soft">{a.texto}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-small text-ink-soft">São endereços do Tesouro Nacional, fora deste portal. Os textos acima são descrições nossas.</p>
        </section>
      </div>
    </>
  )
}
