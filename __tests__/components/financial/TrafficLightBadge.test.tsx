/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import TrafficLightBadge from '@/components/financial/TrafficLightBadge'

describe('TrafficLightBadge', () => {
  it('renders a span element', () => {
    render(<TrafficLightBadge light="VERDE" />)
    const badge = screen.getByTitle('Verde')
    expect(badge.tagName).toBe('SPAN')
  })

  it('VERDE has correct color and title', () => {
    render(<TrafficLightBadge light="VERDE" />)
    const badge = screen.getByTitle('Verde')
    expect(badge).toHaveStyle({ background: '#16a34a' })
    expect(badge).toHaveAttribute('title', 'Verde')
  })

  it('AMARELO has correct color and title', () => {
    render(<TrafficLightBadge light="AMARELO" />)
    const badge = screen.getByTitle('Amarelo')
    expect(badge).toHaveStyle({ background: '#d97706' })
    expect(badge).toHaveAttribute('title', 'Amarelo')
  })

  it('VERMELHO has correct color and title', () => {
    render(<TrafficLightBadge light="VERMELHO" />)
    const badge = screen.getByTitle('Vermelho')
    expect(badge).toHaveStyle({ background: '#dc2626' })
    expect(badge).toHaveAttribute('title', 'Vermelho')
  })

  it('CINZA has correct color and title "Pendente"', () => {
    render(<TrafficLightBadge light="CINZA" />)
    const badge = screen.getByTitle('Pendente')
    expect(badge).toHaveStyle({ background: '#6b7280' })
    expect(badge).toHaveAttribute('title', 'Pendente')
  })

  it('renders as a circle (borderRadius 50%)', () => {
    render(<TrafficLightBadge light="VERDE" />)
    const badge = screen.getByTitle('Verde')
    expect(badge).toHaveStyle({ borderRadius: '50%' })
  })

  it('default size is 10px', () => {
    render(<TrafficLightBadge light="VERDE" />)
    const badge = screen.getByTitle('Verde')
    expect(badge).toHaveStyle({ width: '10px', height: '10px' })
  })

  it('accepts custom size prop', () => {
    render(<TrafficLightBadge light="VERDE" size={20} />)
    const badge = screen.getByTitle('Verde')
    expect(badge).toHaveStyle({ width: '20px', height: '20px' })
  })
})
