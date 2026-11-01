const isDev = process.env.NODE_ENV !== 'production'

// CSP restritiva: o portal é estático e não carrega scripts, fontes ou imagens de terceiros
// (fontes são servidas pelo próprio site, o que também evita vazar IP de visitantes ao Google, em respeito à LGPD).
const montaCsp = (frameSrc) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  `frame-src ${frameSrc}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
const csp = montaCsp("'none'")
// A página do leitor de revistinhas exibe o leitor do Tesouro Nacional; só ela permite esse endereço.
const cspLeitor = montaCsp("'self' https://cdn.tesouro.gov.br")

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const comuns = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    ]
    return [
      { source: '/cidadao/em-busca-do-tesouro', headers: [{ key: 'Content-Security-Policy', value: cspLeitor }, ...comuns] },
      { source: '/((?!cidadao/em-busca-do-tesouro$).*)', headers: [{ key: 'Content-Security-Policy', value: csp }, ...comuns] },
    ]
  },
}

export default nextConfig
