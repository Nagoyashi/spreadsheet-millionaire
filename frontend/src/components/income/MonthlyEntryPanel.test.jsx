import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// The panel fetches its month state straight from the API module — mock it.
vi.mock('../../api/incomeExpenseApi', () => ({
  incomeExpenseApi: {
    getMonth: vi.fn(),
  },
}))

import { incomeExpenseApi } from '../../api/incomeExpenseApi'
import { CATEGORY_OPTIONS } from './incomeExpenseOptions'
import MonthlyEntryPanel from './MonthlyEntryPanel'

const EMPTY_MONTH = { cells: [], manual_sums: { income: {}, expense: {} } }

// The default seed, shaped like GET /categories rows.
let _id = 0
const DEFAULT_CATS = ['expense', 'income'].flatMap((type) =>
  CATEGORY_OPTIONS[type].map((o) => ({
    id: ++_id,
    type,
    key: o.value,
    name: o.label,
    archived: false,
  }))
)

function mockMonth(data = EMPTY_MONTH) {
  incomeExpenseApi.getMonth.mockResolvedValue({ ok: true, data })
}

async function renderPanel({
  onSaveMonth = vi.fn(),
  onAddCategory = vi.fn().mockResolvedValue({ success: true }),
  onSetCategoryArchived = vi.fn().mockResolvedValue({ success: true }),
  categories = DEFAULT_CATS,
} = {}) {
  render(
    <MonthlyEntryPanel
      availableYears={[2026]}
      categories={categories}
      onSaveMonth={onSaveMonth}
      onAddCategory={onAddCategory}
      onSetCategoryArchived={onSetCategoryArchived}
    />
  )
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
  return { onSaveMonth, onAddCategory, onSetCategoryArchived }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MonthlyEntryPanel', () => {
  it('renders every income and expense category as an input', async () => {
    mockMonth()
    await renderPanel()
    // Income section (6) + expense section (9): spot-check both ends.
    expect(screen.getByLabelText('Salary')).toBeInTheDocument()
    expect(screen.getByLabelText('Housing')).toBeInTheDocument()
    // 'Other' exists in both sections.
    expect(screen.getAllByLabelText('Other')).toHaveLength(2)
  })

  it('prefills existing cells and shows manual sums read-only', async () => {
    mockMonth({
      cells: [{ type: 'expense', category: 'food', amount: 420.5 }],
      manual_sums: { income: {}, expense: { food: 15 } },
    })
    await renderPanel()
    expect(screen.getByLabelText('Food')).toHaveValue('420.5')
    expect(screen.getByText(/\$15 already tracked as individual transactions/)).toBeInTheDocument()
  })

  it('computes running section totals and net from typed amounts', async () => {
    mockMonth()
    await renderPanel()
    fireEvent.change(screen.getByLabelText('Salary'), { target: { value: '3000' } })
    fireEvent.change(screen.getByLabelText('Food'), { target: { value: '400' } })
    fireEvent.change(screen.getByLabelText('Housing'), { target: { value: '600' } })
    // Income 3,000 − expenses 1,000 = net 2,000.
    expect(screen.getByText('$2,000')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
  })

  it('saves only non-empty cells and shows the saved state', async () => {
    mockMonth()
    const onSaveMonth = vi.fn().mockResolvedValue({ success: true, data: EMPTY_MONTH })
    await renderPanel({ onSaveMonth })

    fireEvent.change(screen.getByLabelText('Salary'), { target: { value: '3000' } })
    fireEvent.change(screen.getByLabelText('Food'), { target: { value: '400' } })
    fireEvent.click(screen.getAllByRole('button', { name: /save month/i })[0])

    await waitFor(() => expect(screen.getAllByText('Saved').length).toBeGreaterThan(0))
    const now = new Date()
    expect(onSaveMonth).toHaveBeenCalledWith(now.getFullYear(), now.getMonth() + 1, [
      { type: 'income', category: 'salary', amount: 3000 },
      { type: 'expense', category: 'food', amount: 400 },
    ])
  })

  it('a cleared field is omitted from the save (clears the cell)', async () => {
    mockMonth({
      cells: [{ type: 'expense', category: 'food', amount: 100 }],
      manual_sums: { income: {}, expense: {} },
    })
    const onSaveMonth = vi.fn().mockResolvedValue({ success: true, data: EMPTY_MONTH })
    await renderPanel({ onSaveMonth })

    fireEvent.change(screen.getByLabelText('Food'), { target: { value: '' } })
    fireEvent.click(screen.getAllByRole('button', { name: /save month/i })[0])
    await waitFor(() => expect(onSaveMonth).toHaveBeenCalled())
    expect(onSaveMonth.mock.calls[0][2]).toEqual([])
  })

  it('refetches when the month selection changes', async () => {
    mockMonth()
    await renderPanel()
    expect(incomeExpenseApi.getMonth).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '1' } })
    await waitFor(() => expect(incomeExpenseApi.getMonth).toHaveBeenCalledTimes(2))
    expect(incomeExpenseApi.getMonth).toHaveBeenLastCalledWith(new Date().getFullYear(), 1)
  })

  it('surfaces a save failure', async () => {
    mockMonth()
    const onSaveMonth = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Could not reach the server.' })
    await renderPanel({ onSaveMonth })
    fireEvent.click(screen.getAllByRole('button', { name: /save month/i })[0])
    await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeInTheDocument())
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('Enter advances focus to the next amount field', async () => {
    mockMonth()
    await renderPanel()
    const salary = screen.getByLabelText('Salary')
    salary.focus()
    fireEvent.keyDown(salary, { key: 'Enter' })
    expect(document.activeElement).not.toBe(salary)
    expect(document.activeElement.tagName).toBe('INPUT')
  })

  // Categories — add / archive / restore (v0.15.1)
  it('adds a category via the inline form', async () => {
    mockMonth()
    const { onAddCategory } = await renderPanel()
    fireEvent.change(screen.getByLabelText('New expense category name'), {
      target: { value: 'Strom + Gas' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]) // expense section
    await waitFor(() => expect(onAddCategory).toHaveBeenCalledWith('expense', 'Strom + Gas'))
  })

  it('archives a category from its row', async () => {
    mockMonth()
    const { onSetCategoryArchived } = await renderPanel()
    fireEvent.click(screen.getByLabelText('Archive Housing'))
    const housing = DEFAULT_CATS.find((c) => c.key === 'housing')
    await waitFor(() => expect(onSetCategoryArchived).toHaveBeenCalledWith(housing.id, true))
  })

  it('archived categories drop out of the grid and restore from the Archived list', async () => {
    mockMonth({
      cells: [{ type: 'expense', category: 'housing', amount: 750 }],
      manual_sums: { income: {}, expense: {} },
    })
    const categories = DEFAULT_CATS.map((c) => (c.key === 'housing' ? { ...c, archived: true } : c))
    const { onSetCategoryArchived } = await renderPanel({ categories })
    // No input for an archived category — its saved amount shows read-only...
    expect(screen.queryByLabelText('Housing')).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /archived \(1\)/i })
    fireEvent.click(toggle) // collapsed by default (v0.15.2)
    expect(screen.getByText('$750')).toBeInTheDocument()
    // ...and it never lands in the save payload (backend preserves its rows).
    fireEvent.click(screen.getByLabelText('Restore Housing'))
    const housing = DEFAULT_CATS.find((c) => c.key === 'housing')
    await waitFor(() => expect(onSetCategoryArchived).toHaveBeenCalledWith(housing.id, false))
  })

  it('an archived category is excluded from the save payload', async () => {
    mockMonth({
      cells: [{ type: 'expense', category: 'housing', amount: 750 }],
      manual_sums: { income: {}, expense: {} },
    })
    const categories = DEFAULT_CATS.map((c) => (c.key === 'housing' ? { ...c, archived: true } : c))
    const onSaveMonth = vi.fn().mockResolvedValue({ success: true, data: EMPTY_MONTH })
    await renderPanel({ categories, onSaveMonth })
    fireEvent.change(screen.getByLabelText('Food'), { target: { value: '400' } })
    fireEvent.click(screen.getAllByRole('button', { name: /save month/i })[0])
    await waitFor(() => expect(onSaveMonth).toHaveBeenCalled())
    expect(onSaveMonth.mock.calls[0][2]).toEqual([
      { type: 'expense', category: 'food', amount: 400 },
    ])
  })
})

