import {html, LitElement} from 'lit'
import {imageOverlay} from '../../node_modules/leaflet/dist/leaflet-src.esm.js'

class GrampsjsMapOverlay extends LitElement {
  render () {
    return html`
      <link rel="stylesheet" href="leaflet.css">
      `
  }

  static get properties () {
    return {
      url: {type: String},
      bounds: {type: Array},
      opacity: {type: Number},
      title: {type: String},
      _overlay: {type: Object, attribute: false}
    }
  }

  constructor () {
    super()
    this.url = ''
    this.opacity = 1
    this.title = ''
    this.bounds = []
  }

  firstUpdated () {
    this._map = this.parentElement._map
    this.addOverlay()
  }

  addOverlay () {
    // eslint-disable-next-line new-cap
    this._overlay = new imageOverlay(this.url, this.bounds)
    this.parentElement._layercontrol.addOverlay(this._overlay, this.title || 'image')
    this._overlay.addTo(this._map)
    this._overlay.bringToFront()
    this._overlay.setOpacity(this.opacity)
  }

  removeOverlay () {
    this._map.removeLayer(this._overlay)
    this.parentElement._layercontrol.removeLayer(this._overlay)
  }

  disconnectedCallback () {
    this._map.removeLayer(this._overlay)
    super.disconnectedCallback()
  }

  updated (changed) {
    if (
      changed.has('bounds') ||
      changed.has('opacity') ||
      changed.has('url')
    ) {
      this.updateOverlay()
    }
  }

  updateOverlay () {
    if (this._overlay) {
      this.removeOverlay()
      this.addOverlay()
    }
  }
}

window.customElements.define('grampsjs-map-overlay', GrampsjsMapOverlay)
