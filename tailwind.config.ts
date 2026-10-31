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
        skybrand: '#39B5E8',
        rosebrand: '#F28AB2',
      },
      fontFamily: {
        serif: ['"Source Serif 4 Variable"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: { page: '1280px' },
      borderRadius: { brand: '10px' },
    },
  },
  plugins: [],
}
export default config
