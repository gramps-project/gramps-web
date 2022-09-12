import {html, LitElement} from 'lit'
import {mdiMapMarker} from '@mdi/js'
import {Marker, Icon} from '../../node_modules/leaflet/dist/leaflet-src.esm.js'
import {iconDataUrl} from '../icons.js'

class GrampsjsMapMarker extends LitElement {
  render() {
    return html` <link rel="stylesheet" href="leaflet.css" /> `
  }

  static get properties() {
    return {
      latitude: {type: Number},
      longitude: {type: Number},
      popupLabel: {type: String},
      markerId: {type: String},
      opacity: {type: Number},
      size: {type: Number},
      _marker: {type: Object, attribute: false},
      _map: {type: Object, attribute: false},
    }
  }

  constructor() {
    super()
    this.popupLabel = ''
    this.markerId = ''
    this.opacity = 1
    this.size = 32
  }

  attributeChangedCallback(name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval)
    this.updateMarker()
  }

  firstUpdated() {
    this._map = this.parentElement._map
    this.addMarker()
  }

  addMarker() {
    const icon = new Icon({
      iconUrl: iconDataUrl(mdiMapMarker, '#EA4335'),
      iconSize: [this.size, this.size],
      iconAnchor: [this.size / 2, this.size],
      popupAnchor: [0, -this.size],
    })
    this._marker = new Marker([this.latitude, this.longitude], {
      opacity: this.opacity,
      icon,
    })
    this._marker.addTo(this._map)
    this._marker.on('click', this.clickHandler.bind(this))
    if (this.popupLabel !== '') {
      this._marker.bindPopup(this.popupLabel)
    }
  }

  clickHandler() {
    this.dispatchEvent(
      new CustomEvent('marker:clicked', {
        bubbles: true,
        composed: true,
        detail: {
          latitude: this.latitude,
          longitude: this.longitude,
          markerId: this.markerId,
        },
      })
    )
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
