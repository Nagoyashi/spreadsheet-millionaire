import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import CashflowDashboard from './CashflowDashboard'

const SUMMARY = {
  year: 2026,
  totals: { income: 5000, expense: 2000, net: 3000 },
  by_month: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: i === 0 ? 5000 : 0,
    expense: i === 0 ? 1500 : i === 1 ? 500 : 0,
  })),
  by_category: { income: { salary: 5000 }, expense: { housing: 1500, food: 500 } },
  available_years: [2026, 2025],
}

describe('CashflowDashboard', () => {
  it('renders totals and the savings rate', () => {
    render(<CashflowDashboard summary={SUMMARY} filters={{}} setFilters={vi.fn()} />)
    expect(screen.getByText('Cashflow — 2026')).toBeInTheDocument()
    // Income card shows per-month income (avg over the 2 active months: [5000, 0] → 2500).
    expect(screen.getByText('$2,500')).toBeInTheDocument()
    expect(screen.getAllByText(/total in 2026/)).toHaveLength(2) // income + expense annual subs
    expect(screen.getByText('$3,000')).toBeInTheDocument() // net
    expect(screen.getByText('60.0%')).toBeInTheDocument() // savings rate 3000/5000
  })

  it('renders the chart sections', () => {
    render(<CashflowDashboard summary={SUMMARY} filters={{}} setFilters={vi.fn()} />)
    expect(screen.getByText('Monthly income vs. expense')).toBeInTheDocument()
    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('Housing')).toBeInTheDocument() // category legend
  })

  it('offers a window of selectable years even with data in a single year', () => {
    render(<CashflowDashboard summary={SUMMARY} filters={{}} setFilters={vi.fn()} />)
    const yearSelect = screen.getAllByRole('combobox')[0] // first select = year
    const years = within(yearSelect)
      .getAllByRole('option')
      .map((o) => Number(o.value))
    // available_years alone would be a single option — the window guarantees
    // there is always something to switch to (regression: "can't select year").
    expect(years.length).toBeGreaterThan(1)
    const current = new Date().getFullYear()
    expect(years).toContain(current)
    expect(years).toContain(current - 1)
  })

  it('returns null without a summary', () => {
    const { container } = render(
      <CashflowDashboard summary={null} filters={{}} setFilters={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('CashflowDashboard — v0.15.2 additions', () => {
  it('the Avg/Median toggle drives BOTH per-month cards', () => {
    render(<CashflowDashboard summary={SUMMARY} filters={{}} setFilters={vi.fn()} />)
    // Two active months (Jan, Feb): income avg = 2500, expense avg = 1000.
    expect(screen.getByText('$2,500')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Median' }))
    // Medians of [5000, 0] and [1500, 500].
    expect(screen.getByText('$2,500')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
    expect(screen.getByText('Expenses / month')).toBeInTheDocument()
  })

  it('the pie toggles to income by category', () => {
    render(<CashflowDashboard summary={SUMMARY} filters={{}} setFilters={vi.fn()} />)
    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Income' }))
    expect(screen.getByText('Income by category')).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
  })

  it('explains a forecast-only month instead of a bare "no data"', () => {
    const txns = [
      {
        id: 1,
        type: 'expense',
        category: 'housing',
        amount: 750,
        occurred_on: '2026-01-01',
        recurrence_unit: 'month',
        recurrence_interval: 1,
      },
    ]
    render(
      <CashflowDashboard summary={SUMMARY} transactions={txns} filters={{}} setFilters={vi.fn()} />
    )
    // October has no recorded rows but the recurring rule projects into it.
    const monthSelect = screen.getAllByRole('combobox')[1] // year select is first
    fireEvent.change(monthSelect, { target: { value: '10' } })
    expect(screen.getByText(/projections from your recurring transactions/)).toBeInTheDocument()
  })
})
