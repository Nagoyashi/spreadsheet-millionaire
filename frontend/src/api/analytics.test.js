import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ANALYTICS_SESSION_KEY, ANALYTICS_ONCE_KEY } from '../constants'

// Mock the SDK wrapper so we can assert on capture()/identify() without a real
// PostHog client. __loaded=true simulates "a key was set and init ran"; the
// no-op-without-key gate itself is covered in posthog.test.js.
vi.mock('../posthog', () => ({
  posthog: {
    __loaded: true,
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}))

import { posthog } from '../posthog'
import { analytics } from './analytics'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('funnel events', () => {
  it('captures calculator_used with the calc type', () => {
    analytics.calculatorUsed('fire')
    expect(posthog.capture).toHaveBeenCalledWith('calculator_used', { calc_type: 'fire' })
  })

  it('captures account_created', () => {
    analytics.accountCreated()
    expect(posthog.capture).toHaveBeenCalledWith('account_created')
  })

  it('identifies with the user id as a string, never an email', () => {
    analytics.identify(42)
    expect(posthog.identify).toHaveBeenCalledWith('42')
  })

  it('ignores identify with no user id', () => {
    analytics.identify(null)
    expect(posthog.identify).not.toHaveBeenCalled()
  })

  it('captures the upgrade events with their source', () => {
    analytics.upgradeViewed('settings')
    analytics.upgradeClicked('settings')
    expect(posthog.capture).toHaveBeenCalledWith('upgrade_viewed', { source: 'settings' })
    expect(posthog.capture).toHaveBeenCalledWith('upgrade_clicked', { source: 'settings' })
  })
})

describe('trackerFirstEntry — one-shot per browser', () => {
  it('fires only once per tracker, then never again', () => {
    analytics.trackerFirstEntry('net-worth')
    analytics.trackerFirstEntry('net-worth')
    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith('tracker_first_entry', { tracker: 'net-worth' })
    expect(localStorage.getItem(ANALYTICS_ONCE_KEY('tracker_first_entry_net-worth'))).toBe('1')
  })

  it('tracks the two trackers independently', () => {
    analytics.trackerFirstEntry('net-worth')
    analytics.trackerFirstEntry('income-expenses')
    expect(posthog.capture).toHaveBeenCalledTimes(2)
  })
})

describe('trackSession — second_session on the 2nd distinct session', () => {
  it('does not fire on the first session', () => {
    analytics.trackSession()
    expect(posthog.capture).not.toHaveBeenCalled()
    const state = JSON.parse(localStorage.getItem(ANALYTICS_SESSION_KEY))
    expect(state.count).toBe(1)
  })

  it('fires exactly once when a second session begins after the gap', () => {
    // Session 1, ended 31 minutes ago.
    const longAgo = Date.now() - 31 * 60 * 1000
    localStorage.setItem(ANALYTICS_SESSION_KEY, JSON.stringify({ last: longAgo, count: 1 }))

    analytics.trackSession()
    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith('second_session')

    // A reload within the gap is the same session — no re-fire.
    analytics.trackSession()
    expect(posthog.capture).toHaveBeenCalledTimes(1)
  })

  it('does not fire a third session', () => {
    const longAgo = Date.now() - 31 * 60 * 1000
    localStorage.setItem(ANALYTICS_SESSION_KEY, JSON.stringify({ last: longAgo, count: 2 }))
    analytics.trackSession()
    expect(posthog.capture).not.toHaveBeenCalled()
  })
})
