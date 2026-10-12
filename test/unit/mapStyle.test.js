import {afterEach, describe, it, expect, vi} from 'vitest'

import {
  getBaseNameLocales,
  getOhmNameLocales,
  localizeBaseStyle,
  localizeOhmStyle,
} from '../../src/components/GrampsjsMap.js'
import {frontendLanguages} from '../../src/strings.js'

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

describe('getOhmNameLocales', () => {
  it('maps regional languages to name suffixes with fallbacks', () => {
    expect(getOhmNameLocales('pt_BR')).to.deep.equal(['pt-br', 'pt'])
    expect(getOhmNameLocales('zh_TW')).to.deep.equal(['zh-hant', 'zh-tw', 'zh'])
    expect(getOhmNameLocales('nb')).to.deep.equal(['nb', 'no'])
  })

  it('keeps plain language codes', () => {
    expect(getOhmNameLocales('de')).to.deep.equal(['de'])
  })

  it('gives every frontend language valid locale tags', () => {
    frontendLanguages.forEach(lang => {
      const locales = getOhmNameLocales(lang)
      locales.forEach(locale => expect(locale).not.to.contain('_'))
      // The first locale is the collation locale.
      expect(() => new Intl.Collator(locales[0])).not.to.throw()
    })
  })

  it('localizes the style for a regional language', () => {
    const localized = localizeOhmStyle(STYLE, getOhmNameLocales('pt_BR'))
    const textField = JSON.stringify(localized.layers[1].layout['text-field'])
    expect(textField).to.contain('"name_pt-br"')
    expect(textField).to.contain('"name_pt"')
  })
})

// The label expressions of the OpenFreeMap styles.
const OFM_NAME = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
]

const OFM_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {id: 'background', type: 'background'},
    {
      id: 'label_city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: {'text-field': OFM_NAME},
    },
    {
      id: 'highway-name-major',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      layout: {'text-field': OFM_NAME, 'symbol-placement': 'line'},
    },
    {
      id: 'highway-shield',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      layout: {'text-field': ['to-string', ['get', 'ref']]},
    },
  ],
}

describe('localizeBaseStyle', () => {
  it('localizes name labels in a copy', () => {
    const original = structuredClone(OFM_STYLE)
    const localized = localizeBaseStyle(OFM_STYLE, ['de'])
    expect(OFM_STYLE).to.deep.equal(original)
    const textField = JSON.stringify(localized.layers[1].layout['text-field'])
    expect(textField).to.contain('"name:de"')
    expect(textField).not.to.contain('name_en')
    expect(textField).not.to.contain('name:latin')
  })

  it('reads the legacy German field for road names', () => {
    const localized = localizeBaseStyle(OFM_STYLE, ['de'])
    const textField = JSON.stringify(localized.layers[2].layout['text-field'])
    expect(textField).to.contain('"name:de"')
    expect(textField).to.contain('"name_de"')
  })

  it('keeps layers without name labels', () => {
    const localized = localizeBaseStyle(OFM_STYLE, ['de'])
    expect(localized.layers[0]).to.deep.equal(OFM_STYLE.layers[0])
    expect(localized.layers[3]).to.deep.equal(OFM_STYLE.layers[3])
  })

  it('can localize an already localized style again', () => {
    const german = localizeBaseStyle(OFM_STYLE, ['de'])
    const french = localizeBaseStyle(german, ['fr'])
    const textField = JSON.stringify(french.layers[1].layout['text-field'])
    expect(textField).to.contain('"name:fr"')
    expect(textField).not.to.contain('"name:de"')
  })
})

describe('getBaseNameLocales', () => {
  it('maps regional languages to the languages in the tiles', () => {
    expect(getBaseNameLocales('pt_BR')).to.deep.equal(['pt'])
    expect(getBaseNameLocales('zh_TW')).to.deep.equal(['zh-Hant', 'zh'])
    expect(getBaseNameLocales('nn')).to.deep.equal(['no'])
  })

  it('keeps plain language codes', () => {
    expect(getBaseNameLocales('de')).to.deep.equal(['de'])
  })

  it('gives every frontend language valid locale tags', () => {
    frontendLanguages.forEach(lang => {
      const locales = getBaseNameLocales(lang)
      locales.forEach(locale => expect(locale).not.to.contain('_'))
      // The first locale is the collation locale.
      expect(() => new Intl.Collator(locales[0])).not.to.throw()
    })
  })
})

describe('map style switching', () => {
  const BASE = {...OFM_STYLE, name: 'base'}
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function createMap(responses) {
    const map = document.createElement('grampsjs-map')
    map.appState = {
      getCurrentTheme: () => 'light',
      i18n: {lang: 'de', strings: {}},
    }
    Object.defineProperty(map, '_slottedChildren', {value: []})
    const applied = []
    map._map = {setStyle: style => applied.push(style)}
    globalThis.fetch = vi.fn(url => {
      const {promise, json} =
        responses[url.includes('openhistoricalmap') ? 'ohm' : 'base']
      // A response without JSON is a failed request.
      return promise.then(() => ({
        ok: json !== null,
        status: 503,
        json: () => structuredClone(json),
      }))
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

  it('falls back to the local name, not browser languages', async () => {
    const ohm = deferred(OHM)
    ohm.resolve()
    const {map, applied} = await createBaseMap({ohm, base: deferred(BASE)})
    await select(map, 'ohm')
    const textField = JSON.stringify(applied[1].layers[1].layout['text-field'])
    expect(navigator.languages).to.include('en-US')
    expect(textField).to.contain('"name_de"')
    expect(textField).not.to.contain('"name_en')
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
    map.appState = {...map.appState, i18n: {lang: 'fr', strings: {}}}
    await map._syncStyle()
    expect(applied).to.have.length(3)
    expect(JSON.stringify(applied[2].layers[1])).to.contain('name_fr')
  })

  it('localizes the base map and relocalizes it when the language changes', async () => {
    const {map, applied} = await createBaseMap({
      ohm: deferred(OHM),
      base: deferred(BASE),
    })
    expect(JSON.stringify(applied[0].layers[1])).to.contain('"name:de"')
    map.appState = {...map.appState, i18n: {lang: 'fr', strings: {}}}
    await map._syncStyle()
    expect(applied).to.have.length(2)
    expect(JSON.stringify(applied[1].layers[1])).to.contain('"name:fr"')
  })

  it('reports a failed load and selects the style still shown', async () => {
    const ohm = deferred(null)
    ohm.resolve()
    const {map, applied} = await createBaseMap({ohm, base: deferred(BASE)})
    const errors = []
    const layerChanges = []
    map.addEventListener('grampsjs:error', e => errors.push(e.detail))
    map.addEventListener('map:layerchange', e => layerChanges.push(e.detail))
    await select(map, 'ohm')
    expect(errors).to.have.length(1)
    expect(map.mapStyle).to.equal('base')
    expect(layerChanges).to.deep.equal([{style: 'base'}])
    expect(applied.map(style => style.name)).to.deep.equal(['base'])
  })
})
