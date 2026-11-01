import type { Metadata } from 'next'
import Link from 'next/link'
import { IconArrow, IconExternal } from '@/components/Icons'
import { PageHeader } from '@/components/PageHeader'
import { pct, rotuloPeriodo, ultimaCapag, ultimoLrf } from '@/lib/indicadores'

export const metadata: Metadata = {
  title: 'Tesouro Cidadão',
  description: 'Como acompanhar a situação fiscal do Espírito Santo: os demonstrativos que o Tesouro Estadual publica, o que cada um mostra e como lê-los.',
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)
const interno = 'font-semibold text-navy underline underline-offset-4'

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <>
      <h2 id={id} className="text-section">{children}</h2>
      <span className="accent-bar" aria-hidden="true" />
    </>
  )
}

/** Demonstrativos publicados pelo Tesouro Estadual. A frequência segue a Lei de Responsabilidade Fiscal (RREO e RGF) e a rotina de publicação do portal. */
const demonstrativos = [
  { nome: 'RREO, Relatório Resumido da Execução Orçamentária', mostra: 'Quanto o Estado arrecadou e gastou no período, por tipo de receita e de despesa.', freq: 'Bimestral', ler: '/tesouro/rreo', cidada: ['RREO Cidadão', '/tesouro/rreo-cidadao'] },
  { nome: 'RGF, Relatório de Gestão Fiscal', mostra: 'Se o Estado cumpre os limites da Lei de Responsabilidade Fiscal para pessoal, dívida, garantias e operações de crédito.', freq: 'Quadrimestral', ler: '/tesouro/rgf', cidada: ['RGF Cidadão', '/tesouro/rgf-cidadao'] },
  { nome: 'Resultado do Tesouro Estadual', mostra: 'Desempenho fiscal do Estado: receitas, despesas e resultado primário.', freq: 'Quadrimestral', ler: '/tesouro/resultado-do-tesouro-estadual' },
  { nome: 'Resultado de Caixa do Tesouro', mostra: 'Entradas e saídas de caixa do Tesouro no período.', freq: 'Bimestral', ler: '/tesouro/resultado-de-caixa-do-tesouro-estadual' },
  { nome: 'Prestação de Contas do Governador', mostra: 'Balanço Geral do Estado e demais demonstrações contábeis do ano, que seguem para parecer prévio do Tribunal de Contas.', freq: 'Anual', ler: '/tesouro/prestacao-de-contas-do-governador', cidada: ['Balanço Cidadão', '/tesouro/balanco-cidadao'] },
  { nome: 'Relatório Anual da Dívida Pública e do PAF', mostra: 'Evolução e composição da dívida estadual e andamento do Programa de Ajuste Fiscal.', freq: 'Anual', ler: '/tesouro/relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal' },
  { nome: 'Transferências aos municípios', mostra: 'Quanto o Estado repassa a cada município das receitas que a Constituição divide entre eles.', freq: 'Mensal', ler: '/tesouro/transferencias-constitucionais-aos-municipios' },
] as const

const glossario = [
  ['Receita corrente líquida (RCL)', 'O quanto o Estado arrecada de forma regular, descontadas as partes que, por lei, pertencem a outros entes, como os municípios. É a régua usada para medir gastos e dívida.'],
  ['Lei de Responsabilidade Fiscal (LRF)', 'Lei complementar nº 101, de 2000, que fixa regras de equilíbrio para as contas de União, estados e municípios e obriga a publicar relatórios periódicos.'],
  ['CAPAG', 'Capacidade de Pagamento. Nota que o Tesouro Nacional atribui aos estados, a partir de endividamento, poupança corrente e liquidez.'],
  ['Dívida consolidada líquida (DCL)', 'Dívida de longo prazo menos o caixa e outros ativos financeiros. Quando é negativa, o Estado tem mais ativos financeiros do que dívida.'],
  ['Poupança corrente', 'Parcela da receita corrente que sobra depois de pagar as despesas correntes. É o que o Estado pode usar para investir sem se endividar.'],
  ['Resultado primário', 'Diferença entre as receitas e as despesas do Estado, sem contar os juros da dívida.'],
  ['Siconfi', 'Sistema do Tesouro Nacional em que estados e municípios entregam seus relatórios contábeis e fiscais. É a fonte dos números do painel fiscal deste portal.'],
] as const

