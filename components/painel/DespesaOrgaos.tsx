'use client'

import { useMemo, useState } from 'react'
import { milhoes, numero } from '@/lib/formato'
import { Cartao, TabelaItens } from './Graficos'
import { NOTA_DISCRETA } from './Estrutura'
import { fmtPct } from './GraficosMacro'
import { ipcaAnual, projecaoPorOrgao, projetaDespesa2026 } from './projecao'

/** Órgão da PLOA 2027 (código de dois dígitos da unidade orçamentária): despesa executável (GND 1 a 6) e reservas, em reais */
export type OrgaoPloa = { cod: string; nome: string; exec: number; reserva: number; /** despesa executável por grupo de natureza (GND 1 a 6) */ porGnd: Record<string, number> }

type Linha = { chave: string; rotulo: string; v25: number | null; p26: number | null; ploa: number; negrito?: boolean; pai?: string }
const GRUPOS: [string, string][] = [['1', 'Pessoal e encargos sociais'], ['2', 'Juros e encargos da dívida'], ['3', 'Outras despesas correntes'], ['4', 'Investimentos'], ['5', 'Inversões financeiras'], ['6', 'Amortização da dívida']]

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mi = (x: number) => milhoes(x === 0 ? 0 : x, 0)
const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const dMi = (x: number) => (Math.abs(x) < 0.5e6 ? '0' : `${sinal(x)}${milhoes(Math.abs(x), 0)}`)
/** variação (em %) a partir da qual a PLOA é dita acima ou abaixo da projeção de 2026 */
const DIF_MIN = 3
const corDif = (d: number) => (Math.abs(d) < DIF_MIN ? '' : d > 0 ? 'text-serie3' : 'text-serie2')
/** nome curto: as secretarias aparecem só pela área ("Saúde" em vez de "Secretaria de Estado da Saúde") */
const curto = (n: string) => n.replace(/^Secretaria (?:de Estado|Estadual) (?:da|das|de|do|dos)\s+/i, '').replace(/ do Estado do Espírito Santo$/i, ' do Estado')

/**
 * Despesa de 2027 por órgão contra o fechamento projetado de 2026, do maior para o menor valor da PLOA. Os órgãos somam a despesa executável da
 * Visão geral (sem as reservas, que aparecem numa linha à parte).
 */
