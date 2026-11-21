import raw from '@/data/orcamento.json'
import ploaRaw from '@/data/ploa2027.json'
import elementosRaw from '@/data/ploa2027-elementos.json'

/**
 * Camadas do painel do orçamento:
 *  - 2025 e 2026: Portal de Dados Abertos (OrcamentosDespesa), com dotação inicial, atualizada, empenhado, liquidado e pago;
 *  - 2027: PLOA (projeto de lei orçamentária) extraída do Programa de Trabalho da Mensagem nº 189/2026, só com a dotação proposta.
 * Todas compartilham a chave (unidade orçamentária, programa, ação, GND, fonte).
 */
export type Execucao = { inicial: number; atualizada: number; empenhado: number; liquidado: number; pago: number }
export type Linha = {
  uo: string; programa: string; acao: string; gnd: string; fonte: string; funcao: string; subfuncao: string
  y2025: Execucao | null
  y2026: Execucao | null
  ploa2027: number | null
}

type AnoBruto = { fechado: boolean; colunas: string[]; linhas: (string | number)[][] }
const dados = raw as unknown as {
  anos: Record<string, AnoBruto>
  nomes: { uo: Record<string, string>; programa: Record<string, string>; acao: Record<string, string>; fonte: Record<string, string>; gnd: Record<string, string>; funcao: Record<string, string> }
  conferencia: Record<string, { diferenca: number[] }>
  coletado_em: string
  fonte: string
}
const ploa = ploaRaw as unknown as {
  extraido_em: string
  documento: { titulo: string; sha256: string; url: string }
  conferencia: { total_linhas: number; total_impresso: number | null; acoes_fechadas: number; acoes_total: number; programas: number; unidades: number; orgaos: number; unidades_gnd_fonte_ok: number }
  colunas: string[]
  linhas: (string | number)[][]
  nomes: { uo: Record<string, string>; programa: Record<string, string>; acao: Record<string, string> }
}

export const nomes = {
  ...dados.nomes,
  // nomes que só existem na PLOA (ações novas, por exemplo) completam os da base de 2026
  uo: { ...ploa.nomes.uo, ...dados.nomes.uo },
  programa: { ...ploa.nomes.programa, ...dados.nomes.programa },
  acao: { ...ploa.nomes.acao, ...dados.nomes.acao },
}
export const coletadoEm = dados.coletado_em
export const fonteDados = dados.fonte
export const documentoPloa = ploa.documento
export const conferenciaPloa = ploa.conferencia
export const ploaExtraidaEm = ploa.extraido_em

const chave = (uo: string, p: string, a: string, g: string, f: string) => `${uo}|${p}|${a}|${g}|${f}`

function monta(): Linha[] {
  const mapa = new Map<string, Linha>()
  const obter = (uo: string, p: string, a: string, g: string, f: string, funcao: string, sub: string) => {
    const k = chave(uo, p, a, g, f)
    let l = mapa.get(k)
    if (!l) { l = { uo, programa: p, acao: a, gnd: g, fonte: f, funcao, subfuncao: sub, y2025: null, y2026: null, ploa2027: null }; mapa.set(k, l) }
    return l
  }
  const soma = (x: Execucao | null, v: Execucao): Execucao => x
    ? { inicial: x.inicial + v.inicial, atualizada: x.atualizada + v.atualizada, empenhado: x.empenhado + v.empenhado, liquidado: x.liquidado + v.liquidado, pago: x.pago + v.pago }
    : v
  for (const ano of ['2025', '2026'] as const) {
    const a = dados.anos[ano]
    if (!a) continue
    for (const r of a.linhas) {
      const [uo, p, ac, g, f, fu, su, ini, atu, emp, liq, pago] = r as [string, string, string, string, string, string, string, number, number, number, number, number]
      const l = obter(uo, p, ac, g, f, fu, su)
      const v = { inicial: ini, atualizada: atu, empenhado: emp, liquidado: liq, pago }
      if (ano === '2025') l.y2025 = soma(l.y2025, v); else l.y2026 = soma(l.y2026, v)
    }
  }
  const ic = Object.fromEntries(ploa.colunas.map((c, i) => [c, i]))
  for (const r of ploa.linhas) {
    const l = obter(String(r[ic.uo]), String(r[ic.programa]), String(r[ic.acao]), String(r[ic.gnd]), String(r[ic.fonte]), String(r[ic.funcao] ?? ''), String(r[ic.subfuncao] ?? ''))
    l.ploa2027 = (l.ploa2027 ?? 0) + Number(r[ic.valor])
  }
  return [...mapa.values()]
}

export const linhas: Linha[] = monta()

export type Agregado = { chave: string; nome: string; y2025: Execucao | null; y2026: Execucao | null; ploa2027: number | null; n: number }

