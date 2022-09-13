/* eslint-disable lit/attribute-value-entities */
import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import '../components/GrampsjsMapMarker.js'
import '../components/GrampsjsMapSearchbox.js'
import '../components/GrampsjsPlaceBox.js'
import {apiGet, getMediaUrl} from '../api.js'
import '@material/mwc-textfield'

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
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _handlesHighlight: {type: Array},
      _dataSearch: {type: Array},
      _dataLayers: {type: Array},
      _selected: {type: String},
      _valueSearch: {type: String},
      _bounds: {type: Object},
    }
  }

  constructor() {
    super()
    this._data = []
    this._handlesHighlight = []
    this._dataSearch = []
    this._dataLayers = []
    this._selected = ''
    this._valueSearch = ''
    this._bounds = {}
  }

  renderContent() {
    if (this._data.length === 0) {
      return html``
    }
    const center = this._getMapCenter()
    return html`
      <grampsjs-map
        layerSwitcher
        width="100%"
        height="calc(100vh - 64px)"
        latitude="${center[0]}"
        longitude="${center[1]}"
        mapid="map-mapview"
        @map:moveend="${this._handleMoveEnd}"
        id="map"
        zoom="6"
        >${this._renderMarkers()}${this._renderLayers()}</grampsjs-map
      >
      <grampsjs-map-searchbox
        @mapsearch:input="${this._handleSearchInput}"
        @mapsearch:clear="${this._handleSearchClear}"
        @mapsearch:selected="${this._handleSearchSelected}"
        .data="${this._dataSearch}"
        value="${this._valueSearch}"
        >${this._renderPlaceDetails()}</grampsjs-map-searchbox
      >
    `
  }

  _renderPlaceDetails() {
    if (this._handlesHighlight.length === 0) {
      return ''
    }
    const [handle] = this._handlesHighlight
    const [object] = this._data.filter(obj => obj.handle === handle)
    return html`
      <grampsjs-place-box
        .data="${object}"
        .strings="${this.strings}"
      ></grampsjs-place-box>
    `
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      const mapel = this.shadowRoot.getElementById('map')
      if (mapel !== null) {
        mapel._map.invalidateSize(false)
      }
      const searchbox = this.shadowRoot.querySelector('grampsjs-map-searchbox')
      if (searchbox !== null) {
        searchbox.focus()
      }
    }
  }

  _handleSearchInput(event) {
    this._fetchDataSearch(event.detail.value)
  }

  _handleSearchClear() {
    this._dataSearch = []
    this._valueSearch = ''
    this._handlesHighlight = []
  }

  _handleSearchSelected(event) {
    const {object} = event.detail
    this._handlePlaceSelected(object)
  }

  _handleMarkerClick(object) {
    this._handlePlaceSelected(object)
  }

  _handlePlaceSelected(object) {
    this._dataSearch = []
    this._valueSearch = object.profile.name
    this._handlesHighlight = [object.handle]
    if (object.lat && object.long) {
      this.latitude = object.profile.lat
      this.longitude = object.profile.long
      this.panTo(this.latitude, this.longitude)
    }
  }

  panTo(latitude, longitude) {
    const map = this.renderRoot.querySelector('grampsjs-map')
    map.panTo(latitude, longitude)
  }

  _renderLayers() {
    return html` ${this._dataLayers.map(obj => this._renderMapLayer(obj))} `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderMapLayer(obj) {
    const bounds = obj.attribute_list.filter(
      attr => attr.type === 'map:bounds'
    )[0].value
    return html`
      <grampsjs-map-overlay
        url="${getMediaUrl(obj.handle)}"
        title="${obj.desc}"
        bounds="${bounds}"
        ?hidden="${!this._isLayerVisible(JSON.parse(bounds))}"
      ></grampsjs-map-overlay>
    `
  }

  _isLayerVisible(bounds) {
    if (Object.keys(this._bounds).length === 0) {
      return false
    }
    const mapBounds = [
      [this._bounds._southWest.lat, this._bounds._southWest.lng],
      [this._bounds._northEast.lat, this._bounds._northEast.lng],
    ]
    if (
      bounds[0][0] < mapBounds[1][0] &&
      bounds[1][0] > mapBounds[0][0] &&
      bounds[0][1] < mapBounds[1][1] &&
      bounds[1][1] > mapBounds[0][1]
    ) {
      return true
    }
    return false
  }

  _handleMoveEnd(e) {
    this._bounds = e.detail.bounds
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
        return html``
      }
      const highlighted = this._handlesHighlight.includes(obj.handle)
      return html` <grampsjs-map-marker
        latitude="${obj.profile.lat}"
        longitude="${obj.profile.long}"
        size="${highlighted ? 48 : 32}"
        opacity="${!highlighted && this._handlesHighlight.length > 0
          ? 0.55
          : 0.9}"
        popupLabel="<a href='place/${obj.profile.gramps_id}'>${obj.profile
          .name}</a>"
        @marker:clicked="${() => this._handleMarkerClick(obj)}"
      ></grampsjs-map-marker>`
    })
  }

  firstUpdated() {
    this._fetchData()
    this._fetchDataLayers()
  }

  _fetchDataAll() {
    this._fetchData()
    this._fetchDataLayers()
  }

  async _fetchDataSearch(value) {
    const query = encodeURIComponent(`${value}* AND type:place`)
    const locale = this.strings?.__lang__ || 'en'
    const data = await apiGet(
      `/api/search/?query=${query}&locale=${locale}&profile=self&page=1&pagesize=20`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataSearch = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchData() {
    const data = await apiGet(
      `/api/places/?locale=${this.strings?.__lang__ || 'en'}&profile=self`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
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
    }
    const data = await apiGet(
      `/api/media/?rules=${encodeURIComponent(JSON.stringify(rules))}`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataLayers = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _getMapCenter() {
    if (this._data.length === 0) {
      return [0, 0]
    }
    let x = 0
    let y = 0
    let n = 0
    for (let i = 0; i < this._data.length; i += 1) {
      const p = this._data[i]
      if (
        p?.profile?.lat !== undefined &&
        p?.profile?.lat !== null &&
        (p?.profile?.lat !== 0 || p?.profile?.long !== 0)
      ) {
        x += p.profile.lat
        y += p.profile.long
        n += 1
      }
    }
    x /= n
    y /= n
    return [x, y]
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', () => this._fetchDataAll())
  }
}

window.customElements.define('grampsjs-view-map', GrampsjsViewMap)
