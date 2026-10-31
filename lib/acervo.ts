import raw from '@/data/acervo.json'

export type TipoId = string

export type Publicacao = {
  id: string
  tipo: TipoId
  pagina: string
  titulo: string
  descricao: string
  grupo: string | null
  ano: number | null
  periodo: string | null
  ordem: number
  atualizadoEm: string | null // ISO yyyy-mm-dd
  tamanho: string | null
  formato: string
  url: string
}

type Acervo = { geradoEm: string; fonte: string; total: number; itens: Publicacao[] }

const acervo = raw as unknown as Acervo

export const todas: Publicacao[] = acervo.itens
export const geradoEm = acervo.geradoEm
export const BASE_SEFAZ = acervo.fonte

/** Filtros exibidos na página de publicações. `lrf` agrupa RREO + RGF. */
export const TIPOS: { id: string; rotulo: string; tipos: TipoId[] }[] = [
  { id: 'resultado-tesouro', rotulo: 'Resultado do Tesouro Estadual', tipos: ['resultado-tesouro'] },
  { id: 'resultado-caixa', rotulo: 'Resultado de Caixa do Tesouro', tipos: ['resultado-caixa'] },
  { id: 'lrf', rotulo: 'Relatórios Fiscais (RREO e RGF)', tipos: ['rreo', 'rgf'] },
  { id: 'rreo', rotulo: 'RREO – Execução Orçamentária', tipos: ['rreo'] },
  { id: 'rgf', rotulo: 'RGF – Gestão Fiscal', tipos: ['rgf'] },
  { id: 'divida-paf', rotulo: 'Dívida Pública, PAF e PROPAG', tipos: ['divida-paf'] },
  { id: 'prestacao-contas', rotulo: 'Prestação de Contas do Governador', tipos: ['prestacao-contas'] },
  { id: 'municipios', rotulo: 'Transferências aos Municípios', tipos: ['municipios'] },
  { id: 'transferencias-especiais', rotulo: 'Transferências Especiais', tipos: ['transferencias-especiais'] },
  { id: 'receita-realizada', rotulo: 'Receita Realizada Mensal', tipos: ['receita-realizada'] },
  { id: 'opv', rotulo: 'Obrigações de Pequeno Valor (OPV)', tipos: ['opv'] },
  { id: 'normas-contabeis', rotulo: 'Normas e procedimentos contábeis', tipos: ['normas-contabeis'] },
  { id: 'legislacao', rotulo: 'Legislação e consultas públicas', tipos: ['legislacao'] },
  { id: 'notas-tecnicas', rotulo: 'Notas Técnicas', tipos: ['notas-tecnicas'] },
  { id: 'financas', rotulo: 'Finanças: contas e execução', tipos: ['financas'] },
  { id: 'boletins', rotulo: 'Boletins informativos', tipos: ['boletins'] },
  { id: 'cidadao', rotulo: 'Tesouro Cidadão', tipos: ['cidadao'] },
  { id: 'funses', rotulo: 'Fundo Soberano (FUNSES)', tipos: ['funses'] },
  { id: 'sistemas', rotulo: 'Sistemas (SIAFEM e SIGEFES)', tipos: ['sistemas'] },
]

export function tiposDe(id: string): TipoId[] {
  return TIPOS.find((t) => t.id === id)?.tipos ?? []
}

/** Mais recente pelo PERÍODO DE REFERÊNCIA (ano + período), não pela data de atualização do arquivo. */
export function maisRecente(filtro: { tipos?: TipoId[]; pagina?: string }): Publicacao | undefined {
  return todas
    .filter((p) => p.ano && (!filtro.tipos || filtro.tipos.includes(p.tipo)) && (!filtro.pagina || p.pagina === filtro.pagina))
    .sort((a, b) => (b.ano! - a.ano!) || (b.ordem - a.ordem))[0]
}

/** Últimas atualizações do acervo, ignorando reenvios em massa de séries históricas antigas. */
export function ultimasAtualizacoes(n = 3): Publicacao[] {
  const anoMax = Math.max(...todas.map((p) => p.ano ?? 0))
  return todas
    .filter((p) => p.atualizadoEm && p.ano && p.ano >= anoMax - 1)
    .sort((a, b) => (b.atualizadoEm! < a.atualizadoEm! ? -1 : 1))
    .slice(0, n)
}

export function doPagina(slug: string): Publicacao[] {
  return todas.filter((p) => p.pagina === slug)
}

/** "dd/mm/aaaa" (como a SEFAZ publica) → ISO. */
export function isoDeBr(d: string | null): string | null {
  if (!d) return null
  const [dd, mm, aa] = d.split('/')
  return aa && mm && dd ? `${aa}-${mm}-${dd}` : null
}

export function formatarData(iso: string | null): string {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  const mes = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'][Number(m) - 1]
  return `${Number(d)} ${mes} ${a}`
}
