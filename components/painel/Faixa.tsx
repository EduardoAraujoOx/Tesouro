import { NOTA_DISCRETA } from './Estrutura'

const COLUNAS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }

/** Totais do recorte numa faixa só: rótulo pequeno, valor em destaque e complemento, separados por filetes (sem cartões). */
export function Faixa({ itens, nota }: { itens: { r: string; v: string; s?: string; destaque?: boolean }[]; nota?: string }) {
  return (
    <div className="mt-3">
      <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-line bg-line [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1 ${COLUNAS[itens.length] ?? 'md:grid-cols-4'}`}>
        {itens.map((k) => (
          <div key={k.r} className="bg-paper px-3 py-2.5 md:px-4 md:py-3">
            <dt className="text-label normal-case leading-snug tracking-normal text-ink-soft">{k.r}</dt>
            <dd className={`mt-0.5 text-lead font-semibold tabular-nums leading-tight md:text-title ${k.destaque ? 'text-navy' : 'text-ink'}`}>{k.v}</dd>
            {k.s && <dd className="mt-0.5 text-label normal-case leading-snug tracking-normal text-ink-soft">{k.s}</dd>}
          </div>
        ))}
      </dl>
      {nota && <p className={`mt-1.5 ${NOTA_DISCRETA}`}>{nota}</p>}
    </div>
  )
}
