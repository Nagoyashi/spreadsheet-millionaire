import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CategoryManager from './CategoryManager'
import { CATEGORY_CONFIGS } from './categories'

const config = CATEGORY_CONFIGS.liquid
const ok = () => Promise.resolve({ success: true })

function setup(items = []) {
  const onAdd = vi.fn(ok)
  const onUpdate = vi.fn(ok)
  const onDelete = vi.fn(ok)
  render(
    <CategoryManager
      config={config}
      items={items}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
  return { onAdd, onUpdate, onDelete }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('CategoryManager', () => {
  it('renders a row per item with formatted values', () => {
    setup([{ id: 1, asset_type: 'cash', name: 'Checking', current_value: 1500, cost_basis: 1000 }])
    // Scope to the table — "Cash" also appears as a <select> option in the form.
    const table = within(document.querySelector('table'))
    expect(table.getByText('Checking')).toBeInTheDocument()
    expect(table.getByText('Cash')).toBeInTheDocument() // enum label
    expect(table.getByText('$1,500')).toBeInTheDocument() // money format
  })

  it('shows an empty state when there are no items', () => {
    setup([])
    expect(screen.getByText(/no liquid assets yet/i)).toBeInTheDocument()
  })

  it('submits a coerced payload via onAdd', async () => {
    const { onAdd } = setup([])
    const form = document.querySelector('form')
    // name (first textbox) + current_value (first spinbutton); asset_type defaults to 'cash'
    fireEvent.change(within(form).getAllByRole('textbox')[0], { target: { value: 'Savings' } })
    fireEvent.change(within(form).getAllByRole('spinbutton')[0], { target: { value: '2500' } })
    fireEvent.click(within(form).getByRole('button', { name: /add/i }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ asset_type: 'cash', name: 'Savings', current_value: 2500 })
    )
  })

  it('keeps the Add button disabled until required fields are filled', () => {
    setup([])
    const form = document.querySelector('form')
    expect(within(form).getByRole('button', { name: /add/i })).toBeDisabled()
    fireEvent.change(within(form).getAllByRole('textbox')[0], { target: { value: 'X' } })
    fireEvent.change(within(form).getAllByRole('spinbutton')[0], { target: { value: '1' } })
    expect(within(form).getByRole('button', { name: /add/i })).toBeEnabled()
  })

  it('deletes via onDelete after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onDelete } = setup([{ id: 7, asset_type: 'cash', name: 'Checking', current_value: 1 }])
    fireEvent.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledWith(7)
  })

  it('does not delete when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onDelete } = setup([{ id: 7, asset_type: 'cash', name: 'Checking', current_value: 1 }])
    fireEvent.click(screen.getByLabelText('Delete'))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('edit populates the form and submits via onUpdate', () => {
    const { onUpdate } = setup([
      { id: 9, asset_type: 'cash', name: 'Checking', current_value: 1500, cost_basis: 0 },
    ])
    fireEvent.click(screen.getByLabelText('Edit'))
    const form = document.querySelector('form')
    expect(within(form).getAllByRole('textbox')[0]).toHaveValue('Checking')
    fireEvent.click(within(form).getByRole('button', { name: /save changes/i }))
    expect(onUpdate).toHaveBeenCalledWith(9, expect.objectContaining({ name: 'Checking' }))
  })

  it('re-seeds the form when the instance is reused for another category', () => {
    // WealthPage keeps one CategoryManager across tab switches. Without the
    // re-seed, the liabilities form kept the liquid-assets field shape and the
    // Add button could never enable (prod bug, 2026-07-14).
    const { rerender } = render(
      <CategoryManager
        config={CATEGORY_CONFIGS.liquid}
        items={[]}
        onAdd={vi.fn(ok)}
        onUpdate={vi.fn(ok)}
        onDelete={vi.fn(ok)}
      />
    )
    const onAdd = vi.fn(ok)
    rerender(
      <CategoryManager
        config={CATEGORY_CONFIGS.liabilities}
        items={[]}
        onAdd={onAdd}
        onUpdate={vi.fn(ok)}
        onDelete={vi.fn(ok)}
      />
    )
    const form = document.querySelector('form')
    expect(within(form).getByText('Add liability')).toBeInTheDocument() // singular label, not "liabilitie"
    fireEvent.change(within(form).getAllByRole('textbox')[0], { target: { value: 'Visa' } })
    fireEvent.change(within(form).getAllByRole('spinbutton')[0], { target: { value: '2000' } })
    const addBtn = within(form).getByRole('button', { name: /add/i })
    expect(addBtn).toBeEnabled()
    fireEvent.click(addBtn)
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        liability_type: 'credit_card',
        name: 'Visa',
        current_balance: 2000,
      })
    )
  })
})
