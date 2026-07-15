import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MarketingNav from './MarketingNav'

const renderNav = (auth) =>
  render(
    <MemoryRouter>
      <MarketingNav auth={auth} />
    </MemoryRouter>
  )

describe('MarketingNav', () => {
  it('renders the four centered sections + the wordmark link home', () => {
    renderNav({ isAuthenticated: false })
    for (const label of ['Guide', 'Calculators', 'Comparison', 'ETFs and Stocks']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByLabelText('SpreadsheetMillionaire home')).toHaveAttribute('href', '/')
  })

  it('Calculators links to the app', () => {
    renderNav({ isAuthenticated: false })
    expect(screen.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/app')
  })

  it('Login App is a non-clickable button revealing Login + Register links', () => {
    renderNav({ isAuthenticated: false })
    const trigger = screen.getByText('Login App')
    expect(trigger.tagName).toBe('BUTTON') // not an <a> — never navigates
    expect(trigger.closest('a')).toBeNull()
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register')
  })

  it('an authenticated visitor sees Open app instead of Login App', () => {
    renderNav({ isAuthenticated: true })
    expect(screen.getByRole('link', { name: 'Open app' })).toHaveAttribute('href', '/app')
    expect(screen.queryByText('Login App')).toBeNull()
  })
})
