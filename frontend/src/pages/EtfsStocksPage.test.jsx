import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EtfsStocksPage from './EtfsStocksPage'

const auth = { isAuthenticated: true, user: { id: 1, is_superadmin: true } }

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/etfs-stocks']}>
      <EtfsStocksPage auth={auth} />
    </MemoryRouter>
  )

describe('EtfsStocksPage', () => {
  it('renders the hero, search, filter pills, and the preview banner', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Find any ETF or stock.' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search by name, ISIN or ticker…')).toBeInTheDocument()
    expect(screen.getByText(/Superadmin preview/)).toBeInTheDocument()
    for (const pill of [
      'Type: ETF',
      'Region: World',
      'TER: any',
      'Distribution: any',
      'Sort: Fund size',
    ]) {
      expect(screen.getByRole('button', { name: pill })).toBeInTheDocument()
    }
  })

  it('renders the category quick-links and the results header with live indicator', () => {
    renderPage()
    for (const title of ['World ETFs', 'US large-cap', 'Emerging markets', 'Dividend ETFs']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByText('2,847')).toBeInTheDocument()
    expect(screen.getByText('Live data')).toBeInTheDocument()
  })

  it('renders the placeholder results table with type pills and signed performance', () => {
    renderPage()
    expect(screen.getByText('Global All-Cap Equity ETF')).toBeInTheDocument()
    expect(screen.getByText('IE00BX47Q219')).toBeInTheDocument()
    expect(screen.getAllByText('Equity')).toHaveLength(6)
    expect(screen.getByText('Bond')).toBeInTheDocument()
    expect(screen.getByText('+14.2%')).toBeInTheDocument()
    expect(screen.getByText('−2.8%')).toBeInTheDocument() // rose, true minus sign
    expect(screen.getByRole('button', { name: 'Load more results' })).toBeInTheDocument()
    expect(screen.getByText(/illustrative placeholders/)).toBeInTheDocument()
  })

  it('cross-sells into the app', () => {
    renderPage()
    expect(screen.getByText('Found a fund? Model it.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open the calculators/ })).toHaveAttribute(
      'href',
      '/app'
    )
  })
})
