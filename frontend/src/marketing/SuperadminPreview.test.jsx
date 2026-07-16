import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SuperadminPreview, { SuperadminPreviewBanner } from './SuperadminPreview'
import GuidePage from '../pages/GuidePage'
import MarketingComingSoonPage from '../pages/MarketingComingSoonPage'

const anonymous = { isAuthenticated: false, user: null }
const normalUser = { isAuthenticated: true, user: { id: 1, email: 'a@b.c', is_superadmin: false } }
// A plain admin is NOT enough — the preview is superadmin-only.
const admin = {
  isAuthenticated: true,
  user: { id: 2, email: 'admin@b.c', is_admin: true, is_superadmin: false },
}
const superadmin = {
  isAuthenticated: true,
  user: { id: 3, email: 'root@b.c', is_admin: true, is_superadmin: true },
}

// Mirrors the real wiring in App.jsx: the draft Guide page as preview, the
// existing coming-soon page as fallback.
const renderGated = (auth) =>
  render(
    <MemoryRouter initialEntries={['/guide']}>
      <SuperadminPreview
        auth={auth}
        preview={<GuidePage auth={auth} />}
        fallback={<MarketingComingSoonPage auth={auth} title="Guide" blurb="On the way." />}
      />
    </MemoryRouter>
  )

describe('SuperadminPreview', () => {
  it('an anonymous visitor sees the coming-soon page, not the draft', () => {
    renderGated(anonymous)
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Guide' })).toBeInTheDocument()
    expect(screen.queryByText('Learn how money actually works.')).toBeNull()
    expect(screen.queryByText(/Superadmin preview/)).toBeNull()
  })

  it('a normal logged-in user sees the coming-soon page', () => {
    renderGated(normalUser)
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
    expect(screen.queryByText('Learn how money actually works.')).toBeNull()
  })

  it('a plain admin (not superadmin) still sees the coming-soon page', () => {
    renderGated(admin)
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
    expect(screen.queryByText('Learn how money actually works.')).toBeNull()
  })

  it('a superadmin sees the new page plus the preview banner', () => {
    renderGated(superadmin)
    expect(
      screen.getByRole('heading', { name: 'Learn how money actually works.' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Superadmin preview — public visitors still see the coming-soon page.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).toBeNull()
  })
})

describe('SuperadminPreviewBanner', () => {
  it('renders the exact warning copy', () => {
    render(<SuperadminPreviewBanner />)
    expect(
      screen.getByText('Superadmin preview — public visitors still see the coming-soon page.')
    ).toBeInTheDocument()
  })
})
