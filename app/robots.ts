import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  // /painel é o ambiente de trabalho da transição: acessível por endereço, mas fora do menu, do mapa do site e dos buscadores
  return { rules: { userAgent: '*', allow: '/', disallow: '/painel' } }
}
