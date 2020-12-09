import { html, LitElement } from 'lit-element';
import { Marker, Icon } from '../../node_modules/leaflet/dist/leaflet-src.esm.js';

class GrampsjsMapMarker extends LitElement {
  render() {
    return html`
      <link rel="stylesheet" href="/leaflet.css">
      `
    }

    constructor() {
      super();
      this.popup = '';
    }


    static get properties() { return {
      latitude: { type: Number },
      longitude: { type: Number },
      popup: {type: String},
      _marker: {type: Object, attribute: false },
      _map: {type: Object, attribute: false }
    }}

    attributeChangedCallback(name, oldval, newval) {
      super.attributeChangedCallback(name, oldval, newval);
      this.updateMarker();
    }

    firstUpdated() {
      Icon.Default.imagePath = '/images/';
      this._map = this.parentElement._map;
      this.addMarker();
    }

    addMarker() {
      this._marker = new Marker([this.latitude, this.longitude]);
      this._marker.addTo(this._map);
      if (this.popup !== '') {
        this._marker.bindPopup(this.popup);
      }
    }

    disconnectedCallback() {
      this._map.removeLayer(this._marker);
      super.disconnectedCallback();
    }

    updateMarker() {
      if (this._marker) {
        this._map.removeLayer(this._marker);
        this.addMarker();
      }
    }
}

window.customElements.define('grampsjs-map-marker', GrampsjsMapMarker);
