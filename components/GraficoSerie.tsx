import { numero } from '@/lib/indicadores'

type Ponto = { rotulo: string; ano: number; quad: number; valor: number | null }
type Linha = { valor: number | null; rotulo: string; estilo: 'limite' | 'alerta' | 'prudencial' }

/**
 * Gráfico de linha estático (SVG, sem JavaScript). Tem descrição em texto e tabela de dados equivalente.
 * Linhas de referência fora da escala dos dados não são desenhadas; seu valor vai na legenda.
 */
export function GraficoSerie({ id, titulo, subtitulo, pontos, linhas, unidade = '%', anotacao, reiniciaPorAno = false }: { id: string; titulo: string; subtitulo?: string; pontos: Ponto[]; linhas: Linha[]; unidade?: string; anotacao?: { ano: number; quad: number; texto: string }; reiniciaPorAno?: boolean }) {
  const W = 680, H = 250, ml = 46, mr = 12, mt = 14, mb = 34
  const valores = pontos.map((p) => p.valor).filter((v): v is number => v !== null)
  const vmin = Math.min(...valores), vmax = Math.max(...valores)
  // inclui a linha de referência na escala só se ela não esmagar os dados
  const visiveis = linhas.filter((l) => l.valor !== null && l.valor <= vmax * 2 + 5)
  const topo = Math.max(vmax, ...visiveis.map((l) => l.valor as number))
  const base = Math.min(vmin, 0)
  const folga = (topo - base) * 0.08
  const y0 = base - (vmin < 0 ? folga : 0), y1 = topo + folga
  const X = (i: number) => ml + (i * (W - ml - mr)) / Math.max(1, pontos.length - 1)
  const Y = (v: number) => mt + (1 - (v - y0) / (y1 - y0)) * (H - mt - mb)
  const comeca = (i: number) => i === 0 || pontos[i - 1].valor === null || (reiniciaPorAno && pontos[i - 1].ano !== pontos[i].ano)
  const caminho = pontos.map((p, i) => (p.valor === null ? '' : `${comeca(i) ? 'M' : 'L'}${X(i).toFixed(1)},${Y(p.valor).toFixed(1)}`)).join(' ')

  const passo = (() => { const bruto = (y1 - y0) / 4; const pot = Math.pow(10, Math.floor(Math.log10(bruto))); const f = bruto / pot; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pot })()
  const ticks: number[] = []
  for (let t = Math.ceil(y0 / passo) * passo; t <= y1; t += passo) ticks.push(Math.round(t * 1000) / 1000)
  const anos = pontos.map((p, i) => ({ p, i })).filter(({ p }) => p.quad === 1 || p.quad === pontos[0].quad && p.ano === pontos[0].ano)
  const ult = pontos[pontos.length - 1]
  const idxAnot = anotacao ? pontos.findIndex((p) => p.ano === anotacao.ano && p.quad === anotacao.quad) : -1
  const fora = linhas.filter((l) => l.valor !== null && !visiveis.includes(l))

  const resumo = `${titulo}. De ${pontos[0].rotulo} a ${ult.rotulo}, o valor passou de ${numero(pontos[0].valor)}${unidade} para ${numero(ult.valor)}${unidade}; mínimo ${numero(vmin)}${unidade} e máximo ${numero(vmax)}${unidade}.`

  return (
    <figure>
      {subtitulo && <p className="mb-2 text-small text-ink-soft">{subtitulo}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} className="h-auto w-full">
        <title id={`${id}-t`}>{resumo}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={ml} x2={W - mr} y1={Y(t)} y2={Y(t)} className="stroke-line" strokeWidth={1} />
            <text x={ml - 8} y={Y(t) + 4} textAnchor="end" className="fill-ink-soft" style={{ fontSize: 12 }}>{numero(t, passo < 1 ? 1 : 0)}</text>
          </g>
        ))}
        {visiveis.map((l) => (
          <g key={l.rotulo}>
            <line x1={ml} x2={W - mr} y1={Y(l.valor as number)} y2={Y(l.valor as number)} className="stroke-ink-soft" strokeWidth={1.25} strokeDasharray={l.estilo === 'limite' ? '6 4' : '2 3'} />
            {l.estilo === 'limite' && <text x={W - mr} y={Y(l.valor as number) - 5} textAnchor="end" className="fill-ink-soft" style={{ fontSize: 12 }}>{l.rotulo} {numero(l.valor)}{unidade}</text>}
          </g>
        ))}
        <path d={caminho} fill="none" className="stroke-navy" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {idxAnot >= 0 && pontos[idxAnot].valor !== null && (
          <g>
            <line x1={X(idxAnot)} x2={X(idxAnot)} y1={mt} y2={H - mb} className="stroke-ink-soft" strokeWidth={1} strokeDasharray="3 3" />
            <text x={X(idxAnot) - 6} y={mt + 12} textAnchor="end" className="fill-ink" style={{ fontSize: 12 }}>{anotacao?.texto}</text>
          </g>
        )}
        {reiniciaPorAno && pontos.map((p, i) => p.valor !== null && <circle key={p.rotulo} cx={X(i)} cy={Y(p.valor)} r={3} className="fill-navy" />)}
        <circle cx={X(pontos.length - 1)} cy={Y(ult.valor as number)} r={4.5} className="fill-navy stroke-paper" strokeWidth={2} />
        {anos.map(({ p, i }) => (
          <text key={p.rotulo} x={X(i)} y={H - 12} textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 12 }}>{p.ano}</text>
        ))}
      </svg>
      {linhas.some((l) => l.valor !== null) && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-soft" aria-label="Linhas de referência">
          {linhas.filter((l) => l.valor !== null).map((l) => (
            <li key={l.rotulo} className="inline-flex items-center gap-2">
              <svg width="28" height="8" aria-hidden="true"><line x1="0" x2="28" y1="4" y2="4" className="stroke-ink-soft" strokeWidth="1.5" strokeDasharray={l.estilo === 'limite' ? '6 4' : l.estilo === 'prudencial' ? '4 3' : '2 3'} /></svg>
              {l.rotulo} {numero(l.valor)}{unidade}{fora.includes(l) ? ' (fora da escala)' : ''}
            </li>
          ))}
        </ul>
      )}
      <details className="mt-3 text-small">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-navy underline underline-offset-4">Ver os dados em tabela</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-brand border border-line" role="region" aria-label={`Dados de ${titulo}`} tabIndex={0}>
          <table className="w-full text-left text-small">
            <caption className="sr-only">{titulo}</caption>
            <thead className="sticky top-0 bg-surface"><tr><th scope="col" className="px-3 py-2">Período</th><th scope="col" className="px-3 py-2 text-right">Valor ({unidade})</th></tr></thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.rotulo} className="border-t border-line"><th scope="row" className="px-3 py-1.5 font-normal">{p.quad}º quadrimestre de {p.ano}</th><td className="px-3 py-1.5 text-right tabular-nums">{numero(p.valor, 2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
