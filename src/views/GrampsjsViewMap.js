import { html, css } from 'lit';

import { GrampsjsView } from './GrampsjsView.js';
import '../components/GrampsjsMap.js';
import '../components/GrampsjsMapMarker.js';
import { apiGet, getMediaUrl } from '../api.js';
import '@material/mwc-textfield';

export class GrampsjsViewMap extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
        }
      `,
    ];
  }

  static get properties() {
    return {
      _data: { type: Array },
      _dataLayers: { type: Array },
      _selected: { type: String },
    };
  }

  constructor() {
    super();
    this._data = [];
    this._dataLayers = [];
    this._selected = '';
  }

  renderContent() {
    if (this._data.length === 0) {
      return html``;
    }
    const center = this._getMapCenter();
    return html`
      <grampsjs-map
        layerSwitcher
        width="100%"
        height="calc(100vh - 64px)"
        latitude="${center[0]}"
        longitude="${center[1]}"
        mapid="map-mapview"
        id="map"
        zoom="6"
        >${this._renderMarkers()}${this._renderLayers()}</grampsjs-map
      >
    `;
  }

  update(changed) {
    super.update(changed);
    if (changed.has('active') && this.active) {
      const mapel = this.shadowRoot.getElementById('map');
      if (mapel !== null) {
        mapel._map.invalidateSize(false);
      }
    }
  }

  _renderLayers() {
    return html`
      ${this._dataLayers.map(
        obj => html`
          <grampsjs-map-overlay
            url="${getMediaUrl(obj.handle)}"
            title="${obj.desc}"
            bounds="${obj.attribute_list.filter(
              attr => attr.type === 'map:bounds'
            )[0].value}"
          ></grampsjs-map-overlay>
        `
      )}
    `;
  }

  _renderMarkers() {
    return this._data.map(obj => {
      if (
        obj?.profile?.lat === null ||
        obj?.profile?.lat === undefined ||
        obj?.profile?.long === null ||
        obj?.profile?.long === undefined ||
        (obj?.profile?.lat === 0 && obj?.profile?.long === 0)
      ) {
        return html``;
      }
      return html` <grampsjs-map-marker
        latitude="${obj.profile.lat}"
        longitude="${obj.profile.long}"
        popup="<a href='place/${obj.profile.gramps_id}'>${obj.profile.name}</a>"
      ></grampsjs-map-marker>`;
    });
  }

  firstUpdated() {
    this._fetchData();
    this._fetchDataLayers();
  }

  _fetchDataAll() {
    this._fetchData();
    this._fetchDataLayers();
  }

  async _fetchData() {
    const data = await apiGet(
      `/api/places/?locale=${this.strings?.__lang__ || 'en'}&profile=all`
    );
    this.loading = false;
    if ('data' in data) {
      this.error = false;
      this._data = data.data;
    } else if ('error' in data) {
      this.error = true;
      this._errorMessage = data.error;
    }
  }

  async _fetchDataLayers() {
    const rules = {
      rules: [
        {
          name: 'HasAttribute',
          values: ['map:bounds', '*'],
          regex: true,
        },
      ],
    };
    const data = await apiGet(
      `/api/media/?rules=${encodeURIComponent(JSON.stringify(rules))}`
    );
    this.loading = false;
    if ('data' in data) {
      this.error = false;
      this._dataLayers = data.data;
    } else if ('error' in data) {
      this.error = true;
      this._errorMessage = data.error;
    }
  }

  _getMapCenter() {
    if (this._data.length === 0) {
      return [0, 0];
    }
    let x = 0;
    let y = 0;
    let n = 0;
    for (let i = 0; i < this._data.length; i += 1) {
      const p = this._data[i];
      if (
        p?.profile?.lat !== undefined &&
        p?.profile?.lat !== null &&
        (p?.profile?.lat !== 0 || p?.profile?.long !== 0)
      ) {
        x += p.profile.lat;
        y += p.profile.long;
        n += 1;
      }
    }
    x /= n;
    y /= n;
    return [x, y];
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('db:changed', () => this._fetchDataAll());
  }
}

window.customElements.define('grampsjs-view-map', GrampsjsViewMap);
