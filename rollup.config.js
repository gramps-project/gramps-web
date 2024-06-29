import merge from 'deepmerge'
import copy from 'rollup-plugin-copy'
import {createSpaConfig} from '@open-wc/building-rollup'
import replace from '@rollup/plugin-replace'
import versionInjector from 'rollup-plugin-version-injector'

const API_URL = process.env.API_URL === undefined ? '' : process.env.API_URL

const BASE_DIR = process.env.BASE_DIR === undefined ? '' : process.env.BASE_DIR

const baseConfig = createSpaConfig({
  developmentMode: process.env.ROLLUP_WATCH === 'true',
  injectServiceWorker: true,
  workbox: {
    navigateFallbackDenylist: [/^\/api.*/],
    skipWaiting: false,
    clientsClaim: false,
  },
  html: {
    transform: [
      html => html.replace('<base href="/">', `<base href="${BASE_DIR}/">`),
    ],
  },
})

export default merge(baseConfig, {
  input: './index.html',
  external: ['./config.js'],
  plugins: [
    copy({
      targets: [
        {src: './L.Control.Locate.min.css', dest: 'dist/'},
        {src: './tippy.css', dest: 'dist/'},
        {src: './leaflet.css', dest: 'dist/'},
        {src: './config.js', dest: 'dist/'},
        {src: './manifest.json', dest: 'dist/'},
        {src: './images/**/*', dest: 'dist/images'},
        {src: './fonts/**/*', dest: 'dist/fonts'},
        {src: './lang/*', dest: 'dist/lang'},
      ],
    }),
    replace({
      'http://localhost:5555': API_URL,
      BASE_DIR: JSON.stringify(BASE_DIR),
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    versionInjector(),
  ],
})
