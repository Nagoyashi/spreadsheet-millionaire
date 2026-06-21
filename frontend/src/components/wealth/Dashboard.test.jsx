import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboard from './Dashboard'

const SUMMARY = {
  net_worth: 150000,
  total_assets: 408000,
  total_liabilities: 258000,
  total_cost_basis: 356000,
  lifetime_gain: 52000,
  categories: {
    liquid_assets: { total: 5000, count: 1 },
    investments: { total: 0, count: 0 },
    real_estate: { total: 400000, count: 1 },
    collectibles: { total: 3000, count: 1 },
    liabilities: { total: 258000, count: 2 },
  },
  assets_by_type: { cash: 5000, custom: 3000 },
}

describe('Dashboard', () => {
  it('renders the global summary figures and % return', () => {
    render(<Dashboard summary={SUMMARY} snapshots={[]} onSnapshot={vi.fn()} />)
    expect(screen.getByText('Global Financial Summary')).toBeInTheDocument()
    expect(screen.getByText('$150,000')).toBeInTheDocument() // net worth
    expect(screen.getByText(/14\.6% return/)).toBeInTheDocument() // 52000 / 356000
  })

  it('renders the chart sections', () => {
    render(<Dashboard summary={SUMMARY} snapshots={[]} onSnapshot={vi.fn()} />)
    expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Net Worth Over Time')).toBeInTheDocument()
  })

  it('prompts for a first snapshot when there is no history', () => {
    render(<Dashboard summary={SUMMARY} snapshots={[]} onSnapshot={vi.fn()} />)
    expect(screen.getByText(/no snapshots yet/i)).toBeInTheDocument()
  })

  it('fires onSnapshot when "Take snapshot" is clicked', () => {
    const onSnapshot = vi.fn(() => Promise.resolve({ success: true }))
    render(<Dashboard summary={SUMMARY} snapshots={[]} onSnapshot={onSnapshot} />)
    fireEvent.click(screen.getByRole('button', { name: /take snapshot/i }))
    expect(onSnapshot).toHaveBeenCalledTimes(1)
  })

  it('returns null without a summary', () => {
    const { container } = render(<Dashboard summary={null} snapshots={[]} onSnapshot={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
