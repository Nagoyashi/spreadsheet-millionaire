import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// The panel fetches its month state straight from the API module — mock it.
vi.mock('../../api/incomeExpenseApi', () => ({
  incomeExpenseApi: {
    getMonth: vi.fn(),
  },
}))

import { incomeExpenseApi } from '../../api/incomeExpenseApi'
import MonthlyEntryPanel from './MonthlyEntryPanel'

const EMPTY_MONTH = { cells: [], manual_sums: { income: {}, expense: {} } }

function mockMonth(data = EMPTY_MONTH) {
  incomeExpenseApi.getMonth.mockResolvedValue({ ok: true, data })
}

async function renderPanel({ onSaveMonth = vi.fn() } = {}) {
  render(<MonthlyEntryPanel availableYears={[2026]} onSaveMonth={onSaveMonth} />)
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
  return { onSaveMonth }
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
    expect(screen.getByLabelText('Food')).toHaveValue(420.5)
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
    fireEvent.click(screen.getByRole('button', { name: /save month/i }))

    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
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
    fireEvent.click(screen.getByRole('button', { name: /save month/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /save month/i }))
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
})
