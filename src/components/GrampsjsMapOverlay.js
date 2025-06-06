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
      hidden: {type: Boolean},
      _overlay: {type: Object, attribute: false},
    }
  }

  constructor() {
    super()
    this.url = ''
    this.opacity = 1
    this.title = ''
    this.hidden = false
    this.bounds = []
  }

  firstUpdated() {
    this._map = this.parentElement._map
    if (!this.hidden) {
      this.addOverlay()
    }
  }

  addOverlay() {
    if (!this._map || !this.url || !this.bounds || this.bounds.length !== 2)
      return
    // Remove if already exists
    if (this._overlay) {
      this.removeOverlay()
    }
    // Add as a raster image source/layer
    const id = `overlay-${this.title || 'image'}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    this._overlay = id
    this._map.addSource(id, {
      type: 'image',
      url: this.url,
      coordinates: [
        [this.bounds[0][1], this.bounds[0][0]], // top left [lng, lat]
        [this.bounds[1][1], this.bounds[0][0]], // top right
        [this.bounds[1][1], this.bounds[1][0]], // bottom right
        [this.bounds[0][1], this.bounds[1][0]], // bottom left
      ],
    })
    this._map.addLayer({
      id,
      type: 'raster',
      source: id,
      paint: {
        'raster-opacity': this.opacity,
      },
    })
    // Bring to front
    this._map.moveLayer(id)
  }

  removeOverlay() {
    if (this._map && this._overlay) {
      if (this._map.getLayer(this._overlay)) {
        this._map.removeLayer(this._overlay)
      }
      if (this._map.getSource(this._overlay)) {
        this._map.removeSource(this._overlay)
      }
      this._overlay = null
    }
  }

  disconnectedCallback() {
    this.removeOverlay()
    super.disconnectedCallback()
  }

  updated(changed) {
    if (changed.has('bounds') || changed.has('opacity') || changed.has('url')) {
      this.updateOverlay()
    } else if (changed.has('hidden')) {
      if (this.hidden) {
        this.removeOverlay()
      } else {
        this.addOverlay()
      }
    }
  }

  updateOverlay() {
    this.removeOverlay()
    this.addOverlay()
  }
}

window.customElements.define('grampsjs-map-overlay', GrampsjsMapOverlay)
