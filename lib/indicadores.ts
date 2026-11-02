import raw from '@/data/indicadores.json'
import definicoesRaw from '@/data/definicoes-indicadores.json'

export type Limites = { valor: number | null; limite: number | null; alerta: number | null; prudencial?: number | null; limiteFixo?: boolean; montante?: number | null }
export type PeriodoLrf = {
  ano: number
  quad: number
  entregaEm?: string | null
  pessoal: Limites & { rcl_ajustada: number | null }
  divida: Limites & { dc: number | null; dcl_montante: number | null; deducoes: number | null; caixa_bruta: number | null; haveres: number | null; rcl_ajustada: number | null }
  garantias: Limites
  credito: Limites
}
export type EdicaoCapag = {
  ano: number
  classificacao: string | null
  endividamento: number | null
  notaEndividamento: string | null
  poupanca: number | null
  notaPoupanca: string | null
  liquidez: number | null
  notaLiquidez: string | null
  qualidadeInformacao: string | null
}

const dados = raw as unknown as {
  geradoEm: string
  fontes: { siconfi: string; capag: string }
  capag: { conjuntoAtualizadoEm: string; serie: EdicaoCapag[] }
  lrf: { serie: PeriodoLrf[] }
}

export const coletadoEm = dados.geradoEm
export const serieLrf = dados.lrf.serie
export const serieCapag = dados.capag.serie
export const fontes = dados.fontes
export const capagAtualizadaEm = dados.capag.conjuntoAtualizadoEm
export const ultimoLrf = serieLrf[serieLrf.length - 1]
export const ultimaCapag = serieCapag[serieCapag.length - 1]

export type ChaveLrf = 'pessoal' | 'divida' | 'garantias' | 'credito'

/** Definições dos indicadores da LRF mostrados no painel (texto em linguagem simples + base legal). */
export const INDICADORES_LRF: Record<ChaveLrf, { id: ChaveLrf; nome: string; curto: string; anexo: string; oQue: string; base: string; escala?: string }> = {
  pessoal: {
    id: 'pessoal',
    nome: 'Despesa com pessoal (Poder Executivo)',
    curto: 'Despesa com pessoal',
    anexo: 'RGF, Anexo 1',
    oQue: 'Quanto da receita corrente líquida é gasto com a folha de pagamento do Poder Executivo. A Lei de Responsabilidade Fiscal fixa o teto em 49%; ao chegar a 90% do teto há alerta, e a 95% (limite prudencial) entram vedações, como a criação de cargos.',
    base: 'LRF, arts. 20, 22 e 59',
  },
  divida: {
    id: 'divida',
    nome: 'Dívida consolidada líquida',
    curto: 'Dívida consolidada líquida',
    anexo: 'RGF, Anexo 2',
    oQue: 'Dívida de longo prazo menos o caixa e outros ativos financeiros do Estado, em proporção da receita corrente líquida. O limite é de 200% da receita. Quando o resultado é negativo, os ativos financeiros superam a dívida.',
    base: 'Resolução do Senado nº 40/2001',
  },
  garantias: {
    id: 'garantias',
    nome: 'Garantias concedidas',
    curto: 'Garantias concedidas',
    anexo: 'RGF, Anexo 3',
    oQue: 'Valor das garantias que o Estado concede a empréstimos de terceiros, em proporção da receita corrente líquida. O limite é de 22%.',
    base: 'Resolução do Senado nº 43/2001',
  },
  credito: {
    id: 'credito',
    nome: 'Operações de crédito',
    curto: 'Operações de crédito',
    anexo: 'RGF, Anexo 4',
    oQue: 'Empréstimos contratados pelo Estado no exercício, em proporção da receita corrente líquida. O valor é acumulado no ano e volta a zero a cada janeiro. O limite geral é de 16%.',
    base: 'Resolução do Senado nº 43/2001',
    escala: 'acumulado no exercício',
  },
}
export const ORDEM_LRF: ChaveLrf[] = ['pessoal', 'divida', 'garantias', 'credito']

export const rotuloPeriodo = (p: { ano: number; quad: number }) => `${p.quad}º quadrimestre de ${p.ano}`
export const rotuloCurto = (p: { ano: number; quad: number }) => `${p.quad}º quad./${String(p.ano).slice(2)}`

export { pct, numero, bilhoes } from './formato'

/** Situação do indicador frente aos limites (texto neutro, sem depender de cor). */
export function situacao(l: Limites): { texto: string; folga: number | null; nivel: 'ok' | 'alerta' | 'prudencial' | 'acima' } {
  const v = l.valor
  if (v === null || l.limite === null) return { texto: 'Sem dado', folga: null, nivel: 'ok' }
  const folga = Math.round((l.limite - v) * 10) / 10
  if (l.prudencial != null && v >= l.limite) return { texto: 'Acima do limite', folga, nivel: 'acima' }
  if (l.prudencial != null && v >= l.prudencial) return { texto: 'Acima do limite prudencial', folga, nivel: 'prudencial' }
  if (l.alerta != null && v >= l.alerta) return { texto: 'Acima do limite de alerta', folga, nivel: 'alerta' }
  if (v >= l.limite) return { texto: 'Acima do limite', folga, nivel: 'acima' }
  return { texto: v < 0 ? 'Negativa: ativos financeiros superam a dívida' : 'Abaixo do limite de alerta', folga, nivel: 'ok' }
}

