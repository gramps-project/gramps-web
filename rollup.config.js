import merge from 'deepmerge'
import copy from 'rollup-plugin-copy'
import {createSpaConfig} from '@open-wc/building-rollup'


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
      ]
    })
  ]
})
