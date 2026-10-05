import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecurringPanel from './RecurringPanel'

const transactions = [
  {
    id: 1,
    type: 'income',
    category: 'salary',
    amount: 3000,
    occurred_on: '2026-07-01',
    recurrence_unit: 'month',
    recurrence_interval: 1,
  },
  {
    id: 2,
    type: 'expense',
    category: 'rent',
    amount: 1450,
    occurred_on: '2026-07-03',
    recurrence_unit: 'month',
    recurrence_interval: 1,
    note: 'flat',
  },
  {
    id: 3,
    type: 'expense',
    category: 'groceries',
    amount: 120,
    occurred_on: '2026-07-10',
    recurrence_unit: 'none',
    recurrence_interval: 1,
  },
]

const ok = () => Promise.resolve({ success: true })

function setup() {
  const onUpdate = vi.fn(ok)
  const onEdit = vi.fn()
  render(<RecurringPanel transactions={transactions} onUpdate={onUpdate} onEdit={onEdit} />)
  return { onUpdate, onEdit }
}

describe('RecurringPanel', () => {
  it('renders nothing when no transaction recurs', () => {
    const { container } = render(
      <RecurringPanel transactions={[transactions[2]]} onUpdate={vi.fn()} onEdit={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists only recurring rules with cadence and next occurrence', () => {
    setup()
    expect(screen.getByText('2 active rules')).toBeInTheDocument()
    expect(screen.getByText('salary')).toBeInTheDocument()
    expect(screen.getByText('rent')).toBeInTheDocument()
    expect(screen.queryByText('groceries')).not.toBeInTheDocument() // one-off filtered out
    expect(screen.getAllByText('Monthly')).toHaveLength(2)
    expect(screen.getAllByText(/^next \d{4}-\d{2}-\d{2}$/)).toHaveLength(2)
  })

  it('edit hands the transaction to onEdit', () => {
    const { onEdit } = setup()
    fireEvent.click(screen.getAllByLabelText('Edit recurring transaction')[0])
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ recurrence_unit: 'month' }))
  })

  it('stop is two-step and resets the rule to a one-off', () => {
    const { onUpdate } = setup()
    // Rows sort latest-anchor-first: index 0 is rent (id 2, 2026-07-03).
    fireEvent.click(screen.getAllByLabelText('Stop recurring transaction')[0])
    expect(onUpdate).not.toHaveBeenCalled() // armed only
    fireEvent.click(screen.getByText('Stop repeating?'))
    expect(onUpdate).toHaveBeenCalledWith(2, { recurrence_unit: 'none', recurrence_interval: 1 })
  })

  it('arming stop can be cancelled', () => {
    const { onUpdate } = setup()
    fireEvent.click(screen.getAllByLabelText('Stop recurring transaction')[0])
    fireEvent.click(screen.getByText('Cancel'))
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByText('Stop repeating?')).not.toBeInTheDocument()
  })
})
