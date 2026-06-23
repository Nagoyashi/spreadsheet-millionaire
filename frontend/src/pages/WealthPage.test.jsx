import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the data hook so the page renders without network/auth.
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

const noop = () => Promise.resolve({ success: true })

vi.mock('../hooks/useNetWorthData', () => ({
  useNetWorthData: () => ({
    assets: [
      { id: 1, asset_type: 'cash', name: 'Checking', current_value: 5000 },
      { id: 2, asset_type: 'custom', name: 'Watch', current_value: 3000 },
    ],
    liabilities: [],
    investments: [],
    properties: [],
    summary: SUMMARY,
    snapshots: [],
    loading: false,
    error: '',
    setError: () => {},
    addAsset: noop,
    updateAsset: noop,
    deleteAsset: noop,
    addLiability: noop,
    updateLiability: noop,
    deleteLiability: noop,
    addInvestment: noop,
    updateInvestment: noop,
    deleteInvestment: noop,
    addProperty: noop,
    updateProperty: noop,
    deleteProperty: noop,
    createSnapshot: noop,
  }),
}))

import WealthPage from './WealthPage'

function renderPage() {
  render(
    <MemoryRouter>
      <WealthPage auth={{ isAuthenticated: true, user: { email: 'test@example.com' } }} />
    </MemoryRouter>
  )
}

describe('WealthPage', () => {
  it('shows the sticky summary bar with the net worth from the summary', () => {
    renderPage()
    expect(screen.getAllByText('$150,000').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Net Worth' })).toBeInTheDocument()
  })

  it('defaults to the Overview dashboard', () => {
    renderPage()
    expect(screen.getByText('Global Financial Summary')).toBeInTheDocument()
  })

  it('switches to a category tab and renders its manager', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /liquid assets/i }))
    // The liquid asset row from the mocked data shows in the manager table.
    expect(screen.getByText('Checking')).toBeInTheDocument()
    // ...and the collectible is filtered out of the Liquid tab.
    expect(screen.queryByText('Watch')).not.toBeInTheDocument()
  })
})
