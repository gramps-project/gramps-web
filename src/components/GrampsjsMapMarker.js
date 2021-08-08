import {html, LitElement} from 'lit'
import {Marker, Icon} from '../../node_modules/leaflet/dist/leaflet-src.esm.js'

class GrampsjsMapMarker extends LitElement {
  render() {
    return html`
      <link rel="stylesheet" href="leaflet.css">
      `
  }


  static get properties() { return {
    latitude: {type: Number},
    longitude: {type: Number},
    popup: {type: String},
    markerId: {type: String},
    opacity: {type: Number},
    _marker: {type: Object, attribute: false},
    _map: {type: Object, attribute: false}
  }}


  constructor() {
    super()
    this.popup = ''
    this.markerId = ''
    this.opacity = 1
  }


  attributeChangedCallback(name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval)
    this.updateMarker()
  }

  firstUpdated() {
    Icon.Default.imagePath = 'images/'
    this._map = this.parentElement._map
    this.addMarker()
  }

  addMarker() {
    this._marker = new Marker([this.latitude, this.longitude], {opacity: this.opacity})
    this._marker.addTo(this._map)
    this._marker.on('click', this.clickHandler.bind(this))
    if (this.popup !== '') {
      this._marker.bindPopup(this.popup)
    }
  }

  clickHandler() {
    this.dispatchEvent(new CustomEvent('marker:clicked', {bubbles: true, composed: true, detail: {
      latitude: this.latitude,
      longitude: this.longitude,
      markerId: this.markerId,
    }}))
  }

  disconnectedCallback() {
    this._map.removeLayer(this._marker)
    super.disconnectedCallback()
  }

  updateMarker() {
    if (this._marker) {
      this._map.removeLayer(this._marker)
      this.addMarker()
    }
  }
}

window.customElements.define('grampsjs-map-marker', GrampsjsMapMarker)
