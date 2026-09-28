import {html, css} from 'lit'
import '@material/mwc-textfield'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import '../components/GrampsjsMapPersonLinesLayer.js'
import '../components/GrampsjsMapPlacesLayer.js'
import {WIKIDATA_LAYER_HANDLE} from '../components/GrampsjsMapWikidataLayer.js'
import '../components/GrampsjsWikidataBuildingBox.js'
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
  apiVersionAtLeast,
  isDateBetweenYears,
  getGregorianYears,
  personProfileDisplayName,
} from '../util.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {queryNominatim, getMapViewport, saveMapViewport} from '../api.js'
import {WIKIDATA_MIN_ZOOM} from '../wikidata.ts'
import {WikidataBuildingsController} from '../wikidataBuildingsController.ts'

const EMPTY_ARRAY = []

const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2

export class GrampsjsViewMap extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
        }

        .wikidata-hint {
          position: absolute;
          bottom: 44px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 13px;
          background: var(--md-sys-color-surface-container-high);
          color: var(--md-sys-color-on-surface);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
          pointer-events: none;
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
      _selectedWikidata: {type: Object},
      _zoom: {type: Number},
    }
  }

  constructor() {
    super()
    this._dataPlaces = []
    this._dataEvents = []
    this._filteredPlaces = []
    this._handlesHighlight = []
    this._dataLayers = []
    // The Wikidata building layer is off until the user switches it on.
    this._hiddenOverlaysHandles = [WIKIDATA_LAYER_HANDLE]
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
    this._selectedWikidata = null
    this._zoom = getMapViewport()?.zoom ?? DEFAULT_ZOOM
    this._wikidata = new WikidataBuildingsController(this)
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
      if (e.detail.handle) this._selectedWikidata = null
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
    const saved = getMapViewport()
    const zoom = saved ? saved.zoom : DEFAULT_ZOOM
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
        @map:load="${this._handleMapLoad}"
        @map:moveend="${this._handleMoveEnd}"
        @map:overlay-toggle="${this._handleOverlayToggle}"
        @map:marker-clicked="${this._handleMapMarkerClicked}"
        @map:wikidata-clicked="${this._handleWikidataClicked}"
        id="map"
        zoom="${zoom}"
        >${this._renderLayers()} ${this._renderWikidataLayer()}
        <grampsjs-map-person-lines-layer
          .events="${this._selectedPersonData?.extended?.events ?? EMPTY_ARRAY}"
          .places="${this._selectedPersonData ? this._dataPlaces : EMPTY_ARRAY}"
        ></grampsjs-map-person-lines-layer>
        <grampsjs-map-places-layer
          .places="${this._placesForMap}"
          .highlightedHandles="${this._handlesHighlight}"
        ></grampsjs-map-places-layer
      ></grampsjs-map>
      ${this._wikidataVisible && this._zoom < WIKIDATA_MIN_ZOOM
        ? html`<div class="wikidata-hint">
            ${this._('Zoom in to see Wikidata buildings')}
          </div>`
        : ''}
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
    if (this._selectedWikidata) {
      return html`
        <grampsjs-wikidata-building-box
          qid="${this._selectedWikidata.qid}"
          label="${this._selectedWikidata.label}"
          .appState="${this.appState}"
        ></grampsjs-wikidata-building-box>
      `
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
    const prevLang = changed.get('appState')?.i18n?.lang
    if (
      changed.has('appState') &&
      prevLang !== undefined &&
      prevLang !== this.appState?.i18n?.lang
    ) {
      this._updateWikidataBuildings({immediate: true})
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
    if (overlay.handle === WIKIDATA_LAYER_HANDLE) {
      if (visible) {
        this._updateWikidataBuildings({immediate: true})
      } else {
        this._wikidata.cancel()
        if (this._selectedWikidata) this._clearSearchBox()
      }
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
    this._selectedWikidata = null
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
    this._selectedWikidata = null
  }

  _handlePersonSelected(person) {
    this._activeSearchQuery = ''
    this._valueSearch = personProfileDisplayName(person.profile)
    this._selectedWikidata = null
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

  _handleWikidataClicked(e) {
    const {qid, label} = e.detail
    this._activeSearchQuery = ''
    this._selectedPerson = null
    this._selectedPersonData = null
    this._personPlaceHandles = []
    this._handlesHighlight = []
    this._selectedWikidata = {qid, label}
    this._valueSearch = label
    this._searchbox?.showDetails()
  }

  _handlePlaceSelected(object, {flyTo = true} = {}) {
    this._activeSearchQuery = ''
    this._selectedPerson = null
    this._selectedWikidata = null
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
    const boundsAttr = obj.attribute_list?.find(
      attr => attr.type === 'map:bounds'
    )?.value
    let bounds = null
    if (boundsAttr) {
      try {
        bounds = JSON.parse(boundsAttr)
      } catch {
        bounds = null
      }
    }
    return html`
      <grampsjs-map-tile-layer
        handle="${obj.handle}"
        checksum="${obj.checksum}"
        .bounds="${bounds}"
        ?hidden="${this._hiddenOverlaysHandles.includes(obj.handle)}"
      ></grampsjs-map-tile-layer>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  get _wikidataEnabled() {
    return window.grampsjsConfig?.mapWikidata !== false
  }

  get _wikidataVisible() {
    return (
      this._wikidataEnabled &&
      !this._hiddenOverlaysHandles.includes(WIKIDATA_LAYER_HANDLE)
    )
  }

  _renderWikidataLayer() {
    if (!this._wikidataEnabled) return ''
    return html`
      <grampsjs-map-wikidata-layer
        .buildings="${this._wikidataVisible
          ? this._wikidata.buildings
          : EMPTY_ARRAY}"
        selectedQid="${this._selectedWikidata?.qid ?? ''}"
        year="${this._selectedPerson ? -1 : this._year}"
        yearSpan="${this._selectedPerson ? -1 : this._yearSpan}"
        ?hidden="${!this._wikidataVisible}"
      ></grampsjs-map-wikidata-layer>
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
    const overlays = visibleLayers.map(obj => ({
      handle: obj.handle,
      desc: obj.desc,
      visible: !this._hiddenOverlaysHandles.includes(obj.handle),
    }))
    if (!this._wikidataEnabled) return overlays
    return [
      ...overlays,
      {
        handle: WIKIDATA_LAYER_HANDLE,
        desc: this._('Wikidata buildings'),
        visible: this._wikidataVisible,
      },
    ]
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

  // The initial viewport is not saved: saving it would stop _fetchPlaces
  // from centring a first visit on the tree's places.
  _handleMapLoad(e) {
    this._bounds = e.detail.bounds
    this._zoom = e.detail.zoom
  }

  _handleMoveEnd(e) {
    this._bounds = e.detail.bounds
    const {center, zoom} = e.detail
    if (center && zoom != null) {
      saveMapViewport(center.lat, center.lng, zoom)
      this._zoom = zoom
    }
    this._updateWikidataBuildings()
  }

  _updateWikidataBuildings({immediate = false} = {}) {
    const bounds = this._bounds
    if (!this._wikidataVisible || typeof bounds?.getWest !== 'function') {
      return
    }
    const viewport = {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    }
    const lang = this.appState.i18n.lang || 'en'
    if (immediate) {
      this._wikidata.fetch(viewport, this._zoom, lang)
    } else {
      this._wikidata.scheduleFetch(viewport, this._zoom, lang)
    }
  }

  _applyPlaceFilter() {
    const filterFunction = place => {
      if (this._year > 0 && this._yearSpan > 0) {
        const placeEvents = this._eventsByPlace?.get(place.handle) ?? []
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

  // Places with the shape {handle, profile: {name, lat, long}}
  async _getPlaces() {
    if (apiVersionAtLeast(this.appState.dbInfo, 3, 23)) {
      const data = await this.appState.apiGet('/api/places/coordinates/')
      if (!('data' in data)) return data
      return {
        data: data.data.map(({handle, name, lat, long}) => ({
          handle,
          profile: {name, lat, long},
        })),
      }
    }
    return this.appState.apiGet(
      `/api/places/?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=self&place_hierarchy=0&keys=handle,profile`
    )
  }

  async _fetchPlaces() {
    const data = await this._getPlaces()
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataPlaces = data.data
      this._applyPlaceFilter()
      if (this._selectedPerson && this._personPlaceHandles.length) {
        this._fitPersonPlaces(this._personPlaceHandles)
      } else if (!this._handlesHighlight.length && !getMapViewport()) {
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
      this._eventsByPlace = new Map()
      for (const event of this._dataEvents) {
        const placeEvents = this._eventsByPlace.get(event.place) ?? []
        placeEvents.push(event)
        this._eventsByPlace.set(event.place, placeEvents)
      }
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
      const saved = getMapViewport()
      return saved ? [saved.lat, saved.lng] : DEFAULT_CENTER
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
      const saved = getMapViewport()
      return saved ? [saved.lat, saved.lng] : DEFAULT_CENTER
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
