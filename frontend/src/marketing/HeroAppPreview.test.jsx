import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HeroAppPreview from './HeroAppPreview'

// The mockup's three views switch via the sidebar buttons (plain local state).
// ResizeObserver is stubbed in setupTests.js; jsdom widths make scale
// irrelevant here — we only assert view content and switching.

describe('HeroAppPreview', () => {
  it('shows the Compound Interest view by default', () => {
    render(<HeroAppPreview />)
    expect(screen.getByText('Compound Interest')).toBeInTheDocument()
    expect(screen.getByText('Final balance')).toBeInTheDocument()
    expect(screen.getByText('$641,200')).toBeInTheDocument()
    expect(screen.getByText('Autosaved')).toBeInTheDocument()
  })

  it('switches to the Net Worth view', () => {
    render(<HeroAppPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Net worth' }))
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
    expect(screen.getByText('Accounts')).toBeInTheDocument()
    expect(screen.getAllByText('$286,400').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Tracker')).toBeInTheDocument()
  })

  it('switches to the Income & Expenses view', () => {
    render(<HeroAppPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Income & expenses' }))
    expect(screen.getByText('Income & Expenses')).toBeInTheDocument()
    expect(screen.getByText('Top categories')).toBeInTheDocument()
    expect(screen.getAllByText('+$2,250').length).toBeGreaterThanOrEqual(1)
  })
})
