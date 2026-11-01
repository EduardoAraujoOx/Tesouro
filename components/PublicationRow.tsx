import { IconArrow, IconCalendar, IconPdf } from './Icons'

type Props = {
  titulo: string
  descricao?: string
  atualizadoEm?: string // já formatado
  tamanho?: string | null
  formato?: string
  href: string
  acao: string // "Baixar PDF" | "Acessar"
  externo?: boolean
}

export function PublicationRow({ titulo, descricao, atualizadoEm, tamanho, formato, href, acao, externo = true }: Props) {
  const extra = externo ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <li className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 border-b border-line py-4 sm:grid-cols-[auto_1fr_auto] sm:gap-x-5">
      <IconPdf className="row-span-2 h-8 w-7 text-navy sm:row-span-1" />
      <div className="min-w-0 sm:border-l sm:border-line sm:pl-5">
        <p className="break-words font-sans text-body font-semibold text-ink [overflow-wrap:anywhere]">{titulo}</p>
        {descricao && <p className="mt-0.5 break-words text-body text-ink-soft [overflow-wrap:anywhere]">{descricao}</p>}
        {(atualizadoEm || tamanho) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-small text-ink-soft">
            {atualizadoEm && (
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar className="h-4 w-4" /> Atualizado em {atualizadoEm}
              </span>
            )}
            {(tamanho || formato) && <span>{[formato && formato !== 'link' ? formato.toUpperCase() : null, tamanho].filter(Boolean).join(' · ')}</span>}
          </p>
        )}
      </div>
      <a
        href={href}
        {...extra}
        aria-label={`${acao}: ${titulo}${externo ? ' (abre em nova aba)' : ''}`}
        className="col-start-2 inline-flex min-h-11 items-center gap-2 justify-self-start text-body font-semibold text-ink underline-offset-4 hover:underline sm:col-start-3 sm:justify-self-end sm:border-l sm:border-line sm:pl-5"
      >
        {acao} <IconArrow className="h-[18px] w-[18px]" />
      </a>
    </li>
  )
}
