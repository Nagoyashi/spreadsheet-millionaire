// Vitest setup — registers jest-dom matchers (toBeInTheDocument, etc.) for
// component tests. Wired via vite.config.js test.setupFiles.
import '@testing-library/jest-dom/vitest'

// recharts' ResponsiveContainer uses ResizeObserver, which jsdom doesn't
// implement. Stub it so chart components render in tests without crashing.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
