import raw from '@/data/paginas.json'

export type ItemArquivo = {
  titulo: string
  exibicao: string
  descricao: string
  atualizadoEm: string | null // dd/mm/aaaa
  tamanho: string | null
  formato: string
  url: string
}

export type Segmento =
  | { tipo: 'texto'; html: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'arquivos'; titulo: string; itens: ItemArquivo[] }

export type Pagina = {
  slug: string
  slugSefaz: string
  titulo: string
  secao: string
  categoria: string
  fonte: string
  segmentos: Segmento[]
}

const dados = raw as unknown as { geradoEm: string; paginas: Pagina[] }

export const paginas: Pagina[] = dados.paginas
export const geradoEmPaginas = dados.geradoEm

export function paginaPorSlug(slug: string): Pagina | undefined {
  return paginas.find((p) => p.slug === slug)
}

export function totalArquivos(p: Pagina): number {
  return p.segmentos.reduce((n, s) => n + (s.tipo === 'arquivos' ? s.itens.length : 0), 0)
}

/** Torna externos os links do HTML saneado: abrem em nova aba, sem vazar `opener`. */
export function prepararHtml(html: string): string {
  return html.replace(/<a href="(https?:\/\/[^"]+)">/g, '<a href="$1" target="_blank" rel="noopener noreferrer">')
}

export const rotuloFormato: Record<string, string> = {
  pdf: 'Baixar PDF', xls: 'Baixar Excel', xlsx: 'Baixar Excel', doc: 'Baixar Word', docx: 'Baixar Word',
  zip: 'Baixar ZIP', csv: 'Baixar CSV', odt: 'Baixar ODT', ods: 'Baixar ODS',
}
export function acaoDoFormato(formato: string): string {
  return rotuloFormato[formato] ?? 'Acessar'
}
