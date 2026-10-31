import raw from '@/data/noticias.json'

export type Noticia = { data: string; titulo: string; resumo: string; href: string }

const dados = raw as unknown as { geradoEm: string; fonte: string; noticias: Noticia[] }

export const noticias: Noticia[] = dados.noticias
export const fonteNoticias = dados.fonte
