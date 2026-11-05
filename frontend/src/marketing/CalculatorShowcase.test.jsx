import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The showcase's tracker cards derive from the runtime published set + the
// tracker metadata in upcomingFeatures.js — not a hard-coded list (#287).
const getPublished = vi.fn()
vi.mock('../api/calculatorApi', () => ({
  calculatorApi: { getPublished: () => getPublished() },
}))

const { default: CalculatorShowcase } = await import('./CalculatorShowcase')
const { UPCOMING_MAP } = await import('../upcomingFeatures')
const { invalidatePublished } = await import('../calculators/usePublished')

const renderShowcase = () =>
  render(
    <MemoryRouter>
      <CalculatorShowcase />
    </MemoryRouter>
  )

describe('CalculatorShowcase tracker cards', () => {
  it('shows one live card per published tracker, with its own description', async () => {
    getPublished.mockResolvedValue({
      ok: true,
      data: { published: ['fire', 'net-worth', 'income-expenses'] },
    })
    renderShowcase()
    await waitFor(() => expect(screen.getAllByText('Tracker · Live')).toHaveLength(2))

    const nw = UPCOMING_MAP['net-worth']
    const ie = UPCOMING_MAP['income-expenses']
    expect(screen.getByRole('link', { name: new RegExp(nw.label) })).toHaveAttribute(
      'href',
      '/app/net-worth'
    )
    expect(screen.getByRole('link', { name: new RegExp(ie.label) })).toHaveAttribute(
      'href',
      '/app/income-expenses'
    )
    expect(screen.getByText(nw.description)).toBeInTheDocument()
    expect(screen.getByText(ie.description)).toBeInTheDocument()
  })

  it('drops a tracker that is unpublished at runtime', async () => {
    getPublished.mockResolvedValue({ ok: true, data: { published: ['fire', 'net-worth'] } })
    // Module-level publish cache — refetch as an admin toggle would.
    await invalidatePublished()
    renderShowcase()
    await waitFor(() => expect(screen.getAllByText('Tracker · Live')).toHaveLength(1))
    expect(screen.queryByText(UPCOMING_MAP['income-expenses'].description)).toBeNull()
  })
})
