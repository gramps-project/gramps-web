import {html, LitElement} from 'lit'
import {Map, TileLayer, LatLng, control} from '../../node_modules/leaflet/dist/leaflet-src.esm.js'

class GrampsjsMap extends LitElement {
  render() {
    return html`
      <link rel="stylesheet" href="/leaflet.css">

      <div class="mapcontainer" style="width:${this.width}; height:${this.height};">
        <div id="${this.mapid}" style="z-index: 0; width: 100%; height: 100%;">
          <slot>
          </slot>
        </div>
      </div>
      `
  }

  static get styles() {
    return [
    ]
  }

  static get properties() {
    return {
      height: {type: String},
      width: {type: String},
      latitude: {type: Number},
      longitude: {type: Number},
      mapid: {type: String},
      zoom: {type: Number},
      latMin: {type: Number},
      latMax: {type: Number},
      longMin: {type: Number},
      longMax: {type: Number},
      _map: {type: Object},
    }
  }

  constructor() {
    super()
    this.height = '500px'
    this.width = '100%'
    this.zoom = 13
    this.mapid = 'mapid'
    this.latitude = 0
    this.longitude = 0
    this.latMin = 0
    this.latMax = 0
    this.longMin = 0
    this.longMax = 0
  }

  firstUpdated() {
    const mapel = this.shadowRoot.getElementById(this.mapid)
    if (this.latMin === 0 && this.latMax === 0) {
      this._map = new Map(mapel, {zoomControl: false}).setView([this.latitude, this.longitude], this.zoom)
    } else {
      this._map = new Map(mapel, {zoomControl: false}).fitBounds([[this.latMin, this.longMin], [this.latMax, this.longMax]])
    }
    const __tileUrl__ = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    const __tileAttribution__ = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors; <a href="https://carto.com/attributions">CARTO</a>'
    new TileLayer(__tileUrl__, {
      attribution: __tileAttribution__,
      maxZoom: 19,
      zoomControl: false
    }).addTo(this._map)
    this._map.addControl(control.zoom({position: 'bottomright'}))
    this._map.invalidateSize(false)
  }

  panTo(latitude, longitude) {
    this._map.panTo(new LatLng(latitude, longitude))
  }

  updated() {
    if (this._map !== undefined) {
      if (this.latMin === 0 && this.latMax === 0) {
        this._map.panTo(new LatLng(this.latitude, this.longitude))
        this._map.setZoom(this.zoom)
      } else {
        this._map.fitBounds([[this.latMin, this.longMin], [this.latMax, this.longMax]])
      }
      this._map.invalidateSize(false)
    }
  }
}

window.customElements.define('grampsjs-map', GrampsjsMap)
