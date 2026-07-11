import { describe, it, expect, vi } from 'vitest'

// The test env sets no VITE_POSTHOG_KEY, so the key captured at module load is
// undefined and initPostHog() must be a no-op — the SDK never inits in dev/CI.
vi.mock('posthog-js', () => ({
  default: { init: vi.fn() },
}))

import posthog from 'posthog-js'
import { initPostHog } from './posthog'

describe('initPostHog — key gate', () => {
  it('does not initialise PostHog without VITE_POSTHOG_KEY', () => {
    initPostHog()
    expect(posthog.init).not.toHaveBeenCalled()
  })
})
