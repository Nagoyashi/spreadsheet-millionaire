import { describe, it, expect, vi } from 'vitest'

// The test env sets no VITE_SENTRY_DSN, so the DSN captured at module load is
// undefined and initSentry() must be a no-op — no third-party SDK ever inits in
// dev/CI. Mock the SDK so we can assert init is never called.
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
}))

import * as SentrySDK from '@sentry/react'
import { initSentry } from './sentry'

describe('initSentry — DSN gate', () => {
  it('does not initialise Sentry without VITE_SENTRY_DSN', () => {
    initSentry()
    expect(SentrySDK.init).not.toHaveBeenCalled()
  })
})
