import {html, LitElement} from 'lit-element';
import {Map, TileLayer, LatLng, control} from '../../node_modules/leaflet/dist/leaflet-src.esm.js';

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
      _map: {type: Object},
    }
  }

  constructor() {
    super();
    this.height = '500px';
    this.width = '100%';
    this.zoom = 13;
    this.mapid = 'mapid';
  }

  firstUpdated() {
    const mapel = this.shadowRoot.getElementById(this.mapid);
    this._map = new Map(mapel, {zoomControl: false}).setView([this.latitude, this.longitude], this.zoom);
    new TileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      zoomControl: false
    }).addTo(this._map);
    this._map.addControl(control.zoom({position: 'bottomright'}));
    this._map.invalidateSize(false);
  }

  updated() {
    if (this._map !== undefined) {
      this._map.panTo(new LatLng(this.latitude, this.longitude));
      this._map.setZoom(this.zoom);
      this._map.invalidateSize(false);
    }
  }
}

window.customElements.define('grampsjs-map', GrampsjsMap);
