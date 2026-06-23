import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText(/total in 2026/)).toBeInTheDocument() // $5,000 annual total sub
    expect(screen.getByText('$3,000')).toBeInTheDocument() // net
    expect(screen.getByText('60.0%')).toBeInTheDocument() // savings rate 3000/5000
  })

  it('renders the chart sections', () => {
    render(<CashflowDashboard summary={SUMMARY} filters={{}} setFilters={vi.fn()} />)
    expect(screen.getByText('Monthly income vs. expense')).toBeInTheDocument()
    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('Housing')).toBeInTheDocument() // category legend
  })

  it('returns null without a summary', () => {
    const { container } = render(
      <CashflowDashboard summary={null} filters={{}} setFilters={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
