import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const SUMMARY = {
  year: 2026,
  totals: { income: 5000, expense: 2000, net: 3000 },
  by_month: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 })),
  by_category: { income: {}, expense: {} },
  available_years: [2026],
}

const noop = () => Promise.resolve({ success: true })

vi.mock('../hooks/useIncomeExpenseData', () => ({
  useIncomeExpenseData: () => ({
    transactions: [
      { id: 1, type: 'expense', category: 'food', amount: 42, occurred_on: '2026-03-15', note: '' },
    ],
    summary: SUMMARY,
    filters: {},
    setFilters: () => {},
    loading: false,
    error: '',
    setError: () => {},
    addTransaction: noop,
    updateTransaction: noop,
    deleteTransaction: noop,
    saveMonth: noop,
    categories: [],
    addCategory: noop,
    setCategoryArchived: noop,
  }),
}))

// The Monthly-entry panel fetches its own month state on mount.
vi.mock('../api/incomeExpenseApi', () => ({
  incomeExpenseApi: {
    getMonth: () =>
      Promise.resolve({ ok: true, data: { cells: [], manual_sums: { income: {}, expense: {} } } }),
  },
}))

import IncomeExpensePage from './IncomeExpensePage'

function renderPage() {
  render(
    <MemoryRouter>
      <IncomeExpensePage auth={{ isAuthenticated: true, user: { email: 'test@example.com' } }} />
    </MemoryRouter>
  )
}

describe('IncomeExpensePage', () => {
  it('shows the sticky Net total from the summary', () => {
    renderPage()
    // $3,000 shows in the sticky bar and the dashboard Net card.
    expect(screen.getAllByText('$3,000').length).toBeGreaterThan(0)
  })

  it('defaults to the Overview cashflow dashboard', () => {
    renderPage()
    expect(screen.getByText('Cashflow — 2026')).toBeInTheDocument()
  })

  it('switches to the Monthly entry tab and renders the grid', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /monthly entry/i }))
    // Both category sections render once the month state loads.
    expect(await screen.findByLabelText('Salary')).toBeInTheDocument()
    expect(screen.getByLabelText('Housing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save month/i })).toBeInTheDocument()
  })

  it('switches to the Bulk upload tab and shows the coming-soon teaser', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /bulk upload/i }))
    expect(screen.getByText(/bulk upload — coming soon/i)).toBeInTheDocument()
    expect(screen.getByText(/PDF statement/i)).toBeInTheDocument()
  })

  it('switches to the Transactions tab and renders the panel', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /transactions/i }))
    // The mocked transaction row appears in the panel table (scope past the
    // form's category <option> that also reads "Food").
    const table = within(document.querySelector('table'))
    expect(table.getByText('Food')).toBeInTheDocument()
  })
})
