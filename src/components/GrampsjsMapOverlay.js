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
      _overlay: {type: String, attribute: false},
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
    this._overlay = ''
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

    // Don't add if overlay is hidden
    if (this.hidden) {
      return
    }

    // Need a handle to create stable ID
    if (!this.handle) {
      return
    }

    // Do nothing if overlay already exists
    if (this._overlay && this._map.getLayer(this._overlay)) {
      return
    }

    // Wait for style to be loaded before adding source/layer
    const addOverlayWhenReady = () => {
      // Don't add if hidden (could have changed while waiting)
      if (this.hidden) {
        return
      }

      // Generate stable ID from handle if not already set
      if (!this._overlay && this.handle) {
        this._overlay = `overlay-${this.handle}`
      }

      // If still no ID, we can't proceed
      if (!this._overlay) {
        return
      }

      // Check if already added (shouldn't happen but be safe)
      if (this._map.getSource(this._overlay)) {
        return
      }

      // MapLibre expects coordinates in order: top-left, top-right, bottom-right, bottom-left
      // Fix: ensure bounds[0] is top-left (northwest), bounds[1] is bottom-right (southeast)
      // If bounds are [south, west], [north, east], swap as needed
      let [[y0, x0], [y1, x1]] = this.bounds
      // Ensure y0 > y1 (top > bottom)
      if (y0 < y1) {
        ;[y0, y1] = [y1, y0]
      }
      // Ensure x0 < x1 (left < right)
      if (x0 > x1) {
        ;[x0, x1] = [x1, x0]
      }
      this._map.addSource(this._overlay, {
        type: 'image',
        url: this.url,
        coordinates: [
          [x0, y0], // top left [lng, lat]
          [x1, y0], // top right
          [x1, y1], // bottom right
          [x0, y1], // bottom left
        ],
      })
      this._map.addLayer({
        id: this._overlay,
        type: 'raster',
        source: this._overlay,
        paint: {
          'raster-opacity': this.opacity,
        },
      })
      // Bring to front
      this._map.moveLayer(this._overlay)
    }

    // Check if style is already loaded
    if (this._map.isStyleLoaded()) {
      addOverlayWhenReady()
    } else {
      // Wait for style to load
      this._map.once('styledata', addOverlayWhenReady)
    }
  }

  removeOverlay() {
    if (this._map && this._overlay) {
      if (this._map.getLayer(this._overlay)) {
        this._map.removeLayer(this._overlay)
      }
      if (this._map.getSource(this._overlay)) {
        this._map.removeSource(this._overlay)
      }
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
