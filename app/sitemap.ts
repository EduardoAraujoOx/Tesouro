import type { MetadataRoute } from 'next'
import { paginas } from '@/lib/paginas'
const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['', '/publicacoes', '/servicos', '/sobre', '/noticias', '/creditos'],
    ...paginas.map((p) => `/tesouro/${p.slug}`),
  ].map((p) => ({ url: `${base}${p}` }))
}
