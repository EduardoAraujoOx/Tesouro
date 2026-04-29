const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function monthLabel(m: string): string {
  const [year, month] = m.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]}/${year}`
}
