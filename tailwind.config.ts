import type { Config } from 'tailwindcss'

// Cores via variáveis CSS (RGB) para que o modo de alto contraste troque o tema inteiro.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        surface: v('surface'),
        line: v('line'),
        ink: { DEFAULT: v('ink'), soft: v('ink-soft') },
        navy: { DEFAULT: v('navy'), deep: v('navy-deep') },
        'on-navy': v('on-navy'),
        'hero-overlay': v('hero-overlay'),
        herobtn: { DEFAULT: v('btn-bg'), fg: v('btn-fg') },
        skybrand: '#39B5E8',
        rosebrand: '#F28AB2',
      },
      fontFamily: {
        serif: ['"Source Serif 4 Variable"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Escala tipográfica: 8 degraus nomeados (+ numeral). Evite tamanhos soltos fora desta lista.
      fontSize: {
        label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.6' }],
        lead: ['1.125rem', { lineHeight: '1.6' }],
        title: ['1.25rem', { lineHeight: '1.3' }],
        section: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        headline: ['clamp(1.625rem, 1.25rem + 1.2vw, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.012em' }],
        display: ['clamp(2rem, 1.35rem + 2.3vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.018em' }],
        numeral: ['clamp(3.5rem, 2.8rem + 3vw, 4.5rem)', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      maxWidth: { page: '1280px' },
      borderRadius: { brand: '10px' },
    },
  },
  plugins: [],
}
export default config
