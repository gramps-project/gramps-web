import {html, LitElement} from 'lit'
import {mdiMapMarker} from '@mdi/js'
import * as maplibregl from 'maplibre-gl'

class GrampsjsMapMarker extends LitElement {
  render() {
    return html`` // No need for leaflet.css
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
    // Find the maplibre-gl map instance from the parent
    this._map = this.parentElement._map
    this.addMarker()
  }

  addMarker() {
    if (!this._map) return
    // Create a DOM element for the marker
    const el = document.createElement('div')
    el.style.width = `${this.size}px`
    el.style.height = `${this.size}px`
    el.style.opacity = this.opacity
    el.style.cursor = 'pointer'
    el.innerHTML = `
      <svg width="${this.size}" height="${this.size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="${mdiMapMarker}" fill="#EA4335" />
      </svg>
    `
    el.addEventListener('click', this.clickHandler.bind(this))
    // Add popup if needed
    if (this.popupLabel) {
      el.title = this.popupLabel
    }
    // Create the marker
    this._marker = new maplibregl.Marker({element: el})
      .setLngLat([this.longitude, this.latitude])
      .addTo(this._map)
    if (this.popupLabel) {
      this._marker.setPopup(
        new maplibregl.Popup({offset: 25}).setHTML(this.popupLabel)
      )
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
    if (this._marker) {
      this._marker.remove()
    }
    super.disconnectedCallback()
  }

  updateMarker() {
    if (this._marker) {
      this._marker.remove()
      this.addMarker()
    }
  }
}

window.customElements.define('grampsjs-map-marker', GrampsjsMapMarker)
