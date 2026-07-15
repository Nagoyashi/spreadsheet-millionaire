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
    fireEvent.change(within(form()).getByLabelText('Amount'), { target: { value: '100' } })
    fireEvent.change(form().querySelector('input[type="date"]'), {
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
    fireEvent.change(within(form()).getByLabelText('Amount'), { target: { value: '100' } })
    fireEvent.change(form().querySelector('input[type="date"]'), {
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
    fireEvent.change(within(form()).getByLabelText('Amount'), { target: { value: '5' } })
    fireEvent.change(form().querySelector('input[type="date"]'), {
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

describe('TransactionsPanel — v0.15.2 additions', () => {
  const many = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      type: 'expense',
      category: 'food',
      amount: i + 1,
      occurred_on: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
      note: '',
    }))

  it('paginates at 30 rows per page', () => {
    setup(many(31))
    expect(document.querySelectorAll('tbody tr')).toHaveLength(30)
    expect(screen.getByText(/31 transactions · page 1 of 2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
  })

  it('filter changes snap back to page 1', () => {
    setup(many(31))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    // Amount filter shrinks the set below one page — page resets.
    fireEvent.change(screen.getByLabelText('Minimum amount'), { target: { value: '30' } })
    // 2 matching rows fit one page — if the page hadn't snapped back to 1,
    // the slice for page 2 would be empty.
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2)
  })

  it('filters by category and by amount range', () => {
    const cats = [
      { id: 1, type: 'expense', key: 'food', name: 'Food', archived: false },
      { id: 2, type: 'expense', key: 'housing', name: 'Housing', archived: false },
    ]
    setup(
      [
        {
          id: 1,
          type: 'expense',
          category: 'food',
          amount: 10,
          occurred_on: '2026-03-01',
          note: '',
        },
        {
          id: 2,
          type: 'expense',
          category: 'housing',
          amount: 900,
          occurred_on: '2026-03-02',
          note: '',
        },
      ],
      { categories: cats }
    )
    fireEvent.change(screen.getByLabelText('Category filter'), { target: { value: 'housing' } })
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Category filter'), { target: { value: 'all' } })
    fireEvent.change(screen.getByLabelText('Maximum amount'), { target: { value: '100' } })
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
  })

  it('filters by a date range (comma decimals accepted in amount filters)', () => {
    setup([
      {
        id: 1,
        type: 'expense',
        category: 'food',
        amount: 10.5,
        occurred_on: '2026-03-01',
        note: '',
      },
      { id: 2, type: 'expense', category: 'food', amount: 20, occurred_on: '2026-06-15', note: '' },
    ])
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-05-01' } })
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Minimum amount'), { target: { value: '10,6' } })
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
  })

  it('renders the form above the table', () => {
    setup(many(2))
    const formEl = document.querySelector('form')
    const tableEl = document.querySelector('table')
    expect(formEl.compareDocumentPosition(tableEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
