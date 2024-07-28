/* eslint-disable lit/attribute-value-entities */
import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import '../components/GrampsjsMapMarker.js'
import '../components/GrampsjsMapSearchbox.js'
import '../components/GrampsjsMapTimeSlider.js'
import '../components/GrampsjsPlaceBox.js'
import {apiGet, getMediaUrl} from '../api.js'
import {isDateBetweenYears, getGregorianYears} from '../util.js'
import '@material/mwc-textfield'

// This is used for initial map center in absence of places
const languageCoordinates = {
  ar: [25, 45], // Arabic - Approximate center of Arab countries
  bg: [43, 25], // Bulgarian - Approximate center of Bulgaria
  br: [48, -3], // Breton - Approximate center of Brittany, France
  ca: [41, 2], // Catalan - Approximate center of Catalonia, Spain
  cs: [49, 15], // Czech - Approximate center of Czech Republic
  da: [56, 10], // Danish - Approximate center of Denmark
  de: [51, 9], // German - Approximate center of Germany
  el: [39, 22], // Greek - Approximate center of Greece
  en: [52, -1], // English - Approximate center of England, United Kingdom
  eo: [41, 0], // Esperanto - Approximate center of Europe
  es: [40, -4], // Spanish - Approximate center of Spain
  fi: [64, 26], // Finnish - Approximate center of Finland
  fr: [46, 2], // French - Approximate center of France
  ga: [53, -8], // Irish - Approximate center of Ireland
  he: [32, 35], // Hebrew - Approximate center of Israel
  hr: [45, 16], // Croatian - Approximate center of Croatia
  hu: [47, 19], // Hungarian - Approximate center of Hungary
  is: [65, -18], // Icelandic - Approximate center of Iceland
  it: [42, 12], // Italian - Approximate center of Italy
  ja: [36, 138], // Japanese - Approximate center of Japan
  lt: [55, 24], // Lithuanian - Approximate center of Lithuania
  mk: [42, 21], // Macedonian - Approximate center of North Macedonia
  nb: [62, 10], // Norwegian Bokmål - Approximate center of Norway
  nl: [52, 5], // Dutch - Approximate center of Netherlands
  nn: [62, 10], // Norwegian Nynorsk - Approximate center of Norway
  pl: [52, 20], // Polish - Approximate center of Poland
  pt: [39, -8], // Portuguese - Approximate center of Portugal
  ro: [46, 25], // Romanian - Approximate center of Romania
  ru: [60, 100], // Russian - Approximate center of Russia
  sk: [48, 19], // Slovak - Approximate center of Slovakia
  sl: [46, 14], // Slovenian - Approximate center of Slovenia
  sq: [41, 20], // Albanian - Approximate center of Albania
  sr: [44, 21], // Serbian - Approximate center of Serbia
  sv: [62, 16], // Swedish - Approximate center of Sweden
  ta: [11, 78], // Tamil - Approximate center of Tamil Nadu, India
  tr: [39, 35], // Turkish - Approximate center of Turkey
  uk: [49, 31], // Ukrainian - Approximate center of Ukraine
  vi: [16, 106], // Vietnamese - Approximate center of Vietnam
  zh: [35, 105], // Chinese - Approximate center of China
  ko: [38, 128], // Korean - Approximate center of Korea
}

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
      _dataPlaces: {type: Array},
      _dataEvents: {type: Array},
      _filteredPlaces: {type: Array},
      _handlesHighlight: {type: Array},
      _dataSearch: {type: Array},
      _dataLayers: {type: Array},
      _selected: {type: String},
      _valueSearch: {type: String},
      _bounds: {type: Object},
      _placeFilters: {type: Object},
      _year: {type: Number},
      _yearSpan: {type: Number},
      _currentLayer: {type: String},
      _minYear: {type: Number},
    }
  }

  constructor() {
    super()
    this._dataPlaces = []
    this._dataEvents = []
    this._filteredPlaces = []
    this._handlesHighlight = []
    this._dataSearch = []
    this._dataLayers = []
    this._selected = ''
    this._valueSearch = ''
    this._bounds = {}
    this._placeFilters = {}
    this._year = -1
    this._yearSpan = -1
    this._currentLayer = ''
    this._minYear = 1500
  }

  renderContent() {
    const center = this._getMapCenter()
    return html`
      <grampsjs-map
        layerSwitcher
        locateControl
        width="100%"
        height="calc(100vh - 64px - 36px)"
        latitude="${center[0]}"
        longitude="${center[1]}"
        year="${this._year}"
        mapid="map-mapview"
        @map:layerchange="${this._handleLayerChange}"
        @map:moveend="${this._handleMoveEnd}"
        id="map"
        zoom="6"
        >${this._renderMarkers()}${this._renderLayers()}</grampsjs-map
      >
      <grampsjs-map-searchbox
        @mapsearch:input="${this._handleSearchInput}"
        @mapsearch:clear="${this._handleSearchClear}"
        @mapsearch:selected="${this._handleSearchSelected}"
        @placefilter:changed="${this._handlePlaceFilterChanged}"
        .data="${this._dataSearch}"
        .strings="${this.strings}"
        .placeFilters="${this._placeFilters}"
        value="${this._valueSearch}"
        >${this._renderPlaceDetails()}</grampsjs-map-searchbox
      >
      <grampsjs-map-time-slider
        min="${this._minYear}"
        ?filterMap="${this._currentLayer === 'OpenHistoricalMap'}"
        @timeslider:change="${this._handleTimeSliderChange}"
        .strings="${this.strings}"
      ></grampsjs-map-time-slider>
    `
  }

  _renderPlaceDetails() {
    if (this._handlesHighlight.length === 0) {
      return ''
    }
    const [handle] = this._handlesHighlight
    const [object] = this._dataPlaces.filter(obj => obj.handle === handle)
    if (object === undefined) {
      this._clearSearchBox()
      return ''
    }
    return html`
      <grampsjs-place-box
        .data="${object}"
        .strings="${this.strings}"
      ></grampsjs-place-box>
    `
  }

  _handleLayerChange(e) {
    this._currentLayer = e.detail.layer
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      const mapel = this.shadowRoot.getElementById('map')
      if (mapel !== null && mapel._map !== undefined) {
        mapel._map.invalidateSize(false)
      }
      const searchbox = this.shadowRoot.querySelector('grampsjs-map-searchbox')
      if (searchbox !== null) {
        searchbox.focus()
      }
    }
  }

  _handleTimeSliderChange(event) {
    this._year = event.detail.value
    this._yearSpan = event.detail.span
    this._applyPlaceFilter()
  }

  _handlePlaceFilterChanged(event) {
    this._placeFilters = {...event.detail}
    this._applyPlaceFilter()
  }

  _handleSearchInput(event) {
    this._fetchDataSearch(event.detail.value)
  }

  _handleSearchClear() {
    this._dataSearch = []
    this._valueSearch = ''
    this._handlesHighlight = []
  }

  _clearSearchBox() {
    const box = this.renderRoot.querySelector('grampsjs-map-searchbox')
    if (box !== undefined) {
      box.clear()
    }
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
      if (this.getZoom() < 14) {
        this.setZoom(14)
      }
      this.panTo(this.latitude, this.longitude)
    }
  }

  panTo(latitude, longitude) {
    const map = this.renderRoot.querySelector('grampsjs-map')
    map.panTo(latitude, longitude)
  }

  setZoom(zoom) {
    const map = this.renderRoot.querySelector('grampsjs-map')
    map._map.setZoom(zoom)
  }

  getZoom() {
    const map = this.renderRoot.querySelector('grampsjs-map')
    return map._map.getZoom()
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
    const filteredHandles = this._filteredPlaces.map(place => place.handle)
    // places which are highlighted but hidden by a filter: show anyway!
    const highlightedFilteredPlaces = this._dataPlaces.filter(
      place =>
        this._handlesHighlight.includes(place.handle) &&
        !filteredHandles.includes(place.handle)
    )
    const places = [...this._filteredPlaces, ...highlightedFilteredPlaces]
    return places.map(obj => {
      if (
        obj?.profile?.lat === null ||
        obj?.profile?.lat === undefined ||
        Number.isNaN(parseFloat(obj?.profile?.lat)) ||
        obj?.profile?.long === null ||
        obj?.profile?.long === undefined ||
        Number.isNaN(parseFloat(obj?.profile?.long)) ||
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

  _applyPlaceFilter() {
    const enabledFilters = Object.keys(this._placeFilters).filter(
      key => !!this._placeFilters[key]
    )
    const filterFunction = place => {
      if (enabledFilters.includes('hasEvent')) {
        if (place?.backlinks?.event?.length === undefined) return false
      }
      if (this._year > 0 && this._yearSpan > 0) {
        const placeEvents =
          place?.backlinks?.event?.map(handle =>
            this._dataEvents?.find(event => event.handle === handle)
          ) ?? []
        if (placeEvents.length === 0) return false
        const yearMin = this._year - this._yearSpan
        const yearMax = this._year + this._yearSpan
        return placeEvents.some(event =>
          isDateBetweenYears(event?.date, yearMin, yearMax)
        )
      }
      return true
    }
    this._filteredPlaces = [
      ...this._dataPlaces.filter(place => filterFunction(place)),
    ]
  }

  firstUpdated() {
    this._fetchPlaces()
    this._fetchDataLayers()
    this._fetchEvents()
  }

  _fetchDataAll() {
    this._fetchPlaces()
    this._fetchDataLayers()
    this._fetchEvents()
  }

  async _fetchDataSearch(value) {
    const query = encodeURIComponent(
      `${value}*${window._oldSearchBackend ? ' AND type:place`' : ''}`
    )
    const locale = this.strings?.__lang__ || 'en'
    const data = await apiGet(
      `/api/search/?query=${query}&locale=${locale}&profile=self&page=1&pagesize=20${
        window._oldSearchBackend ? '' : '&type=place'
      }`
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

  async _fetchPlaces() {
    const data = await apiGet(
      `/api/places/?locale=${
        this.strings?.__lang__ || 'en'
      }&profile=self&backlinks=1`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataPlaces = data.data
      this._applyPlaceFilter()
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchEvents() {
    const data = await apiGet('/api/events/?keys=date,handle,place')
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataEvents = data.data.filter(event => event.place)
      this._minYear = this._getMinYear()
      this._applyPlaceFilter()
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _getMinYear() {
    const years = this._dataEvents
      ?.filter(event => event.place)
      ?.map(event => getGregorianYears(event.date)?.[0])
      ?.filter(y => y !== undefined)
    let minYear = Math.min(...years)
    const lastYear = new Date().getFullYear() - 1
    minYear = Math.min(minYear, lastYear)
    minYear = Math.max(minYear, 1) // disallow negative
    return minYear
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
    if (this._dataPlaces.length === 0) {
      const locale = this.strings?.__lang__ || 'en'
      return languageCoordinates[locale] || [0, 0]
    }
    let x = 0
    let y = 0
    let n = 0
    for (let i = 0; i < this._dataPlaces.length; i += 1) {
      const p = this._dataPlaces[i]
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
