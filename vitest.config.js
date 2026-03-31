import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      thresholds: {
        statements: 1.73,
        branches: 1.73,
        functions: 0.88,
        lines: 1.74,
        failWhenThresholdNotMet: true,
      },
    },
  },
})
