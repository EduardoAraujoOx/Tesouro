import type { Metadata } from 'next'
import Link from 'next/link'
import { IconExternal } from '@/components/Icons'
import { LeitorRevistinhas } from '@/components/LeitorRevistinhas'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Em Busca do Tesouro',
  description: 'Programa de educação fiscal e financeira do Tesouro Nacional para crianças do ensino fundamental, com a Turma da Mônica: revistinhas, quiz e manual do educador.',
}

const ext = (href: string, texto: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-4">
    {texto} <IconExternal className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span>
  </a>
)

const outros = [
  { titulo: 'Quiz animado', texto: 'Dezessete perguntas sobre receita, despesa e cuidado com o dinheiro, que rendem uma carteirinha de superdetetive.', href: 'https://embuscadotesouro.tesouro.gov.br/quiz' },
  { titulo: 'Minicurso do Educador', texto: 'Vídeos e leituras para quem ensina, com certificado ao final dos módulos.', href: 'https://embuscadotesouro.tesouro.gov.br/minicurso' },
  { titulo: 'Manual do Educador em PDF', texto: 'Sugestões de atividades para usar as revistinhas em sala de aula e em casa (arquivo de 10 MB).', href: 'https://cdn.tesouro.gov.br/sistemas-internos/monica/pdf/Manual_do_educador_01_impressao_reduzido.pdf' },
  { titulo: 'Site do programa', texto: 'Todos os materiais, o fórum do educador e as novidades do projeto.', href: 'https://embuscadotesouro.tesouro.gov.br/' },
] as const

export default function EmBuscaDoTesouro() {
  return (
    <>
      <PageHeader titulo="Em Busca do Tesouro">
        Educação fiscal e financeira para crianças, com a Turma da Mônica.
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-8 md:px-8 md:py-10">
        <div className="max-w-3xl text-lead text-ink-soft">
          <p>
            O Em Busca do Tesouro é um programa do Tesouro Nacional para ensinar crianças do ensino fundamental a cuidar do próprio dinheiro e a entender como os governos cuidam do dinheiro de todos. Aprender a acompanhar as contas públicas começa cedo, e este é um bom ponto de partida para famílias e escolas.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="sr-only">Revistinhas e manual</h2>
          <LeitorRevistinhas />
        </div>

        <section aria-labelledby="mais" className="mt-14 border-t border-line pt-10">
          <h2 id="mais" className="text-section">Mais materiais do programa</h2>
          <span className="accent-bar" aria-hidden="true" />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {outros.map((o) => (
              <li key={o.titulo} className="rounded-brand border border-line p-5">
                <h3 className="!font-sans text-body font-semibold !text-ink">{ext(o.href, o.titulo)}</h3>
                <p className="mt-2 text-small text-ink-soft">{o.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 border-t border-line pt-6 text-small text-ink-soft">
          Realização: Tesouro Nacional, com o Instituto Mauricio de Sousa. Os personagens da Turma da Mônica e as revistinhas são © IMS-Brasil e pertencem aos seus titulares; este portal apenas exibe o material a partir do site oficial do programa, sem copiá-lo.{' '}
          <Link href="/cidadao" className="font-semibold text-navy underline underline-offset-4">Voltar ao Tesouro Cidadão</Link>
        </p>
      </div>
    </>
  )
}
