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

/**
 * Notícias do carrossel da página inicial: as marcadas em `destaques` (curadoria) vêm primeiro;
 * o restante é completado pelas mais recentes, até `quantidade`.
 */
export function paraCarrossel(quantidade = 3): Noticia[] {
  const fixadas = noticias.filter((n) => n.destaque)
  const demais = noticias.filter((n) => !n.destaque)
  return [...fixadas, ...demais].slice(0, quantidade)
}
