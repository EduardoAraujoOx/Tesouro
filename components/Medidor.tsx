import { INDICADORES_LRF, pct, rotuloPeriodo, situacao, type ChaveLrf, type PeriodoLrf } from '@/lib/indicadores'

/**
 * Medidor de um limite da LRF. A barra vai de 0 ao limite legal; as marcas indicam alerta e limite prudencial.
 * Não depende de cor: valor, limite e situação aparecem em texto e na descrição do gráfico.
 */
export function Medidor({ chave, periodo }: { chave: ChaveLrf; periodo: PeriodoLrf }) {
  const def = INDICADORES_LRF[chave]
  const d = periodo[chave]
  const s = situacao(d)
  const limite = d.limite ?? 0
  const preenchido = d.valor !== null && limite ? Math.max(0, Math.min(100, (d.valor / limite) * 100)) : 0
  const marca = (x: number | null | undefined) => (x != null && limite ? Math.min(100, (x / limite) * 100) : null)
  const mAlerta = marca(d.alerta)
  const mPrud = marca(d.prudencial)
  const descricao = `${def.curto}: ${pct(d.valor)} da receita corrente líquida, ${s.texto.toLowerCase()}. Limite de ${pct(d.limite, 0)}${d.alerta != null ? `, alerta em ${pct(d.alerta)}` : ''}${d.prudencial != null ? `, prudencial em ${pct(d.prudencial)}` : ''}.`
  const idTitulo = `med-${chave}`

  return (
    <div role="group" aria-labelledby={idTitulo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 id={idTitulo} className="!font-sans text-body font-semibold !text-ink">{def.curto}</h4>
        <p className="text-small text-ink-soft">
          <strong className="text-title font-semibold text-ink">{pct(d.valor)}</strong> da RCL · limite {pct(d.limite, 0)}
        </p>
      </div>
      <div role="img" aria-label={descricao} className="relative mt-3 h-3 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-navy" style={{ width: `${preenchido}%`, minWidth: d.valor !== null && d.valor > 0 ? '0.5rem' : 0 }} />
        {mAlerta !== null && <span aria-hidden="true" className="absolute -inset-y-1 w-0.5 bg-ink-soft" style={{ left: `${mAlerta}%` }} />}
        {mPrud !== null && <span aria-hidden="true" className="absolute -inset-y-1 w-0.5 bg-ink-soft" style={{ left: `${mPrud}%` }} />}
      </div>
      <p className="mt-2 text-small text-ink-soft">
        {s.texto}
        {s.folga !== null && d.valor !== null && d.valor >= 0 && <> · folga de {pct(s.folga).replace('%', '')} p.p. até o limite</>}
        {def.escala && <> · {def.escala}</>}
        <span className="sr-only"> ({rotuloPeriodo(periodo)})</span>
      </p>
    </div>
  )
}