export function DespesaOrgaos({ orgaos, ipca: ipcaParams }: { orgaos: OrgaoPloa[]; ipca: Record<string, number> }) {
  const i27 = useMemo(() => ipcaAnual(Object.fromEntries(Object.entries(ipcaParams).map(([a, v]) => [a, v])))[2027], [ipcaParams])
  const proj = useMemo(() => projecaoPorOrgao(), [])
  /* mesmo corte da projeção: último mês fechado do coletor */
  const mesCorte = useMemo(() => MESES[projetaDespesa2026().mesCorte - 1], [])
  const linhas = useMemo(() => {
    const norm = (c: string) => String(Number(c))
    const porCod = new Map(orgaos.map((o) => [norm(o.cod), o]))
    const cods = new Set([...porCod.keys(), ...Object.keys(proj)])
    const orgs: Linha[] = [...cods].map((c) => {
      const o = porCod.get(c)
      return { chave: c, rotulo: o ? curto(o.nome) : `Órgão ${c}`, v25: proj[c]?.e25 ?? 0, p26: proj[c]?.p26 ?? 0, ploa: o?.exec ?? 0 }
    }).sort((a, b) => b.ploa - a.ploa)
    /* grupos de natureza sob cada órgão: abertos ao clicar no órgão; a projeção já é feita por órgão e grupo, de modo que somam o órgão */
    const comGrupos = orgs.flatMap((l): Linha[] => [
      l,
      ...GRUPOS.map(([g, nome]): Linha => ({ chave: `${l.chave}-${g}`, rotulo: nome, pai: l.chave, v25: proj[l.chave]?.porGnd[g]?.e25 ?? 0, p26: proj[l.chave]?.porGnd[g]?.p26 ?? 0, ploa: porCod.get(l.chave)?.porGnd[g] ?? 0 }))
        .filter((f) => Math.abs(f.v25 ?? 0) + Math.abs(f.p26 ?? 0) + Math.abs(f.ploa) >= 0.5e6),
    ])
    const soma = (f: (l: Linha) => number | null) => orgs.reduce((t, l) => t + (f(l) ?? 0), 0)
    const reservas = orgaos.reduce((t, o) => t + o.reserva, 0)
    return [
      ...comGrupos,
      { chave: 'exec', rotulo: 'Despesa executável (sem reservas)', v25: soma((l) => l.v25), p26: soma((l) => l.p26), ploa: soma((l) => l.ploa), negrito: true },
      { chave: 'res', rotulo: 'Reservas (RPPS e contingência)', v25: null, p26: null, ploa: reservas },
    ] as Linha[]
  }, [orgaos, proj])

  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const alterna = (c: string) => setAbertos((a) => { const n = new Set(a); if (n.has(c)) n.delete(c); else n.add(c); return n })
  const visiveis = linhas.filter((l) => !l.pai || abertos.has(l.pai))
  const varNominal = (l: Linha) => (l.p26 === null || Math.abs(l.p26) < 1e6 ? null : (l.ploa / l.p26 - 1) * 100)
  const varReal = (l: Linha) => { const n = varNominal(l); return n === null ? null : ((1 + n / 100) / (1 + i27) - 1) * 100 }
  const temGrupos = new Set(linhas.filter((l) => l.pai).map((l) => l.pai))
  const rotulo = (l: Linha) => {
    if (l.pai) return <span className="block pl-6 text-ink-soft md:pl-10">{l.rotulo}</span>
    if (!temGrupos.has(l.chave)) return <span className={l.negrito ? 'font-semibold' : 'font-medium text-ink'}>{l.rotulo}</span>
    const aberto = abertos.has(l.chave)
    return (
      <button type="button" aria-expanded={aberto} onClick={() => alterna(l.chave)} className="inline-flex items-center gap-1.5 text-left font-medium text-ink">
        <span aria-hidden="true" className="inline-block w-3.5 text-ink-soft">{aberto ? '▾' : '▸'}</span>{l.rotulo}
        <span className="sr-only">{aberto ? ' recolher detalhe' : ' mostrar detalhe'}</span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <Cartao longa className="print-compacto" titulo="Despesa por órgão: PLOA 2027 sobre a projeção de 2026">
        <TabelaItens altura="livre" compacta itens={visiveis} legenda="Despesa por órgão, em R$ milhões" colunas={[
          { rotulo: 'R$ milhões', valor: rotulo },
          { rotulo: '2025', secundaria: true, valor: (l: Linha) => (l.v25 === null ? '–' : mi(l.v25)) },
          { rotulo: 'Proj. 26', valor: (l: Linha) => (l.p26 === null ? '–' : mi(l.p26)) },
          { rotulo: 'PLOA 27', valor: (l: Linha) => <span className="font-semibold">{mi(l.ploa)}</span> },
          { rotulo: 'Var. R$ mi', secundaria: true, valor: (l: Linha) => (l.p26 === null ? '–' : dMi(l.ploa - l.p26)) },
          { rotulo: 'Var. %', valor: (l: Linha) => { const d = varNominal(l); return d === null ? '–' : <span className={`font-semibold ${corDif(d)}`}>{fmtPct(d)}</span> } },
          { rotulo: 'Var. real %', secundaria: true, valor: (l: Linha) => { const d = varReal(l); return d === null ? '–' : <span className={corDif(d)}>{fmtPct(d)}</span> } },
        ]} />
        <p className={`mt-2 ${NOTA_DISCRETA}`}>
          Proj. 26: empenhado até {mesCorte} de cada órgão e grupo de despesa, dividido pela fração do ano que o órgão costuma ter empenhada nessa data (2022–2025), ajustado para somar a projeção do Resumo. Var.: PLOA 2027 sobre a Proj. 26; real: descontado o IPCA de 2027 (+{numero(i27 * 100, 1)}%). Reservas: RPPS, contingência e Fundo Soberano. Clique no órgão para ver os grupos de despesa.
        </p>
      </Cartao>
      <p className={`mt-3 ${NOTA_DISCRETA}`}>Fontes: PLOA 2027 (Mensagem nº 189/2026, art. 5º); Portal de Dados Abertos do ES; IPCA: Focus (BCB), mediana.</p>
    </div>
  )
}
