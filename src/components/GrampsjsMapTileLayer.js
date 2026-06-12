import {LitElement} from 'lit'
import {getTileUrl} from '../api.js'

class GrampsjsMapTileLayer extends LitElement {
  static get properties() {
    return {
      handle: {type: String},
      hidden: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.hidden = false
    this._map = null
    this._onStyleLoad = () => this._syncVisibility()
  }

  // No shadow DOM — renders no UI.
  createRenderRoot() {
    return this
  }

  get _layerId() {
    return `tile-overlay-${this.handle}`
  }

  _syncVisibility() {
    if (!this._map || !this.handle) return
    const layerId = this._layerId
    if (this._map.getLayer(layerId)) {
      this._map.setLayoutProperty(
        layerId,
        'visibility',
        this.hidden ? 'none' : 'visible'
      )
    }
  }

  // Called by GrampsjsMap after initial map load.
  // Imperatively adds the tile source/layer since the initial Map() constructor
  // doesn't use transformStyle.
  addToMap(map) {
    this._map = map
    map.off('style.load', this._onStyleLoad)
    map.on('style.load', this._onStyleLoad)
    if (!this.handle) return
    const layerId = this._layerId
    if (!map.getSource(layerId)) {
      map.addSource(layerId, {
        type: 'raster',
        tiles: [getTileUrl(this.handle)],
        tileSize: 256,
        maxzoom: 18,
      })
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: layerId,
        layout: {visibility: this.hidden ? 'none' : 'visible'},
      })
    }
  }

  // Called by GrampsjsMap inside setStyle's transformStyle callback so the
  // tile source/layer are part of the new style spec from its very first frame.
  getTransformStyleContribution(_prev, next) {
    if (!this.handle) return next
    const layerId = this._layerId
    return {
      ...next,
      sources: {
        ...next.sources,
        [layerId]: {
          type: 'raster',
          tiles: [getTileUrl(this.handle)],
          tileSize: 256,
          maxzoom: 18,
        },
      },
      layers: [
        ...next.layers,
        {
          id: layerId,
          type: 'raster',
          source: layerId,
          layout: {visibility: this.hidden ? 'none' : 'visible'},
        },
      ],
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._map) {
      this._map.off('style.load', this._onStyleLoad)
      const layerId = this._layerId
      if (this._map.getLayer(layerId)) this._map.removeLayer(layerId)
      if (this._map.getSource(layerId)) this._map.removeSource(layerId)
    }
  }

  updated(changed) {
    if (changed.has('handle') && this._map) {
      const oldHandle = changed.get('handle')
      if (oldHandle) {
        const oldLayerId = `tile-overlay-${oldHandle}`
        if (this._map.getLayer(oldLayerId)) this._map.removeLayer(oldLayerId)
        if (this._map.getSource(oldLayerId)) this._map.removeSource(oldLayerId)
      }
      this.addToMap(this._map)
    }
    if (changed.has('hidden') && this._map?.isStyleLoaded()) {
      this._syncVisibility()
    }
  }
}

window.customElements.define('grampsjs-map-tile-layer', GrampsjsMapTileLayer)
