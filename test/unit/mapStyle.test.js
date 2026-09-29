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

  const OHM = {...STYLE, name: 'ohm'}

  // What the layer switcher and the view do: set mapStyle, which updated()
  // passes to _syncStyle. The map is detached, so this calls it directly.
  function select(map, style) {
    // eslint-disable-next-line no-param-reassign
    map.mapStyle = style
    return map._syncStyle()
  }

  async function createBaseMap(responses) {
    const created = createMap(responses)
    responses.base.resolve()
    await select(created.map, 'base')
    return created
  }

  it('applies the localized style once it is loaded', async () => {
    const ohm = deferred(OHM)
    const {map, applied} = await createBaseMap({ohm, base: deferred(BASE)})
    const change = select(map, 'ohm')
    expect(map._appliedStyle).to.equal('base')
    ohm.resolve()
    await change
    expect(map._appliedStyle).to.equal('ohm')
    expect(applied.map(style => style.name)).to.deep.equal(['base', 'ohm'])
    expect(JSON.stringify(applied[1].layers[1])).to.contain('name_de')
  })

  it('keeps the applied style when it is selected again while loading', async () => {
    const ohm = deferred(OHM)
    const {map, applied} = await createBaseMap({ohm, base: deferred(BASE)})
    const toOhm = select(map, 'ohm')
    await select(map, 'base')
    ohm.resolve()
    await toOhm
    expect(applied.map(style => style.name)).to.deep.equal(['base'])
    expect(map._appliedStyle).to.equal('base')
  })

  it('applies only the latest selection when loads overlap', async () => {
    const ohm = deferred(OHM)
    const base = deferred(BASE)
    const {map, applied} = createMap({ohm, base})
    const first = select(map, 'ohm')
    const second = select(map, 'base')
    base.resolve()
    await second
    ohm.resolve()
    await first
    expect(applied.map(style => style.name)).to.deep.equal(['base'])
  })

  it('applies a selection once when synced repeatedly', async () => {
    const ohm = deferred(OHM)
    const {map, applied} = await createBaseMap({ohm, base: deferred(BASE)})
    const first = select(map, 'ohm')
    const second = map._syncStyle()
    ohm.resolve()
    await Promise.all([first, second])
    await map._syncStyle()
    expect(applied.map(style => style.name)).to.deep.equal(['base', 'ohm'])
  })

  it('relocalizes the historical map when the language changes', async () => {
    const ohm = deferred(OHM)
    ohm.resolve()
    const {map, applied} = await createBaseMap({ohm, base: deferred(BASE)})
    await select(map, 'ohm')
    map.appState = {...map.appState, i18n: {lang: 'fr'}}
    await map._syncStyle()
    expect(applied).to.have.length(3)
    expect(JSON.stringify(applied[2].layers[1])).to.contain('name_fr')
  })
})