/** Maior degrau de "demais haveres financeiros" entre dois quadrimestres (explica saltos na dívida líquida). */
export function degrauHaveres(): { de: number; para: number; em: PeriodoLrf } | null {
  let melhor: { de: number; para: number; em: PeriodoLrf } | null = null
  for (let i = 1; i < serieLrf.length; i++) {
    const a = serieLrf[i - 1].divida.haveres
    const b = serieLrf[i].divida.haveres
    if (a != null && b != null && b - a > 5e9 && (!melhor || b - a > melhor.para - melhor.de)) melhor = { de: a, para: b, em: serieLrf[i] }
  }
  return melhor
}

/* ------------------------------------------------------------------------------------------------
 * Catálogo para o explorador do painel fiscal: cada indicador é uma série pronta para o gráfico.
 * Os objetos são simples (serializáveis) para seguirem do servidor para o navegador.
 * ---------------------------------------------------------------------------------------------- */

export type Familia = 'lrf' | 'capag'
export type PontoIndicador = { ano: number; sub: number; rotulo: string; extenso: string; valor: number | null; nota?: string | null }
export type ReferenciaIndicador = { rotulo: string; valor: number; estilo: 'limite' | 'alerta' | 'prudencial' }
export type Indicador = {
  id: string
  familia: Familia
  nome: string
  curto: string
  subtitulo: string
  definicao: string
  formula: string
  leitura: string
  limite: string
  base: string
  fonte: string
  periodicidade: 'quadrimestral' | 'anual'
  pontos: PontoIndicador[]
  referencias: ReferenciaIndicador[]
  acumulaNoAno?: boolean
}

export const FAMILIAS: Record<Familia, { id: Familia; nome: string; descricao: string; padrao: string[] }> = {
  lrf: { id: 'lrf', nome: 'Limites da LRF', descricao: 'Relatório de Gestão Fiscal, a cada quadrimestre', padrao: ['pessoal'] },
  capag: { id: 'capag', nome: 'CAPAG', descricao: 'Capacidade de pagamento, uma edição por ano', padrao: ['endividamento'] },
}

type Definicao = Pick<Indicador, 'nome' | 'curto' | 'subtitulo' | 'definicao' | 'formula' | 'leitura' | 'limite' | 'base' | 'fonte'>
const definicoes = definicoesRaw as unknown as Record<string, Definicao>

const CAPAG_NOTAS = { endividamento: 'notaEndividamento', poupanca: 'notaPoupanca', liquidez: 'notaLiquidez' } as const

/** Monta as séries do painel a partir dos dados coletados (valores) e de `data/definicoes-indicadores.json` (textos). */
export function catalogoIndicadores(): Indicador[] {
  const lrf: Indicador[] = ORDEM_LRF.map((k) => {
    const ref = ultimoLrf[k]
    const referencias: ReferenciaIndicador[] = []
    if (ref.limite != null) referencias.push({ rotulo: 'Limite legal', valor: ref.limite, estilo: 'limite' })
    if (ref.prudencial != null) referencias.push({ rotulo: 'Limite prudencial', valor: ref.prudencial, estilo: 'prudencial' })
    if (ref.alerta != null) referencias.push({ rotulo: 'Limite de alerta', valor: ref.alerta, estilo: 'alerta' })
    return {
      id: k,
      familia: 'lrf',
      ...definicoes[k],
      periodicidade: 'quadrimestral',
      pontos: serieLrf.map((p) => ({
        ano: p.ano,
        sub: p.quad,
        rotulo: `${p.quad}º quad./${String(p.ano).slice(2)}`,
        extenso: `${p.quad}º quadrimestre de ${p.ano}`,
        valor: p[k].valor,
      })),
      referencias,
      acumulaNoAno: k === 'credito',
    }
  })
  const capag: Indicador[] = (Object.keys(CAPAG_NOTAS) as (keyof typeof CAPAG_NOTAS)[]).map((k) => ({
    id: k,
    familia: 'capag',
    ...definicoes[k],
    periodicidade: 'anual',
    pontos: serieCapag.map((e) => ({ ano: e.ano, sub: 1, rotulo: String(e.ano), extenso: `Edição ${e.ano}`, valor: e[k], nota: e[CAPAG_NOTAS[k]] })),
    referencias: [],
  }))
  return [...lrf, ...capag]
}

/** Classificação geral da CAPAG por edição (A, A+, B...), mostrada ao lado das séries do grupo CAPAG. */
export const classificacoesCapag: Record<number, string | null> = Object.fromEntries(serieCapag.map((e) => [e.ano, e.classificacao]))
