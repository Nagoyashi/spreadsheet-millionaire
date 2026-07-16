import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GuidePage from './GuidePage'

const auth = { isAuthenticated: true, user: { id: 1, is_superadmin: true } }

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/guide']}>
      <GuidePage auth={auth} />
    </MemoryRouter>
  )

describe('GuidePage', () => {
  it('renders the hero, search, preview banner, and slim footer', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Learn how money actually works.' })
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search articles…')).toBeInTheDocument()
    expect(screen.getByText(/Superadmin preview/)).toBeInTheDocument()
    // Slim footer keeps the legal links
    for (const label of ['Privacy', 'Terms', 'Imprint']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('renders the featured article, article grid, videos, and newsletter band', () => {
    renderPage()
    expect(screen.getByText('The 15-minute guide to your first ETF')).toBeInTheDocument()
    expect(screen.getByText('Featured')).toBeInTheDocument()
    expect(screen.getByText('What is FIRE, really?')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Watch instead' })).toBeInTheDocument()
    expect(screen.getByText('ETFs in 10 minutes')).toBeInTheDocument()
    expect(screen.getByText('One useful email a month.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
  })

  it('category chips filter the placeholder articles client-side', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Debt' }))
    expect(screen.getByText('Avalanche vs snowball: pick your strategy')).toBeInTheDocument()
    // Featured (Investing) and other categories are filtered out
    expect(screen.queryByText('The 15-minute guide to your first ETF')).toBeNull()
    expect(screen.queryByText('What is FIRE, really?')).toBeNull()
    // Back to All restores everything
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('What is FIRE, really?')).toBeInTheDocument()
  })

  it('a category with no placeholder articles shows the empty state', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Taxes' }))
    expect(screen.getByText(/No articles here yet/)).toBeInTheDocument()
  })

  it('the search box filters by title and excerpt', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Search articles…'), {
      target: { value: 'emergency fund' },
    })
    expect(screen.getByText('How big should your emergency fund be?')).toBeInTheDocument()
    expect(screen.queryByText('What is FIRE, really?')).toBeNull()
  })
})
