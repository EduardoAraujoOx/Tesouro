import type { MetadataRoute } from 'next'
import { noticias } from '@/lib/noticias'
import { paginas } from '@/lib/paginas'
const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['', '/publicacoes', '/servicos', '/sobre', '/noticias', '/indicadores', '/contato', '/cidadao', '/creditos'],
    ...noticias.map((n) => `/noticias/${n.slug}`),
    ...paginas.map((p) => `/tesouro/${p.slug}`),
  ].map((p) => ({ url: `${base}${p}` }))
}
