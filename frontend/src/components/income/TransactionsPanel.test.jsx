import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import TransactionsPanel from './TransactionsPanel'

const ok = () => Promise.resolve({ success: true })

function setup(transactions = [], over = {}) {
  const onAdd = vi.fn(ok)
  const onUpdate = vi.fn(ok)
  const onDelete = vi.fn(ok)
  const setFilters = vi.fn()
  render(
    <TransactionsPanel
      transactions={transactions}
      filters={{}}
      setFilters={setFilters}
      availableYears={[2026, 2025]}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      {...over}
    />
  )
  return { onAdd, onUpdate, onDelete, setFilters }
}

const form = () => document.querySelector('form')

beforeEach(() => vi.restoreAllMocks())

describe('TransactionsPanel', () => {
  it('renders a row per transaction with a signed amount', () => {
    setup([
      {
        id: 1,
        type: 'income',
        category: 'salary',
        amount: 5000,
        occurred_on: '2026-01-31',
        note: 'Jan pay',
      },
    ])
    const table = within(document.querySelector('table'))
    expect(table.getByText('Salary')).toBeInTheDocument()
    expect(table.getByText('+$5,000')).toBeInTheDocument()
  })

  it('empty state when there are no transactions', () => {
    setup([])
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
  })

  it('badges aggregate rows from the Monthly entry grid, not manual rows', () => {
    setup([
      {
        id: 1,
        type: 'expense',
        category: 'food',
        amount: 400,
        occurred_on: '2026-03-01',
        note: '',
        source: 'monthly',
      },
      {
        id: 2,
        type: 'expense',
        category: 'food',
        amount: 12,
        occurred_on: '2026-03-15',
        note: '',
        source: 'manual',
      },
    ])
    // Exactly one badge — on the aggregate row only.
    expect(screen.getAllByText('Monthly entry')).toHaveLength(1)
  })

  it('category options follow the selected type', () => {
    setup([])
    const [typeSelect, categorySelect] = within(form()).getAllByRole('combobox')
    // Default type is expense → expense categories.
    expect(within(categorySelect).getByRole('option', { name: 'Housing' })).toBeInTheDocument()
    fireEvent.change(typeSelect, { target: { value: 'income' } })
    expect(within(categorySelect).getByRole('option', { name: 'Salary' })).toBeInTheDocument()
    expect(
      within(categorySelect).queryByRole('option', { name: 'Housing' })
    ).not.toBeInTheDocument()
  })

  it('submits a coerced payload via onAdd', () => {
    const { onAdd } = setup([])
    fireEvent.change(within(form()).getByRole('spinbutton'), { target: { value: '100' } })
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: '2026-05-01' },
    })
    fireEvent.click(within(form()).getByRole('button', { name: /add/i }))
    expect(onAdd).toHaveBeenCalledWith({
      type: 'expense',
      category: 'housing',
      amount: 100,
      occurred_on: '2026-05-01',
      recurrence_unit: 'none',
      recurrence_interval: 1,
    })
  })

  it('submits a recurrence rule when set', () => {
    const { onAdd } = setup([])
    fireEvent.change(within(form()).getByRole('spinbutton'), { target: { value: '100' } })
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: '2026-05-01' },
    })
    // The 3rd combobox in the form is the Repeat unit selector.
    const repeat = within(form()).getAllByRole('combobox')[2]
    fireEvent.change(repeat, { target: { value: 'week' } })
    // The interval number input appears once it repeats.
    fireEvent.change(within(form()).getByDisplayValue('1'), { target: { value: '2' } })
    fireEvent.click(within(form()).getByRole('button', { name: /add/i }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence_unit: 'week', recurrence_interval: 2 })
    )
  })

  it('keeps Add disabled until amount and date are set', () => {
    setup([])
    expect(within(form()).getByRole('button', { name: /add/i })).toBeDisabled()
    fireEvent.change(within(form()).getByRole('spinbutton'), { target: { value: '5' } })
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: '2026-05-01' },
    })
    expect(within(form()).getByRole('button', { name: /add/i })).toBeEnabled()
  })

  it('deletes after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onDelete } = setup([
      { id: 7, type: 'expense', category: 'food', amount: 12, occurred_on: '2026-02-01' },
    ])
    fireEvent.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledWith(7)
  })

  it('year filter calls setFilters', () => {
    const { setFilters } = setup([])
    // First select in the document is the year filter.
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: '2025' } })
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ year: 2025 }))
  })
})
