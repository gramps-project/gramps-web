import {LitElement} from 'lit'
import {getTileUrl} from '../api.js'

class GrampsjsMapTileLayer extends LitElement {
  static get properties() {
    return {
      handle: {type: String},
      checksum: {type: String},
      bounds: {
        type: Array,
        hasChanged: (newVal, oldVal) =>
          JSON.stringify(newVal) !== JSON.stringify(oldVal),
      },
      hidden: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.checksum = ''
    this.bounds = null
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

  // MapLibre wants [west, south, east, north]; map:bounds is [[lat,lng],[lat,lng]]
  // in unspecified corner order, so normalise via min/max.
  get _sourceBounds() {
    if (!Array.isArray(this.bounds) || this.bounds.length !== 2) return null
    const [[latA, lngA], [latB, lngB]] = this.bounds
    return [
      Math.min(lngA, lngB),
      Math.min(latA, latB),
      Math.max(lngA, lngB),
      Math.max(latA, latB),
    ]
  }

  get _sourceSpec() {
    const bounds = this._sourceBounds
    return {
      type: 'raster',
      tiles: [getTileUrl(this.handle, this.checksum)],
      tileSize: 256,
      maxzoom: 18,
      // Stops MapLibre requesting (and looping on) tiles outside the overlay.
      ...(bounds ? {bounds} : {}),
    }
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
      map.addSource(layerId, this._sourceSpec)
    }
    if (!map.getLayer(layerId)) {
      map.addLayer(
        {
          id: layerId,
          type: 'raster',
          source: layerId,
          layout: {visibility: this.hidden ? 'none' : 'visible'},
        },
        this._beforeId(map)
      )
    }
  }

  // Keep tiles under pins/lines even if this layer is added after them.
  // eslint-disable-next-line class-methods-use-this
  _beforeId(map) {
    return (
      ['person-lines-layer', 'places-layer'].find(id => map.getLayer(id)) ??
      undefined
    )
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
        [layerId]: this._sourceSpec,
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
    } else if (
      (changed.has('checksum') || changed.has('bounds')) &&
      this._map
    ) {
      // Same handle (so same layerId) but a new tile URL or bounds: a raster
      // source can't be mutated in place, so drop and re-add.
      const layerId = this._layerId
      if (this._map.getLayer(layerId)) this._map.removeLayer(layerId)
      if (this._map.getSource(layerId)) this._map.removeSource(layerId)
      this.addToMap(this._map)
    }
    if (changed.has('hidden') && this._map) {
      this._syncVisibility()
    }
  }
}

window.customElements.define('grampsjs-map-tile-layer', GrampsjsMapTileLayer)
