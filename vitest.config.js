import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
    },
    server: {
      deps: {
        // ESM imports in this package lack .js extensions, which Node.js
        // strict ESM requires. Inline through Vite's bundler instead.
        inline: ['@material/material-color-utilities'],
      },
    },
  },
})
