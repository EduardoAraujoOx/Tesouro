import type { TrafficLight } from '@/lib/calculations/financialCalc'

interface Props {
  light: TrafficLight
  size?: number
}

const COLORS: Record<TrafficLight, string> = {
  VERDE: '#16a34a',
  AMARELO: '#d97706',
  VERMELHO: '#dc2626',
  CINZA: '#6b7280',
}

const LABELS: Record<TrafficLight, string> = {
  VERDE: 'Verde',
  AMARELO: 'Amarelo',
  VERMELHO: 'Vermelho',
  CINZA: 'Pendente',
}

export default function TrafficLightBadge({ light, size = 10 }: Props) {
  return (
    <span
      title={LABELS[light]}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: COLORS[light],
        flexShrink: 0,
      }}
    />
  )
}
