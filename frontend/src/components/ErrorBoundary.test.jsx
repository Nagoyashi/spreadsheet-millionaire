import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'
import { Sentry } from '../sentry'

// Report render crashes to Sentry (no-op without a DSN); assert we call it.
vi.mock('../sentry', () => ({
  Sentry: { captureException: vi.fn() },
}))

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

  it('reports the render error to Sentry with the component stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    Sentry.captureException.mockClear()
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    const [error, ctx] = Sentry.captureException.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('boom')
    expect(ctx.contexts.react).toHaveProperty('componentStack')
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
