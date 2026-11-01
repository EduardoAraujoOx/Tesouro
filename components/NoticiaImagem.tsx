import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { Noticia } from '@/lib/noticias'

/**
 * Imagem de notícia. Fotografias são cortadas para preencher o quadro; cartões gráficos
 * (texto embutido, feitos para redes sociais) são mostrados inteiros sobre fundo neutro.
 * `alt` vazio: a imagem é ilustrativa e o título da notícia está ao lado.
 */
export function NoticiaImagem({ n, sizes, prioridade = false, className = '', style }: { n: Noticia; sizes: string; prioridade?: boolean; className?: string; style?: CSSProperties }) {
  if (!n.imagem) {
    return <div aria-hidden="true" className={`bg-navy ${className}`} style={{ ...style, backgroundImage: 'linear-gradient(135deg, #082B57 55%, #39B5E8 55% 70%, #F28AB2 70%)' }} />
  }
  const arte = n.imagemTipo === 'arte'
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`} style={style}>
      <Image
        src={n.imagem}
        alt=""
        fill
        sizes={sizes}
        priority={prioridade}
        className={arte ? 'object-contain' : 'object-cover object-[50%_35%]'}
      />
    </div>
  )
}
