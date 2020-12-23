import merge from 'deepmerge'
import copy from 'rollup-plugin-copy'
import {createSpaConfig} from '@open-wc/building-rollup'
import replace from '@rollup/plugin-replace'

const baseConfig = createSpaConfig({
  developmentMode: process.env.ROLLUP_WATCH === 'true',
  injectServiceWorker: true,
})


export default merge(baseConfig, {
  input: './index.html',
  plugins: [
    copy({
      targets: [
        {src: './leaflet.css', dest: 'dist/'},
        {src: './images/**/*', dest: 'dist/images'}
      ]
    }),
    replace({
      'http://localhost:5555': ''
    })
  ]
})
