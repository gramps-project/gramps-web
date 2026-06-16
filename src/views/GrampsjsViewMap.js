import {html, css} from 'lit'
import '@material/mwc-textfield'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import '../components/GrampsjsMapPersonLinesLayer.js'
import '../components/GrampsjsMapPlacesLayer.js'
import {
  DEFAULT_SEARCH_FILTER,
  TYPE_EXTERNAL,
  TYPE_PERSON,
} from '../components/GrampsjsMapSearchbox.js'
import '../components/GrampsjsMapTimeSlider.js'
import '../components/GrampsjsPlaceBox.js'
import '../components/GrampsjsPersonBox.js'
import '../components/GrampsjsMapTileLayer.js'
import {
  isDateBetweenYears,
  getGregorianYears,
  personProfileDisplayName,
} from '../util.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {queryNominatim} from '../api.js'

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
  id: [-5, 120], // Indonesian - Approximate center of Indonesia
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

export class GrampsjsViewMap extends GrampsjsStaleDataMixin(GrampsjsView) {
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
      _dataLayers: {type: Array},
      _selected: {type: String},
      _valueSearch: {type: String},
      _searchFilter: {type: String},
      _selectedPerson: {type: Object},
      _bounds: {type: Object},
      _year: {type: Number},
      _yearSpan: {type: Number},
      _currentLayer: {type: String},
      _minYear: {type: Number},
      _hiddenOverlaysHandles: {type: Array},
      _personPlaceHandles: {type: Array},
      _selectedPersonData: {type: Object},
    }
  }

  constructor() {
    super()
    this._dataPlaces = []
    this._dataEvents = []
    this._filteredPlaces = []
    this._handlesHighlight = []
    this._dataLayers = []
    this._hiddenOverlaysHandles = []
    this._personPlaceHandles = []
    this._selected = ''
    this._valueSearch = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    this._selectedPerson = null
    this._selectedPersonData = null
    // Intentionally non-reactive: only read on filter-change events, never
    // needs to trigger a re-render on its own.
    this._activeSearchQuery = ''
    this._bounds = {}
    this._year = -1
    this._yearSpan = -1
    this._currentLayer = ''
    this._minYear = 1500
    this._pendingPlace = null
    this._pendingPerson = null
  }

  get _searchbox() {
    return this.renderRoot?.querySelector('grampsjs-map-searchbox')
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundPlaceSelected = e => this._handleExternalPlaceSelected(e)
    this._boundPersonSelected = e => this._handleExternalPersonSelected(e)
    this._boundPlaceActive = e => {
      this._handlesHighlight = e.detail.handle ? [e.detail.handle] : []
    }
    window.addEventListener('map:place-selected', this._boundPlaceSelected)
    window.addEventListener('map:person-selected', this._boundPersonSelected)
    window.addEventListener('map:place-active', this._boundPlaceActive)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('map:place-selected', this._boundPlaceSelected)
    window.removeEventListener('map:person-selected', this._boundPersonSelected)
    window.removeEventListener('map:place-active', this._boundPlaceActive)
  }

  _handleExternalPlaceSelected({detail}) {
    this._pendingPlace = detail
    this._applyPendingPlace()
  }

  _applyPendingPlace() {
    if (!this._pendingPlace) return
    if (!this._mapEl?._map) {
      requestAnimationFrame(() => this._applyPendingPlace())
      return
    }
    const place = this._pendingPlace
    this._pendingPlace = null
    // Defer one frame so the browser has computed layout after display:none →
    // display:block, then resize before flyTo so MapLibre knows its dimensions.
    requestAnimationFrame(() => {
      this._mapEl._map.resize()
      this._handlePlaceSelected(place)
    })
  }

  _handleExternalPersonSelected({detail: {person}}) {
    this._pendingPerson = person
    this._applyPendingPerson()
  }

  _applyPendingPerson() {
    if (!this._pendingPerson) return
    if (!this._mapEl?._map) {
      requestAnimationFrame(() => this._applyPendingPerson())
      return
    }
    const person = this._pendingPerson
    this._pendingPerson = null
    requestAnimationFrame(() => {
      this._mapEl._map.resize()
      this._handlePersonSelected(person)
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _hasCoords(obj) {
    const lat = parseFloat(obj?.profile?.lat)
    const long = parseFloat(obj?.profile?.long)
    return (
      obj?.profile?.lat != null &&
      !Number.isNaN(lat) &&
      obj?.profile?.long != null &&
      !Number.isNaN(long) &&
      !(lat === 0 && long === 0)
    )
  }

  get _placesForMap() {
    const highlightedHandles = new Set(this._handlesHighlight)
    const toMapPlace = obj => ({
      handle: obj.handle,
      name: obj.profile.name,
      lat: obj.profile.lat,
      long: obj.profile.long,
    })

    if (this._selectedPerson) {
      const personHandles = new Set(this._personPlaceHandles)
      return this._dataPlaces
        .filter(
          place => personHandles.has(place.handle) && this._hasCoords(place)
        )
        .map(toMapPlace)
    }

    const filteredHandles = new Set(
      this._filteredPlaces.map(place => place.handle)
    )
    const highlightedFilteredPlaces = this._dataPlaces.filter(
      place =>
        highlightedHandles.has(place.handle) &&
        !filteredHandles.has(place.handle)
    )
    return [...this._filteredPlaces, ...highlightedFilteredPlaces]
      .filter(p => this._hasCoords(p))
      .map(toMapPlace)
  }

  renderContent() {
    const center = this._getMapCenter()
    return html`
      <grampsjs-map
        .appState="${this.appState}"
        layerSwitcher
        locateControl
        width="100%"
        height="calc(100vh - 64px - 36px)"
        latitude="${center[0]}"
        longitude="${center[1]}"
        year="${this._year}"
        mapid="map-mapview"
        .overlays="${this._getOverlaysForLayerSwitcher()}"
        @map:layerchange="${this._handleLayerChange}"
        @map:moveend="${this._handleMoveEnd}"
        @map:overlay-toggle="${this._handleOverlayToggle}"
        @map:marker-clicked="${this._handleMapMarkerClicked}"
        id="map"
        zoom="6"
        >${this._renderLayers()}
        <grampsjs-map-person-lines-layer
          .events="${this._selectedPersonData?.extended?.events ?? []}"
          .places="${this._selectedPersonData ? this._dataPlaces : []}"
        ></grampsjs-map-person-lines-layer>
        <grampsjs-map-places-layer
          .places="${this._placesForMap}"
          .highlightedHandles="${this._handlesHighlight}"
        ></grampsjs-map-places-layer
      ></grampsjs-map>
      <grampsjs-map-searchbox
        @mapsearch:input="${this._handleSearchInput}"
        @mapsearch:clear="${this._handleSearchClear}"
        @mapsearch:selected="${this._handleSearchSelected}"
        @mapsearch:filter-change="${this._handleSearchFilterChange}"
        @searchbox:timechip-clear="${this._handleTimechipClear}"
        .appState="${this.appState}"
        year="${this._selectedPerson ? -1 : this._year}"
        yearSpan="${this._selectedPerson ? -1 : this._yearSpan}"
        value="${this._valueSearch}"
        >${this._renderPlaceDetails()}</grampsjs-map-searchbox
      >
      <grampsjs-map-time-slider
        min="${this._minYear}"
        @timeslider:change="${this._handleTimeSliderChange}"
        .appState="${this.appState}"
      ></grampsjs-map-time-slider>
    `
  }

  _renderPlaceDetails() {
    if (this._selectedPerson) {
      return this._renderPersonBox()
    }
    if (this._handlesHighlight.length === 0) {
      return ''
    }
    const [handle] = this._handlesHighlight
    if (
      this._dataPlaces.length > 0 &&
      !this._dataPlaces.find(p => p.handle === handle)
    ) {
      this._clearSearchBox()
      return ''
    }
    const name =
      this._dataPlaces.find(p => p.handle === handle)?.profile?.name ?? ''
    return html`
      <grampsjs-place-box
        handle="${handle}"
        name="${name}"
        .appState="${this.appState}"
      ></grampsjs-place-box>
    `
  }

  _renderPersonBox() {
    const person = this._selectedPerson
    return html`
      <grampsjs-person-box
        handle="${this._selectedPersonData ? person.handle : ''}"
        name="${personProfileDisplayName(person.profile)}"
        .personData="${this._selectedPersonData}"
        .appState="${this.appState}"
      ></grampsjs-person-box>
    `
  }

  _handleLayerChange(e) {
    this._currentLayer = e.detail.layer
  }

  _handleTimechipClear() {
    this.renderRoot.querySelector('grampsjs-map-time-slider')?.reset()
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('active') && this.active) {
      if (this._mapEl?._map) {
        this._mapEl._map.resize()
      }
      this._applyPendingPlace()
      this._applyPendingPerson()
      this._searchbox?.focus()
    }
  }

  _handleOverlayToggle(event) {
    const {overlay, visible} = event.detail
    if (visible) {
      this._hiddenOverlaysHandles = [
        ...this._hiddenOverlaysHandles.filter(
          handle => handle !== overlay.handle
        ),
      ]
    } else if (visible === false) {
      this._hiddenOverlaysHandles = [
        ...this._hiddenOverlaysHandles.filter(
          handle => handle !== overlay.handle
        ),
        overlay.handle,
      ]
    }
  }

  _handleTimeSliderChange(event) {
    this._year = event.detail.value
    this._yearSpan = event.detail.span
    this._applyPlaceFilter()
  }

  _handleSearchInput(event) {
    this._activeSearchQuery = event.detail.value
    this._fetchDataSearch(event.detail.value)
  }

  _handleSearchClear() {
    this._nominatimAbort?.abort()
    this.loading = false
    this._valueSearch = ''
    this._activeSearchQuery = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    this._handlesHighlight = []
    this._personPlaceHandles = []
    this._selectedPerson = null
    this._selectedPersonData = null
  }

  _clearSearchBox() {
    this._searchbox?.clear()
  }

  _handleSearchSelected(event) {
    const {object, object_type: objectType} = event.detail
    if (objectType === TYPE_PERSON) {
      this._handlePersonSelected(object)
    } else if (objectType === TYPE_EXTERNAL) {
      this._handleExternalSelected(object)
    } else {
      this._handlePlaceSelected(object)
    }
  }

  _handleExternalSelected(object) {
    const lat = parseFloat(object.lat)
    const lon = parseFloat(object.long)
    if (!isNaN(lat) && !isNaN(lon)) {
      this.flyTo(lat, lon)
    }
    this._activeSearchQuery = ''
    this._valueSearch = object.name || object.display_name || ''
    this._selectedPerson = null
    this._selectedPersonData = null
    this._personPlaceHandles = []
    this._handlesHighlight = []
  }

  _handlePersonSelected(person) {
    this._activeSearchQuery = ''
    this._valueSearch = personProfileDisplayName(person.profile)
    this._selectedPerson = person
    this._selectedPersonData = null
    this._personPlaceHandles = []
    this._searchbox?.showDetails()
    this._highlightPersonPlaces(person)
  }

  async _highlightPersonPlaces(person) {
    const lang = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/people/${person.handle}?extend=all&profile=all&locale=${lang}`
    )
    if (!('data' in data)) {
      this._selectedPerson = null
      return
    }
    if (this._selectedPerson?.handle !== person.handle) return
    const extPerson = data.data
    this._selectedPersonData = extPerson
    const placeHandles = (extPerson.extended?.events || [])
      .map(event => event.place)
      .filter(Boolean)
    this._personPlaceHandles = placeHandles
    this._handlesHighlight = []
    this._fitPersonPlaces(placeHandles)
  }

  _fitPersonPlaces(handles) {
    const handleSet = new Set(handles)
    const places = this._dataPlaces.filter(
      p => handleSet.has(p.handle) && this._hasCoords(p)
    )
    if (places.length === 0) return
    if (places.length === 1) {
      this.flyTo(
        parseFloat(places[0].profile.lat),
        parseFloat(places[0].profile.long)
      )
      return
    }
    const lats = places.map(p => parseFloat(p.profile.lat))
    const lngs = places.map(p => parseFloat(p.profile.long))
    this._mapEl?.fitBounds([
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ])
  }

  _handleSearchFilterChange(event) {
    this._searchFilter = event.detail.filter
    if (this._searchFilter !== TYPE_EXTERNAL) {
      this._nominatimAbort?.abort()
      this.loading = false
    }
    if (this._activeSearchQuery) {
      this._fetchDataSearch(this._activeSearchQuery)
    }
  }

  _handleMapMarkerClicked(e) {
    const place = this._dataPlaces.find(p => p.handle === e.detail.handle)
    if (place) this._handlePlaceSelected(place, {flyTo: false})
  }

  _handlePlaceSelected(object, {flyTo = true} = {}) {
    this._activeSearchQuery = ''
    this._selectedPerson = null
    this._valueSearch = object.profile.name
    this._handlesHighlight = [object.handle]
    this._searchbox?.showDetails()
    if (
      flyTo &&
      object.profile.lat != null &&
      object.profile.long != null &&
      !(object.profile.lat === 0 && object.profile.long === 0)
    ) {
      this.flyTo(object.profile.lat, object.profile.long)
    }
  }

  get _mapEl() {
    return this.renderRoot.querySelector('grampsjs-map')
  }

  flyTo(latitude, longitude) {
    this._mapEl.flyTo(latitude, longitude)
  }

  panTo(latitude, longitude) {
    this._mapEl.panTo(latitude, longitude)
  }

  setZoom(zoom) {
    this._mapEl._map.setZoom(zoom)
  }

  getZoom() {
    return this._mapEl._map.getZoom()
  }

  _renderLayers() {
    return html` ${this._dataLayers.map(obj => this._renderMapLayer(obj))} `
  }

  _renderMapLayer(obj) {
    return html`
      <grampsjs-map-tile-layer
        handle="${obj.handle}"
        ?hidden="${this._hiddenOverlaysHandles.includes(obj.handle)}"
      ></grampsjs-map-tile-layer>
    `
  }

  _getOverlaysForLayerSwitcher() {
    const visibleLayers = this._dataLayers.filter(obj =>
      this._isLayerVisible(
        JSON.parse(
          obj.attribute_list?.filter(attr => attr.type === 'map:bounds')?.[0]
            ?.value
        )
      )
    )
    return visibleLayers.map(obj => ({
      handle: obj.handle,
      desc: obj.desc,
      visible: !this._hiddenOverlaysHandles.includes(obj.handle),
    }))
  }

  _isLayerVisible(bounds) {
    if (Object.keys(this._bounds).length === 0) {
      return false
    }
    const mapBounds = this._bounds
    if (
      bounds[1][0] > mapBounds._sw.lat && // layer south > map south
      bounds[0][0] < mapBounds._ne.lat && // layer north < map north
      bounds[1][1] > mapBounds._sw.lng && // layer east > map west
      bounds[0][1] < mapBounds._ne.lng // layer west < map east
    ) {
      return true
    }
    return false
  }

  _handleMoveEnd(e) {
    // MapLibre GL JS provides bounds in format [west, south, east, north]
    this._bounds = e.detail.bounds
  }

  _applyPlaceFilter() {
    const filterFunction = place => {
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
    if (this._searchFilter === TYPE_EXTERNAL) {
      await this._fetchNominatim(value)
      return
    }
    const typeFilter = this._searchFilter || DEFAULT_SEARCH_FILTER
    const query = encodeURIComponent(
      `${value}*${
        window._oldSearchBackend
          ? ` AND (${typeFilter
              .split(',')
              .map(t => `type:${t}`)
              .join(' OR ')})`
          : ''
      }`
    )
    const locale = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/search/?query=${query}&locale=${locale}&profile=self&page=1&pagesize=20${
        window._oldSearchBackend ? '' : `&type=${typeFilter}`
      }`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._searchbox?.setResults(data.data)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      this._searchbox?.setResults([])
    }
  }

  async _fetchNominatim(value) {
    this._nominatimAbort?.abort()
    this._nominatimAbort = new AbortController()
    const lang = (this.appState.i18n.lang || 'en').replaceAll('_', '-')
    try {
      const res = await queryNominatim(value, {
        lang,
        signal: this._nominatimAbort.signal,
      })
      if (res.error) {
        this.error = true
        this._errorMessage =
          res.status === 429
            ? this._('Too many requests. Please try again later.')
            : this._('External search failed')
        this._searchbox?.setResults([])
      } else {
        this.error = false
        this._searchbox?.setResults(
          res.data.map(r => ({
            object_type: TYPE_EXTERNAL,
            object: {
              name: r.name,
              display_name: r.display_name,
              lat: r.lat,
              long: r.lon,
            },
          }))
        )
      }
    } catch (e) {
      return
    }
    this.loading = false
  }

  async _fetchPlaces() {
    const data = await this.appState.apiGet(
      `/api/places/?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=self&backlinks=1&place_hierarchy=0`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataPlaces = data.data
      this._applyPlaceFilter()
      if (this._selectedPerson && this._personPlaceHandles.length) {
        this._fitPersonPlaces(this._personPlaceHandles)
      } else if (!this._handlesHighlight.length) {
        const center = this._getMapCenter()
        this._mapEl?.jumpTo(center[0], center[1], 6)
      }
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchEvents() {
    const data = await this.appState.apiGet(
      '/api/events/?keys=date,handle,place'
    )
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
    const data = await this.appState.apiGet(
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
      const locale = this.appState.i18n.lang || 'en'
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
    if (n === 0) {
      const locale = this.appState.i18n.lang || 'en'
      return languageCoordinates[locale] || [0, 0]
    }
    x /= n
    y /= n
    return [x, y]
  }

  handleUpdateStaleData() {
    this._fetchDataAll()
  }
}

window.customElements.define('grampsjs-view-map', GrampsjsViewMap)
