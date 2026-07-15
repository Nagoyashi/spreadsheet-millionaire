import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from './Hero'

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>
  )

describe('Hero', () => {
  it('renders the final headline, badge, and subline copy', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { name: /Understand your money\.\s*Plan what comes next\./ })
    ).toBeInTheDocument()
    expect(screen.getByText('Free while in beta · Open source')).toBeInTheDocument()
    expect(screen.getByText(/Twelve free, open-source calculators/)).toBeInTheDocument()
  })

  it('CTAs go straight to the app and to registration', () => {
    renderHero()
    expect(screen.getByRole('link', { name: /Try the calculators/ })).toHaveAttribute(
      'href',
      '/app'
    )
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute(
      'href',
      '/register'
    )
  })

  it('renders the trust row and the interactive app preview', () => {
    renderHero()
    for (const item of ['No signup required', 'No ads or trackers', 'Open source']) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
    // The preview's sidebar tabs are the interactive bit.
    expect(screen.getByRole('button', { name: 'Net worth' })).toBeInTheDocument()
  })
})