export function agrega(por: (l: Linha) => string, nome: (k: string) => string, filtro?: (l: Linha) => boolean): Agregado[] {
  const m = new Map<string, Agregado>()
  for (const l of linhas) {
    if (filtro && !filtro(l)) continue
    const k = por(l)
    let a = m.get(k)
    if (!a) { a = { chave: k, nome: nome(k), y2025: null, y2026: null, ploa2027: null, n: 0 }; m.set(k, a) }
    a.n++
    for (const ano of ['y2025', 'y2026'] as const) {
      const v = l[ano]
      if (v) a[ano] = a[ano] ? { inicial: a[ano]!.inicial + v.inicial, atualizada: a[ano]!.atualizada + v.atualizada, empenhado: a[ano]!.empenhado + v.empenhado, liquidado: a[ano]!.liquidado + v.liquidado, pago: a[ano]!.pago + v.pago } : { ...v }
    }
    if (l.ploa2027 !== null) a.ploa2027 = (a.ploa2027 ?? 0) + l.ploa2027
  }
  return [...m.values()]
}

export const totais = {
  ploa2027: linhas.reduce((s, l) => s + (l.ploa2027 ?? 0), 0),
  inicial2026: linhas.reduce((s, l) => s + (l.y2026?.inicial ?? 0), 0),
  atualizada2026: linhas.reduce((s, l) => s + (l.y2026?.atualizada ?? 0), 0),
  empenhado2026: linhas.reduce((s, l) => s + (l.y2026?.empenhado ?? 0), 0),
  empenhado2025: linhas.reduce((s, l) => s + (l.y2025?.empenhado ?? 0), 0),
  atualizada2025: linhas.reduce((s, l) => s + (l.y2025?.atualizada ?? 0), 0),
}

export const nomeUo = (c: string) => nomes.uo[c] ?? c
export const nomeAcao = (c: string) => nomes.acao[c] ?? c
export const nomeFonte = (c: string) => nomes.fonte[c] ?? c
export const nomeGnd = (c: string) => nomes.gnd[c] ?? c
export const nomePrograma = (c: string) => nomes.programa[c] ?? c

/** Poderes e órgãos autônomos: Assembleia, Tribunal de Contas, Tribunal de Justiça, Ministério Público e Defensoria. */
export const ORGAOS_OUTROS_PODERES = new Set(['01', '02', '03', '05', '06'])
export const ehExecutivo = (uo: string) => !ORGAOS_OUTROS_PODERES.has(uo.slice(0, 2))

/** Uma ação (unidade, programa, ação) com as três camadas, no formato enxuto enviado ao navegador. */
export type AcaoPainel = {
  uo: string; programa: string; acao: string; nome: string
  /** [ploa2027, inicial2026, atualizada2026, empenhado2026, liquidado2026, pago2026, empenhado2025, atualizada2025] */
  v: [number, number, number, number, number, number, number, number]
  /** ação existente em 2026 (com dotação ou execução) e na PLOA */
  em2026: boolean
  emPloa: boolean
  /** código da ação em 2026 quando ela foi renumerada em 2027 (mesmo nome, mesma unidade) */
  antiga?: string
}

/** Ações renumeradas de 2026 para 2027: chave antiga (unidade|programa|ação) para a nova. */
export const renumeracao = new Map<string, string>()

export function acoesPainel(): AcaoPainel[] {
  renumeracao.clear()
  const m = new Map<string, AcaoPainel>()
  for (const l of linhas) {
    const k = `${l.uo}|${l.programa}|${l.acao}`
    let a = m.get(k)
    if (!a) { a = { uo: l.uo, programa: l.programa, acao: l.acao, nome: nomeAcao(l.acao), v: [0, 0, 0, 0, 0, 0, 0, 0], em2026: false, emPloa: false }; m.set(k, a) }
    if (l.ploa2027 !== null) { a.v[0] += l.ploa2027; a.emPloa = true }
    if (l.y2026) {
      a.v[1] += l.y2026.inicial; a.v[2] += l.y2026.atualizada; a.v[3] += l.y2026.empenhado; a.v[4] += l.y2026.liquidado; a.v[5] += l.y2026.pago
      if (l.y2026.atualizada || l.y2026.empenhado || l.y2026.inicial) a.em2026 = true
    }
    if (l.y2025) { a.v[6] += l.y2025.empenhado; a.v[7] += l.y2025.atualizada }
  }
  const res = [...m.values()].filter((a) => a.v.some((x) => x !== 0))
  // Ação renumerada: existe só na PLOA com o mesmo nome (e na mesma unidade) de uma ação que só existia em 2026.
  // Só vale o casamento único; do contrário a ação fica como nova e a antiga como encerrada.
  const norm = (s: string) => s.toUpperCase().normalize('NFD').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
  const novas = res.filter((a) => a.emPloa && !a.em2026)
  const antigas = res.filter((a) => !a.emPloa && a.em2026)
  const remover = new Set<AcaoPainel>()
  for (const n of novas) {
    const nn = norm(nomeAcao(n.acao))
    if (!nn) continue
    const c = antigas.filter((e) => e.uo === n.uo && !remover.has(e) && norm(nomeAcao(e.acao)) === nn)
    if (c.length === 1) {
      for (let i = 1; i < 8; i++) n.v[i] += c[0].v[i]
      n.em2026 = true
      n.antiga = c[0].acao
      remover.add(c[0])
      renumeracao.set(`${c[0].uo}|${c[0].programa}|${c[0].acao}`, `${n.uo}|${n.programa}|${n.acao}`)
    }
  }
  return res.filter((a) => !remover.has(a))
}

