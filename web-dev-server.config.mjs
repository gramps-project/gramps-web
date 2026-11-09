import {fromRollup} from '@web/dev-server-rollup'
import rollupReplace from '@rollup/plugin-replace'
import {esbuildPlugin} from '@web/dev-server-esbuild'

const replace = fromRollup(rollupReplace)

export default {
  nodeResolve: {exportConditions: ['browser']},
  middleware: [
    async (ctx, next) => {
      if (ctx.path.startsWith('/webawesome-styles/')) {
        ctx.path = ctx.path.replace(
          '/webawesome-styles/',
          '/node_modules/@awesome.me/webawesome/dist/styles/'
        )
      }
      if (ctx.path === '/maplibre-gl-worker.js') {
        ctx.path = '/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'
      }
      await next()
    },
  ],
  plugins: [
    esbuildPlugin({ts: true}),
    replace({
      include: [
        'node_modules/@popperjs/**/*.js',
        'node_modules/@popperjs/**/*.ts',
        'node_modules/tippy.js/**/*.ts',
        'node_modules/tippy.js/**/*.js'
      ],
      preventAssignment: true,
      'process.env.NODE_ENV': '"production"'
    })
  ]
}
