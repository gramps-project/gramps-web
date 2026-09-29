import {afterEach, describe, it, expect, vi} from 'vitest'

import {localizeOhmStyle} from '../../src/components/GrampsjsMap.js'

const STYLE = {
  version: 8,
  sources: {},
  layers: [
    {id: 'background', type: 'background'},
    {
      id: 'place-labels',
      type: 'symbol',
      source: 'ohm',
      'source-layer': 'place_points',
      layout: {'text-field': ['get', 'name']},
    },
  ],
}

describe('localizeOhmStyle', () => {
  it('localizes label layers in a copy', () => {
    const original = structuredClone(STYLE)
    const localized = localizeOhmStyle(STYLE, ['de'])
    expect(STYLE).to.deep.equal(original)
    const textField = localized.layers[1].layout['text-field']
    expect(JSON.stringify(textField)).to.contain('name_de')
    expect(localized.layers[0]).to.deep.equal(STYLE.layers[0])
  })

  it('puts country names into the style state', () => {
    const localized = localizeOhmStyle(STYLE, ['de'])
    const states = Object.values(localized.state)
    expect(states).to.have.length(1)
    expect(states[0].default).to.be.an('object')
  })

  it('can localize an already localized style again', () => {
    const german = localizeOhmStyle(STYLE, ['de'])
    const french = localizeOhmStyle(german, ['fr'])
    const textField = JSON.stringify(french.layers[1].layout['text-field'])
    expect(textField).to.contain('name_fr')
    expect(textField).not.to.contain('name_de')
  })
})

describe('map style switching', () => {
  const BASE = {version: 8, name: 'base', sources: {}, layers: []}
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function createMap(responses) {
    const map = document.createElement('grampsjs-map')
    map.appState = {getCurrentTheme: () => 'light', i18n: {lang: 'de'}}
    Object.defineProperty(map, '_slottedChildren', {value: []})
    const applied = []
    map._map = {setStyle: style => applied.push(style)}
    globalThis.fetch = vi.fn(url => {
      const {promise, json} =
        responses[url.includes('openhistoricalmap') ? 'ohm' : 'base']
      return promise.then(() => ({ok: true, json: () => structuredClone(json)}))
    })
    return {map, applied}
  }

  function deferred(json) {
    let resolvePromise
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    return {promise, resolve: resolvePromise, json}
  }

  it('applies the localized style once it is loaded', async () => {
    const ohm = deferred(STYLE)
    const {map, applied} = createMap({ohm, base: deferred(BASE)})
    const change = map._handleStyleChange('ohm')
    expect(map._currentStyle).to.equal('base')
    ohm.resolve()
    await change
    expect(map._currentStyle).to.equal('ohm')
    expect(applied).to.have.length(1)
    expect(JSON.stringify(applied[0].layers[1])).to.contain('name_de')
  })

  it('applies only the latest style when requests overlap', async () => {
    const ohm = deferred(STYLE)
    const base = deferred(BASE)
    const {map, applied} = createMap({ohm, base})
    const first = map._handleStyleChange('ohm')
    const second = map._handleStyleChange('base')
    base.resolve()
    await second
    ohm.resolve()
    await first
    expect(applied.map(style => style.name)).to.deep.equal(['base'])
    expect(map._currentStyle).to.equal('base')
  })
})