/** Composição por GND e por fonte (PLOA 2027 contra 2026). */
export function porGnd() { return agrega((l) => l.gnd, nomeGnd) }
export function porFonte() { return agrega((l) => l.fonte, nomeFonte) }

/**
 * Linha enxuta para o navegador: [uo, programa, ação, gnd, fonte, ploa2027, inicial26, atualizada26, empenhado26, liquidado26, pago26, empenhado25, atualizada25].
 * As ações renumeradas de 2026 para 2027 já vêm unificadas na chave nova.
 */
export type LinhaCompacta = [string, string, string, string, string, number, number, number, number, number, number, number, number]

export function linhasCompactas(): LinhaCompacta[] {
  acoesPainel() // preenche a renumeração
  return linhas.map((l) => {
    const novo = renumeracao.get(`${l.uo}|${l.programa}|${l.acao}`)
    const [uo, programa, acao] = novo ? novo.split('|') : [l.uo, l.programa, l.acao]
    const a = l.y2026
    const b = l.y2025
    return [uo, programa, acao, l.gnd, l.fonte, l.ploa2027 ?? 0, a?.inicial ?? 0, a?.atualizada ?? 0, a?.empenhado ?? 0, a?.liquidado ?? 0, a?.pago ?? 0, b?.empenhado ?? 0, b?.atualizada ?? 0] as LinhaCompacta
  }).filter((r) => r.slice(5).some((x) => x !== 0))
}

/** Nomes só dos códigos que aparecem nas linhas. */
export function nomesPainel(ls: LinhaCompacta[]) {
  const pega = (dic: Record<string, string>, codigos: Set<string>) => Object.fromEntries([...codigos].map((c) => [c, dic[c] ?? '']))
  return {
    uo: pega(nomes.uo, new Set(ls.map((r) => r[0]))),
    programa: pega(nomes.programa, new Set(ls.map((r) => r[1]))),
    acao: pega(nomes.acao, new Set(ls.map((r) => r[2]))),
    gnd: pega(nomes.gnd, new Set(ls.map((r) => r[3]))),
    fonte: pega(nomes.fonte, new Set(ls.map((r) => r[4]))),
  }
}

/** Totais por função (código de dois dígitos): empenhado de 2025, dotação inicial, atualizada e empenhado de 2026 e PLOA 2027, em reais. */
export type TotaisFuncao = { emp25: number; ini26: number; atu26: number; emp26: number; ploa27: number }
export function totaisPorFuncao(): Record<string, TotaisFuncao> {
  const out: Record<string, TotaisFuncao> = {}
  for (const l of linhas) {
    const f = (out[l.funcao || '--'] ??= { emp25: 0, ini26: 0, atu26: 0, emp26: 0, ploa27: 0 })
    f.emp25 += l.y2025?.empenhado ?? 0
    f.ini26 += l.y2026?.inicial ?? 0
    f.atu26 += l.y2026?.atualizada ?? 0
    f.emp26 += l.y2026?.empenhado ?? 0
    f.ploa27 += l.ploa2027 ?? 0
  }
  return out
}

/** Reserva de contingência da PLOA 2027 (ação 9999 do programa 9999, GND 9), sem a reserva do RPPS e a do Fundo Soberano, que têm ações próprias. */
export function reservaContingenciaPloa(): number {
  return linhas.filter((l) => l.gnd === '9' && l.acao === '9999').reduce((t, l) => t + (l.ploa2027 ?? 0), 0)
}

/** PLOA 2027 por GND e elemento de despesa (código sem zero à esquerda, como no Portal), em reais, do detalhamento por elemento da proposta (PL 525/2026). Sem as reservas (GND 9). */
export function ploaPorElemento(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  for (const l of (elementosRaw as unknown as { linhas: [string, string, string, string, string, string, string, string, number][] }).linhas) {
    const nat = l[6]
    const gnd = nat[1]
    if (gnd === '9') continue
    const el = String(Number(nat.slice(4, 6)))
    out[gnd] ??= {}
    out[gnd][el] = (out[gnd][el] ?? 0) + l[8]
  }
  return out
}

/** Pessoal e encargos (GND 1) do Poder Executivo na PLOA 2027, em reais: despesa bruta, sem as exclusões que a LRF faz na apuração do limite. */
export function pessoalPloaExecutivo(): number {
  return linhas.filter((l) => l.gnd === '1' && ehExecutivo(l.uo)).reduce((t, l) => t + (l.ploa2027 ?? 0), 0)
}

/** Pessoal e encargos (GND 1) do Poder Executivo empenhado em 2025, em reais: base para ligar a despesa bruta ao pessoal líquido do RGF. */
export function pessoalExecutivoEmpenhado2025(): number {
  return linhas.filter((l) => l.gnd === '1' && ehExecutivo(l.uo)).reduce((t, l) => t + (l.y2025?.empenhado ?? 0), 0)
}
