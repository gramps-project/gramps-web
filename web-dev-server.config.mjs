import {fromRollup} from '@web/dev-server-rollup'
import rollupReplace from '@rollup/plugin-replace'

const replace = fromRollup(rollupReplace)

export default {
  plugins: [
    replace({
      include: ['node_modules/**/*.ts'],
      preventAssignment: true,
      'process.env.NODE_ENV': '"development"'
    })
  ]
}