const outrasFerramentas = [
  { titulo: 'Contas Públicas do Brasil', texto: 'Mapas e painéis com as finanças de estados e municípios, para comparar o Espírito Santo com os demais.', href: 'https://contaspublicasbrasil.tesourotransparente.gov.br/' },
  { titulo: 'Siconfi.IA', texto: 'Ferramenta do Tesouro Nacional que responde, em linguagem comum, perguntas sobre os relatórios fiscais.', href: 'https://www.gov.br/tesouronacional/pt-br/noticias/tesouro-lanca-siconfi-ia-para-facilitar-acesso-aos-dados-contabeis-e-fiscais-da-federacao' },
  { titulo: 'Tesouro Educacional', texto: 'Programa do Tesouro Nacional com cursos online, vídeos e material sobre finanças públicas.', href: 'https://www.gov.br/tesouronacional/pt-br/tesouro-educacional/tesouro-educacional-subhome' },
  { titulo: 'Glossário do Tesouro Nacional', texto: 'Definições oficiais de termos de finanças públicas.', href: 'https://www.tesourotransparente.gov.br/sobre/glossario-do-tesouro-nacional' },
] as const

export default function Cidadao() {
  const l = ultimoLrf
  const c = ultimaCapag
  const folga = l.pessoal.limite != null && l.pessoal.valor != null ? l.pessoal.limite - l.pessoal.valor : null

  return (
    <>
      <PageHeader titulo="Tesouro Cidadão">
        Como acompanhar a situação fiscal do Espírito Santo: os demonstrativos que o Tesouro Estadual publica e como lê-los.
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-12">
        {/* ---------- O que é transparência fiscal ---------- */}
        <section aria-labelledby="transparencia">
          <Titulo id="transparencia">Transparência fiscal</Titulo>
          <div className="mt-6 grid max-w-4xl gap-4 text-lead text-ink-soft">
            <p>Transparência fiscal é o dever do governo de prestar contas de quanto arrecada, quanto gasta e quanto deve, mantendo essas informações abertas e compreensíveis a qualquer pessoa.</p>
            <p>A Lei de Responsabilidade Fiscal estabelece quais relatórios os governos devem publicar e com que frequência. No Espírito Santo, o Tesouro Estadual publica esses demonstrativos e, para os principais, uma versão em linguagem cidadã.</p>
          </div>
        </section>

        {/* ---------- Demonstrativos ---------- */}
        <section aria-labelledby="demonstrativos" className="mt-16 border-t border-line pt-12">
          <Titulo id="demonstrativos">Os demonstrativos do Tesouro Estadual</Titulo>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {demonstrativos.map((d) => (
              <li key={d.nome} className="grid gap-x-8 gap-y-2 py-5 md:grid-cols-12 md:items-start">
                <div className="md:col-span-5">
                  <h3 className="!font-sans text-body font-semibold !text-ink">{d.nome}</h3>
                  <p className="mt-1 text-small font-semibold text-navy">{d.freq}</p>
                </div>
                <p className="text-body text-ink-soft md:col-span-4">{d.mostra}</p>
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-small md:col-span-3 md:justify-end">
                  <Link href={d.ler} className={interno}>Consultar</Link>
                  {'cidada' in d && <Link href={d.cidada[1]} className={interno}>{d.cidada[0]}</Link>}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-small text-ink-soft">
            Todos os documentos ficam reunidos em <Link href="/publicacoes" className={interno}>Publicações</Link>, com busca por tipo e por ano.
          </p>
        </section>

        {/* ---------- Roteiro ---------- */}
        <section aria-labelledby="roteiro" className="mt-16 border-t border-line pt-12">
          <Titulo id="roteiro">Como acompanhar a situação fiscal do Estado</Titulo>
          <ol className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            <li className="border-t-2 border-navy pt-4">
              <p className="text-small font-semibold text-navy">1. Comece pela nota</p>
              <h3 className="mt-1 text-title">CAPAG {c.classificacao}</h3>
              <p className="mt-2 text-body text-ink-soft">O Tesouro Nacional avalia a capacidade de pagamento dos estados a partir do endividamento ({pct(c.endividamento)}), da poupança corrente ({pct(c.poupanca)}) e da liquidez ({pct(c.liquidez)}). É a síntese mais rápida da saúde fiscal. Edição {c.ano}.</p>
              <p className="mt-3"><Link href="/indicadores?g=capag&i=endividamento,poupanca,liquidez" className={interno}>Ver a série da CAPAG</Link></p>
            </li>
            <li className="border-t-2 border-navy pt-4">
              <p className="text-small font-semibold text-navy">2. Confira os limites da lei</p>
              <h3 className="mt-1 text-title">Pessoal em {pct(l.pessoal.valor)} da receita</h3>
              <p className="mt-2 text-body text-ink-soft">No {rotuloPeriodo(l)}, a despesa com pessoal do Poder Executivo ficou {folga !== null ? `${folga.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos percentuais` : 'abaixo'} do teto de {pct(l.pessoal.limite, 0)}. A dívida consolidada líquida é de {pct(l.divida.valor)}, para um limite de {pct(l.divida.limite, 0)}.</p>
              <p className="mt-3"><Link href="/indicadores" className={interno}>Ver os limites da LRF</Link></p>
            </li>
            <li className="border-t-2 border-navy pt-4">
              <p className="text-small font-semibold text-navy">3. Veja o que entrou e o que saiu</p>
              <h3 className="mt-1 text-title">RREO e Resultado do Tesouro</h3>
              <p className="mt-2 text-body text-ink-soft">O RREO e o Resultado do Tesouro mostram a arrecadação e a despesa do período. Se preferir um texto mais simples, use o RREO Cidadão, que traz os mesmos dados em linguagem acessível.</p>
              <p className="mt-3"><Link href="/tesouro/rreo-cidadao" className={interno}>Abrir o RREO Cidadão</Link></p>
            </li>
            <li className="border-t-2 border-navy pt-4">
              <p className="text-small font-semibold text-navy">4. Compare no tempo e com outros estados</p>
              <h3 className="mt-1 text-title">Séries históricas e comparações</h3>
              <p className="mt-2 text-body text-ink-soft">Um número isolado diz pouco. O painel fiscal mostra como cada indicador evoluiu desde 2019, e o Tesouro Nacional permite comparar o Espírito Santo com os demais estados.</p>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1"><Link href="/indicadores" className={interno}>Explorar o painel fiscal</Link>{ext('https://contaspublicasbrasil.tesourotransparente.gov.br/', 'Contas Públicas do Brasil')}</p>
            </li>
          </ol>
        </section>

        {/* ---------- Educação fiscal ---------- */}
        <section aria-labelledby="educacao" className="mt-16 border-t border-line pt-12">
          <div className="grid gap-8 rounded-brand bg-surface p-6 md:grid-cols-12 md:items-center md:p-10">
            <div className="md:col-span-8">
              <h2 id="educacao" className="text-section">Educação fiscal: Em Busca do Tesouro</h2>
              <span className="accent-bar" aria-hidden="true" />
              <p className="mt-4 max-w-2xl text-lead text-ink-soft">
                Programa do Tesouro Nacional que ensina finanças pessoais e públicas a crianças do ensino fundamental, com a Turma da Mônica. Leia as revistinhas e o manual do educador aqui mesmo, sem sair do portal.
              </p>
            </div>
            <div className="md:col-span-4 md:justify-self-end">
              <Link href="/cidadao/em-busca-do-tesouro" className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-brand bg-navy px-6 text-body font-semibold text-on-navy transition hover:bg-navy-deep md:w-auto">
                Ler as revistinhas <IconArrow className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Perguntas ---------- */}
        <section aria-labelledby="perguntas" className="mt-16 border-t border-line pt-12">
          <Titulo id="perguntas">Perguntas frequentes</Titulo>
          <div className="mt-6 max-w-4xl divide-y divide-line border-y border-line">
            {[
              ['Qual a diferença entre o RREO e o RGF?', <p key="a">O RREO mostra a execução do orçamento: o que foi arrecadado e gasto a cada dois meses. O RGF verifica a gestão fiscal: a cada quatro meses, informa se o Estado respeita os limites da lei para despesa com pessoal, dívida, garantias e operações de crédito.</p>],
              ['Os números do portal são os oficiais?', <p key="b">Sim. Os limites da Lei de Responsabilidade Fiscal vêm do Relatório de Gestão Fiscal entregue ao Siconfi e a CAPAG vem do Tesouro Nacional. O portal não altera esses valores e informa a fonte de cada um. A explicação completa está na <Link href="/indicadores#metodo" className={interno}>metodologia do painel fiscal</Link>.</p>],
              ['Não achei a informação que procuro. O que faço?', <p key="c">Escreva pelo <Link href="/contato" className={interno}>Fale conosco</Link> e escolha a área do Tesouro que deve receber a mensagem. Pedidos formais de acesso à informação seguem pelo canal próprio da Lei de Acesso à Informação, no rodapé do portal.</p>],
            ].map(([q, r]) => (
              <details key={q as string} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-body font-semibold text-ink">
                  <span>{q}</span>
                  <span aria-hidden="true" className="shrink-0 text-ink-soft transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="pb-5 text-body text-ink-soft">{r}</div>
              </details>
            ))}
          </div>
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

        {/* ---------- Outras ferramentas ---------- */}
        <section aria-labelledby="alem" className="mt-16 border-t border-line pt-12">
          <Titulo id="alem">Outras ferramentas do Tesouro Nacional</Titulo>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {outrasFerramentas.map((a) => (
              <li key={a.titulo} className="rounded-brand border border-line p-5">
                <h3 className="!font-sans text-body font-semibold !text-ink">{ext(a.href, a.titulo)}</h3>
                <p className="mt-2 text-small text-ink-soft">{a.texto}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-small text-ink-soft">Endereços do Tesouro Nacional, fora deste portal. As descrições acima são nossas.</p>
        </section>
      </div>
    </>
  )
}
