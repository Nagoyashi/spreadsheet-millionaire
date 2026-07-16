import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ComparisonPage from './ComparisonPage'

const auth = { isAuthenticated: true, user: { id: 1, is_superadmin: true } }

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/comparison']}>
      <ComparisonPage auth={auth} />
    </MemoryRouter>
  )

describe('ComparisonPage', () => {
  it('renders the hero, the preview banner, and the above-the-fold affiliate disclosure', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Choose the right products.' })).toBeInTheDocument()
    expect(screen.getByText(/Superadmin preview/)).toBeInTheDocument()
    expect(screen.getByText(/Some links are affiliate links/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /how we rate/ })).toHaveAttribute(
      'href',
      '#how-we-rate'
    )
  })

  it('renders the four category tiles', () => {
    renderPage()
    for (const title of ['Online brokers', 'Savings accounts', 'Robo-advisors', 'Credit cards']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })

  it('renders the brokers table with the OUR PICK row treatment', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Best online brokers for ETF investors' })
    ).toBeInTheDocument()
    expect(screen.getByText('Updated July 2026')).toBeInTheDocument()
    expect(screen.getByText('Our pick')).toBeInTheDocument()
    for (const name of ['Alpine Invest', 'Nordbank Zero', 'Quantum Broker', 'EverTrade']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('affiliate link placeholders carry rel="sponsored nofollow"', () => {
    renderPage()
    const offers = screen.getAllByRole('link', { name: 'View offer' })
    expect(offers).toHaveLength(4)
    for (const link of offers) {
      expect(link).toHaveAttribute('rel', 'sponsored nofollow')
    }
  })

  it('renders the How we rate section', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'How we rate' })).toBeInTheDocument()
    for (const title of ['Real criteria', 'Independent ranking', 'Updated monthly']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })
})
