import {fromRollup} from '@web/dev-server-rollup'
import rollupReplace from '@rollup/plugin-replace'

const replace = fromRollup(rollupReplace)

export default {
  plugins: [
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
