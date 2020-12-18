import merge from 'deepmerge'
import {createSpaConfig} from '@open-wc/building-rollup'

const baseConfig = createSpaConfig({
  developmentMode: process.env.ROLLUP_WATCH === 'true',
  injectServiceWorker: true,
})

export default merge(baseConfig, {
  input: './index.html',
})
