import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Carousel from './Carousel'

// jsdom's window.innerWidth defaults to 1024 → perView = 3.
const items = Array.from({ length: 7 }, (_, i) => ({ id: i, label: `Item ${i}` }))
const renderItem = (it) => <div key={it.id}>{it.label}</div>

describe('Carousel', () => {
  it('renders every item and paginates (one dot per page)', () => {
    render(<Carousel label="things" items={items} renderItem={renderItem} />)
    for (let i = 0; i < 7; i++) {
      expect(screen.getByText(`Item ${i}`)).toBeInTheDocument()
    }
    // ceil(7 / 3) = 3 pages
    expect(screen.getAllByRole('button', { name: /go to page/i })).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('shows no controls when everything fits one page', () => {
    render(<Carousel label="things" items={items.slice(0, 2)} renderItem={renderItem} />)
    expect(screen.queryByRole('button', { name: /go to page/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })
})