describe('MonthlyEntryPanel — v0.15.2 additions', () => {
  const now = new Date()
  const recurringTxn = {
    id: 99,
    type: 'income',
    category: 'salary',
    amount: 3000,
    // Anchored in the previous year so every month of the current year projects.
    occurred_on: `${now.getFullYear() - 1}-01-15`,
    recurrence_unit: 'month',
    recurrence_interval: 1,
  }

  it('shows recurring projections read-only and applies them to empty fields', async () => {
    mockMonth()
    render(
      <MonthlyEntryPanel
        availableYears={[now.getFullYear()]}
        categories={DEFAULT_CATS}
        transactions={[recurringTxn]}
        onSaveMonth={vi.fn()}
        onAddCategory={vi.fn()}
        onSetCategoryArchived={vi.fn()}
        onRenameCategory={vi.fn()}
        onReorderCategories={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
    // Read-only note on the category, and the banner with the Apply button.
    expect(screen.getByText(/\+ \$3,000 recurring/)).toBeInTheDocument()
    expect(screen.getByLabelText('Salary')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: /apply recurring/i }))
    expect(screen.getByLabelText('Salary')).toHaveValue('3000')
  })

  it('renames a category through the inline editor', async () => {
    mockMonth()
    const onRenameCategory = vi.fn().mockResolvedValue({ success: true })
    render(
      <MonthlyEntryPanel
        availableYears={[2026]}
        categories={DEFAULT_CATS}
        transactions={[]}
        onSaveMonth={vi.fn()}
        onAddCategory={vi.fn()}
        onSetCategoryArchived={vi.fn()}
        onRenameCategory={onRenameCategory}
        onReorderCategories={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Rename Food'))
    const input = screen.getByLabelText('Rename Food', { selector: 'input' })
    fireEvent.change(input, { target: { value: 'Lebensmittel' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const food = DEFAULT_CATS.find((c) => c.key === 'food')
    await waitFor(() => expect(onRenameCategory).toHaveBeenCalledWith(food.id, 'Lebensmittel'))
  })

  it('replaces the add form with a warning at the category cap', async () => {
    mockMonth()
    let id = 100
    const packed = [
      ...DEFAULT_CATS,
      ...Array.from({ length: 11 }, (_, i) => ({
        id: ++id,
        type: 'expense',
        key: `extra-${i}`,
        name: `Extra ${i}`,
        archived: false,
      })),
    ] // 9 + 11 = 20 active expense categories
    await renderPanel({ categories: packed })
    expect(screen.getByText(/reached the maximum of 20 categories/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('New expense category name')).not.toBeInTheDocument()
    // Income is under its own cap — its add form stays.
    expect(screen.getByLabelText('New income category name')).toBeInTheDocument()
  })

  it('offers Save month at the top and the bottom', async () => {
    mockMonth()
    await renderPanel()
    expect(screen.getAllByRole('button', { name: /save month/i })).toHaveLength(2)
  })
})
