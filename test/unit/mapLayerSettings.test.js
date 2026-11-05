import {describe, it, expect, beforeEach, vi} from 'vitest'

import {getMapLayerSettings, saveMapLayerSettings} from '../../src/api.js'
import {GrampsjsViewMap} from '../../src/views/GrampsjsViewMap.js'

const LAYER = {
  handle: 'M1',
  desc: 'Old town map',
  checksum: 'abc',
  mime: 'image/jpeg',
  attribute_list: [{type: 'map:bounds', value: '[[49.4, 8.6], [49.5, 8.8]]'}],
}

beforeEach(() => {
  localStorage.removeItem('grampsjs_map_layers')
})

describe('map layer settings', () => {
  it('round-trips the overlay opacity', () => {
    saveMapLayerSettings({
      style: 'ohm',
      hiddenOverlays: ['X'],
      overlayOpacity: {M1: 0.4},
    })
    expect(getMapLayerSettings()).to.deep.equal({
      style: 'ohm',
      hiddenOverlays: ['X'],
      overlayOpacity: {M1: 0.4},
    })
  })

  it('defaults the opacity map', () => {
    localStorage.setItem(
      'grampsjs_map_layers',
      JSON.stringify({unknown: {style: 'base', hiddenOverlays: []}})
    )
    expect(getMapLayerSettings()).to.deep.equal({
      style: 'base',
      hiddenOverlays: [],
      overlayOpacity: {},
    })
  })

  it('ignore malformed opacity map', () => {
    localStorage.setItem(
      'grampsjs_map_layers',
      JSON.stringify({
        unknown: {style: 'base', hiddenOverlays: [], overlayOpacity: 'no'},
      })
    )
    expect(getMapLayerSettings().overlayOpacity).to.deep.equal({})
  })
})

describe('map view overlay opacity', () => {
  function makeView() {
    const view = new GrampsjsViewMap()
    view.appState = {
      i18n: {lang: 'en', strings: {}},
      apiGet: vi.fn().mockResolvedValue({data: {}}),
      dbInfo: {},
    }
    view._dataLayers = [LAYER]
    view._bounds = {}
    view._isLayerVisible = () => true
    return view
  }

  it('starts fully opaque and lists the opacity for only tile overlays', () => {
    const view = makeView()
    const [overlay] = view._getOverlaysForLayerSwitcher()
    expect(overlay.handle).to.equal('M1')
    expect(overlay.opacity).to.equal(1)
    const external = view
      ._getOverlaysForLayerSwitcher()
      .filter(o => o.group === 'external')
    external.forEach(o => expect(o.opacity).to.equal(undefined))
  })

  it('saves changed opacity and restores it in a new view', () => {
    const view = makeView()
    view._handleOverlayOpacity({
      detail: {overlay: {handle: 'M1'}, opacity: 0.35, final: true},
    })
    expect(view._getOverlaysForLayerSwitcher()[0].opacity).to.equal(0.35)
    expect(getMapLayerSettings().overlayOpacity).to.deep.equal({M1: 0.35})

    const restored = makeView()
    expect(restored._overlayOpacity).to.deep.equal({M1: 0.35})
    expect(restored._getOverlaysForLayerSwitcher()[0].opacity).to.equal(0.35)
  })

  it('does not store opacity while the slider is dragged', () => {
    const view = makeView()
    view._handleOverlayOpacity({
      detail: {overlay: {handle: 'M1'}, opacity: 0.35, final: false},
    })
    expect(view._overlayOpacity).to.deep.equal({})
    expect(getMapLayerSettings()).to.equal(null)
  })
})
