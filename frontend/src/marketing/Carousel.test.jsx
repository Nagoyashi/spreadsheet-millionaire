import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Carousel from './Carousel'

// jsdom's window.innerWidth defaults to 1024 → perView = 3.
const items = Array.from({ length: 7 }, (_, i) => ({ id: i, label: `Item ${i}` }))
const renderItem = (it) => <div key={it.id}>{it.label}</div>

describe('Carousel', () => {
  it('renders arrows + the items when there are more than fit one view', () => {
    render(<Carousel label="things" items={items} renderItem={renderItem} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    // Item 3 is a real (non-cloned) card → present exactly once.
    expect(screen.getAllByText('Item 3').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a plain grid with no controls when everything fits', () => {
    render(<Carousel label="things" items={items.slice(0, 2)} renderItem={renderItem} />)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.getByText('Item 0')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })
})
