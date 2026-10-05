import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SnapshotManager from './SnapshotManager'

const snapshots = [
  {
    id: 1,
    snapshot_date: '2026-07-01',
    total_assets: 5000,
    total_liabilities: 2000,
    net_worth: 3000,
  },
  {
    id: 2,
    snapshot_date: '2026-07-14',
    total_assets: 4000,
    total_liabilities: 1000,
    net_worth: 3000,
  },
]

const ok = () => Promise.resolve({ success: true })

function setup(props = {}) {
  const onUpdate = vi.fn(ok)
  const onDelete = vi.fn(ok)
  render(
    <SnapshotManager snapshots={snapshots} onUpdate={onUpdate} onDelete={onDelete} {...props} />
  )
  return { onUpdate, onDelete }
}

describe('SnapshotManager', () => {
  it('renders nothing without snapshots', () => {
    const { container } = render(
      <SnapshotManager snapshots={[]} onUpdate={vi.fn()} onDelete={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists snapshots latest-first', () => {
    setup()
    const dates = screen.getAllByText(/2026-07-/).map((el) => el.textContent)
    expect(dates).toEqual(['2026-07-14', '2026-07-01'])
  })

  it('edit submits the corrected totals for the right snapshot', async () => {
    const { onUpdate } = setup()
    fireEvent.click(screen.getAllByLabelText('Edit snapshot')[0]) // 2026-07-14, id 2
    fireEvent.change(screen.getByLabelText('Total assets'), { target: { value: '204000' } })
    fireEvent.click(screen.getByLabelText('Save snapshot'))
    expect(onUpdate).toHaveBeenCalledWith(2, {
      snapshot_date: '2026-07-14',
      total_assets: '204000',
      total_liabilities: '1000',
    })
  })

  it('cancel edit restores the read row without calling onUpdate', () => {
    const { onUpdate } = setup()
    fireEvent.click(screen.getAllByLabelText('Edit snapshot')[0])
    fireEvent.click(screen.getByLabelText('Cancel edit'))
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Total assets')).not.toBeInTheDocument()
  })

  it('delete is two-step: first click arms, second click deletes', () => {
    const { onDelete } = setup()
    fireEvent.click(screen.getAllByLabelText('Delete snapshot')[1]) // 2026-07-01, id 1
    expect(onDelete).not.toHaveBeenCalled() // armed, not fired
    fireEvent.click(screen.getByText('Delete?'))
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('arming delete can be cancelled', () => {
    const { onDelete } = setup()
    fireEvent.click(screen.getAllByLabelText('Delete snapshot')[0])
    fireEvent.click(screen.getByText('Cancel'))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument()
  })
})
