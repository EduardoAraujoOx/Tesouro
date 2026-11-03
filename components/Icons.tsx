import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export const IconBank = (p: P) => (
  <svg {...base} {...p}><path d="m3 9 9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" /></svg>
)
export const IconPie = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v9h9" /></svg>
)
export const IconLayers = (p: P) => (
  <svg {...base} {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 17.5 9 5 9-5" /></svg>
)
export const IconBook = (p: P) => (
  <svg {...base} {...p}><path d="M12 6c-1.6-1.3-4-2-8-2v14c4 0 6.4.7 8 2 1.6-1.3 4-2 8-2V4c-4 0-6.4.7-8 2Z" /><path d="M12 6v14" /></svg>
)
export const IconSearch = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const IconMenu = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const IconClose = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const IconArrow = (p: P) => (
  <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const IconChevron = (p: P) => (
  <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
)
export const IconExternal = (p: P) => (
  <svg {...base} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
)
export const IconCalendar = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
)
export const IconBars = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="12" width="4.5" height="8" rx="1" /><rect x="9.75" y="7" width="4.5" height="13" rx="1" /><rect x="16.5" y="3" width="4.5" height="17" rx="1" /></svg>
)
export const IconCoins = (p: P) => (
  <svg {...base} {...p}><ellipse cx="10" cy="7" rx="6" ry="3" /><path d="M4 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M4 11v4c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.5" /><ellipse cx="17" cy="15" rx="4" ry="2" /><path d="M13 15v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" /></svg>
)
export const IconDoc = (p: P) => (
  <svg {...base} {...p}><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>
)
export const IconPeople = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3" /><circle cx="5.5" cy="10" r="2.2" /><circle cx="18.5" cy="10" r="2.2" /><path d="M6.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M1.5 18c0-2.2 1.6-3.8 4-3.8M22.5 18c0-2.2-1.6-3.8-4-3.8" /></svg>
)
export const IconCalc = (p: P) => (
  <svg {...base} {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" strokeWidth={2.2} /></svg>
)
export const IconPdf = (p: P) => (
  <svg {...base} viewBox="0 0 24 28" width={28} height={32} {...p}>
    <path d="M15 2H5a1 1 0 0 0-1 1v22a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8z" /><path d="M15 2v6h5M8 14h8M8 18h8M8 22h5" />
  </svg>
)
export const IconPin = (p: P) => (
  <svg {...base} {...p}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
)
export const IconPhone = (p: P) => (
  <svg {...base} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" /></svg>
)
export const IconAccess = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5c4.5 1.3 9.5 1.3 14 0M12 9v5m0 0-3 6m3-6 3 6" /></svg>
)
export const IconContrast = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" /></svg>
)

export const IconShield = (p: P) => (
  <svg {...base} {...p}><path d="M12 3 5 6v5.5c0 4.4 2.9 7.7 7 9.5 4.1-1.8 7-5.1 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
)
export const IconInfo = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" strokeWidth={2.2} /></svg>
)
export const IconTarget = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>
)

export const iconePorNome = {
  bars: IconBars,
  coins: IconCoins,
  doc: IconDoc,
  people: IconPeople,
  calc: IconCalc,
  layers: IconLayers,
  book: IconBook,
  pie: IconPie,
} as const
export const IconPause = (p: P) => (
  <svg {...base} {...p}><rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" /></svg>
)
export const IconPlay = (p: P) => (
  <svg {...base} {...p}><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" /></svg>
)
