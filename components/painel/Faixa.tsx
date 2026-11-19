/** Faixa de uma linha com os totais do recorte: rótulo e valor, sem cartões. */
export function Faixa({ itens, nota }: { itens: { r: string; v: string; s?: string; destaque?: boolean }[]; nota?: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-1 rounded-brand border border-line bg-surface px-4 py-2 text-small tabular-nums">
      <dl className="contents">
        {itens.map((k) => (
          <div key={k.r} className="flex items-baseline gap-2">
            <dt className="text-ink-soft">{k.r}</dt>
            <dd className={`font-semibold ${k.destaque ? 'text-navy' : 'text-ink'}`}>{k.v}{k.s && <span className="ml-1.5 font-normal text-ink-soft">{k.s}</span>}</dd>
          </div>
        ))}
      </dl>
      {nota && <p className="text-ink-soft">{nota}</p>}
    </div>
  )
}
