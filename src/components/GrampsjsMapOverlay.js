import {html, LitElement} from 'lit'

class GrampsjsMapOverlay extends LitElement {
  render() {
    return html`` // No need for leaflet.css
  }

  static get properties() {
    return {
      url: {type: String},
      bounds: {type: Array},
      opacity: {type: Number},
      title: {type: String},
      handle: {type: String},
      hidden: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.url = ''
    this.opacity = 1
    this.title = ''
    this.handle = ''
    this.hidden = false
    this.bounds = []
    this._onStyleLoad = () => {
      if (this.hidden) {
        this.removeOverlay()
      } else {
        this.addOverlay()
      }
    }
  }

  _layerIdFor(handle, title) {
    if (handle) return `overlay-${handle}`
    if (title) return `overlay-${title.replace(/\s+/g, '-')}`
    return ''
  }

  get _layerId() {
    return this._layerIdFor(this.handle, this.title)
  }

  // MapLibre expects coordinates in order: top-left, top-right, bottom-right, bottom-left
  _getCoordinates() {
    if (!this.bounds || this.bounds.length !== 2) return null
    let [[y0, x0], [y1, x1]] = this.bounds
    if (y0 < y1) [y0, y1] = [y1, y0]
    if (x0 > x1) [x0, x1] = [x1, x0]
    return [
      [x0, y0], // top left [lng, lat]
      [x1, y0], // top right
      [x1, y1], // bottom right
      [x0, y1], // bottom left
    ]
  }

  firstUpdated() {
    this._map = this.parentElement._map
    this._map.off('style.load', this._onStyleLoad)
    this._map.on('style.load', this._onStyleLoad)
    if (!this.hidden) this.addOverlay()
  }

  addOverlay() {
    if (!this._map || !this.url || !this._layerId) return
    if (this.hidden) return
    if (this._map.getLayer(this._layerId)) return

    const addOverlayWhenReady = () => {
      if (this.hidden) return
      if (this._map.getSource(this._layerId)) return
      const coordinates = this._getCoordinates()
      if (!coordinates) return
      this._map.addSource(this._layerId, {
        type: 'image',
        url: this.url,
        coordinates,
      })
      this._map.addLayer({
        id: this._layerId,
        type: 'raster',
        source: this._layerId,
        paint: {'raster-opacity': this.opacity},
      })
      this._map.moveLayer(this._layerId)
    }

    if (this._map.isStyleLoaded()) {
      addOverlayWhenReady()
    } else {
      this._map.once('styledata', addOverlayWhenReady)
    }
  }

  removeOverlay() {
    if (!this._map || !this._layerId) return
    if (this._map.getLayer(this._layerId)) this._map.removeLayer(this._layerId)
    if (this._map.getSource(this._layerId))
      this._map.removeSource(this._layerId)
  }

  disconnectedCallback() {
    if (this._map) this._map.off('style.load', this._onStyleLoad)
    this.removeOverlay()
    super.disconnectedCallback()
  }

  // Called by GrampsjsMap inside setStyle's transformStyle callback so the
  // image source/layer survive style switches without a two-pass re-add.
  getTransformStyleContribution(_prev, next) {
    if (!this.url || !this._layerId || this.hidden) return next
    const coordinates = this._getCoordinates()
    if (!coordinates) return next
    const layerId = this._layerId
    return {
      ...next,
      sources: {
        ...next.sources,
        [layerId]: {type: 'image', url: this.url, coordinates},
      },
      layers: [
        ...next.layers,
        {
          id: layerId,
          type: 'raster',
          source: layerId,
          layout: {visibility: this.hidden ? 'none' : 'visible'},
          paint: {'raster-opacity': this.opacity},
        },
      ],
    }
  }

  updated(changed) {
    if (changed.has('handle') || changed.has('title')) {
      const oldId = this._layerIdFor(
        changed.has('handle') ? changed.get('handle') : this.handle,
        changed.has('title') ? changed.get('title') : this.title
      )
      if (oldId && this._map) {
        if (this._map.getLayer(oldId)) this._map.removeLayer(oldId)
        if (this._map.getSource(oldId)) this._map.removeSource(oldId)
      }
      this.addOverlay()
    } else if (
      changed.has('bounds') ||
      changed.has('opacity') ||
      changed.has('url')
    ) {
      this.removeOverlay()
      this.addOverlay()
    } else if (changed.has('hidden')) {
      if (this.hidden) {
        this.removeOverlay()
      } else if (this._map && this._map.getLayer(this._layerId)) {
        this._map.setLayoutProperty(this._layerId, 'visibility', 'visible')
      } else {
        this.addOverlay()
      }
    }
  }
}

window.customElements.define('grampsjs-map-overlay', GrampsjsMapOverlay)
