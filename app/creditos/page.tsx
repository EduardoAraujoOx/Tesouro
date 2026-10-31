import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'
import { IconExternal } from '@/components/Icons'

export const metadata: Metadata = {
  title: 'Créditos das imagens',
  description: 'Autoria e licenças das fotografias e fontes tipográficas usadas no portal do Tesouro Estadual.',
}

const imagens = [
  {
    uso: 'Imagem principal da página inicial',
    titulo: 'Vista de Vitória com a Terceira Ponte',
    autor: 'Ilustração gerada por inteligência artificial, fornecida pela equipe do projeto',
    licenca: 'Uso autorizado pela equipe do projeto',
    licencaUrl: null,
    fonte: null,
    nota: 'Redimensionada.',
  },
  {
    uso: 'Faixa da página "Conheça o Tesouro"',
    titulo: 'Terceira Ponte, Vitória (ES), à noite',
    autor: 'Vitor Jubini / Ministério do Turismo',
    licenca: 'Domínio público',
    licencaUrl: null,
    fonte: 'https://commons.wikimedia.org/wiki/File:VitorJubini_TerceiraPonte_Vitoria_ES_(27121005458).jpg',
    nota: 'Recortada e redimensionada.',
  },
]

export default function Creditos() {
  return (
    <>
      <PageHeader titulo="Créditos das imagens">
        As fotografias obtidas no Wikimedia Commons têm licenças livres, e os arquivos adaptados para este site mantêm a
        licença original.
      </PageHeader>
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
        <ul className="border-t border-line">
          {imagens.map((i) => (
            <li key={i.titulo} className="border-b border-line py-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{i.uso}</p>
              <h2 className="mt-1 !font-sans text-xl font-semibold !text-ink">{i.titulo}</h2>
              <p className="mt-2 text-ink-soft">
                Autoria: <strong className="text-ink">{i.autor}</strong> · Licença:{' '}
                {i.licencaUrl ? (
                  <a href={i.licencaUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline underline-offset-4">{i.licenca}</a>
                ) : (
                  <strong className="text-ink">{i.licenca}</strong>
                )}{' '}
                · {i.nota}
              </p>
              {i.fonte && (
                <a href={i.fonte} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 font-medium text-navy underline underline-offset-4">
                  Arquivo original no Wikimedia Commons <IconExternal className="h-4 w-4" /><span className="sr-only">(abre em nova aba)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
        <h2 className="mt-10 text-2xl font-bold">Tipografia</h2>
        <span className="accent-bar" aria-hidden="true" />
        <p className="mt-4 text-ink-soft">
          Inter e Source Serif 4, distribuídas sob a licença SIL Open Font License 1.1 e servidas pelo próprio portal.
        </p>
      </div>
    </>
  )
}
