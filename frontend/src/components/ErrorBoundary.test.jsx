import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Boom() {
  throw new Error('boom')
}

describe('ErrorBoundary (#23)', () => {
  it('renders a recoverable fallback when a child throws, not a blank page', () => {
    // The thrown render logs via console.error (React + our componentDidCatch);
    // silence it so the test output stays clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/back to calculators/i)).toBeInTheDocument()
    spy.mockRestore()
  })

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })
})
