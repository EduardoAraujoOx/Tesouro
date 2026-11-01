import raw from '@/data/noticias.json'

export type Noticia = {
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

/** Notícia pelo trecho do endereço (usada para ligar reconhecimentos às matérias de origem). */
export function noticiaPorTrecho(trecho: string): Noticia | undefined {
  return noticias.find((n) => n.href.includes(trecho))
}

/** Ordem editorial da página inicial: matéria de capa (a marcada em `curadoria` ou a mais recente), 3 laterais e 6 em grade. */
export function paraHome(): { capa?: Noticia; laterais: Noticia[]; grade: Noticia[] } {
  const capa = noticias.find((n) => n.destaque) ?? noticias[0]
  const resto = noticias.filter((n) => n !== capa)
  return { capa, laterais: resto.slice(0, 3), grade: resto.slice(3, 9) }
}
