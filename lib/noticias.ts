import raw from '@/data/noticias.json'

export type Noticia = {
  slug: string
  corpo: string
  data: string
  titulo: string
  resumo: string
  href: string
  imagem?: string
  imagemLargura?: number
  imagemAltura?: number
  imagemTipo?: 'foto' | 'arte'
  destaque?: boolean
}

const dados = raw as unknown as { geradoEm: string; fonte: string; noticias: Noticia[] }

export const noticias: Noticia[] = dados.noticias
export const fonteNoticias = dados.fonte

/** Endereço da notícia dentro do portal. */
export const hrefNoticia = (n: Pick<Noticia, 'slug'>) => `/noticias/${n.slug}`

export const noticiaPorSlug = (slug: string) => noticias.find((n) => n.slug === slug)

/** Notícias vizinhas na ordem cronológica: a anterior (mais antiga) e a próxima (mais nova). */
export function vizinhas(slug: string): { anterior?: Noticia; proxima?: Noticia } {
  const i = noticias.findIndex((n) => n.slug === slug)
  return { proxima: i > 0 ? noticias[i - 1] : undefined, anterior: i >= 0 ? noticias[i + 1] : undefined }
}

/**
 * Prepara o texto da matéria: links para outras matérias do portal passam a abrir por dentro;
 * os demais abrem em nova aba.
 */
export function prepararCorpo(html: string): string {
  return html.replace(/<a href="(https?:\/\/[^"]+)">/g, (_m, url: string) => {
    const interna = noticias.find((n) => n.href === url.split('#')[0].replace(/\/$/, ''))
    return interna ? `<a href="${hrefNoticia(interna)}">` : `<a href="${url}" target="_blank" rel="noopener noreferrer">`
  })
}

/** Notícia pelo trecho do endereço (usada para ligar reconhecimentos às matérias de origem). */
export function noticiaPorTrecho(trecho: string): Noticia | undefined {
  return noticias.find((n) => n.href.includes(trecho))
}

/**
 * Notícias do carrossel da página inicial: as marcadas em `destaques` (curadoria) vêm primeiro;
 * o restante é completado pelas mais recentes, até `quantidade`.
 */
export function paraCarrossel(quantidade = 3): Noticia[] {
  const fixadas = noticias.filter((n) => n.destaque)
  const demais = noticias.filter((n) => !n.destaque)
  return [...fixadas, ...demais].slice(0, quantidade)
}
