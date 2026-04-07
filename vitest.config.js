import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      thresholds: {
        statements: 3.48,
        branches: 2.83,
        functions: 2.36,
        lines: 3.46,
        failWhenThresholdNotMet: true,
      },
    },
  },
})
