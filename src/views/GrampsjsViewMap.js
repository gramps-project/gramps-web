import {html, css} from 'lit'
import '@material/mwc-textfield'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import '../components/GrampsjsMapPersonLinesLayer.js'
import '../components/GrampsjsMapPlacesLayer.js'
import {
  BUILDING_COLOR,
  WIKIDATA_LAYER_HANDLE,
} from '../components/GrampsjsMapWikidataLayer.js'
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
  getGregorianYears,
  personProfileDisplayName,
} from '../util.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {
  queryNominatim,
  getMapLayerSettings,
  getMapViewport,
  saveMapLayerSettings,
  saveMapViewport,
} from '../api.js'
import {WIKIDATA_MIN_ZOOM, countBuildingsInView} from '../wikidata.ts'
import {WikidataBuildingsController} from '../wikidataBuildingsController.ts'
import {countEventTypes, filterPlaces, yearRange} from '../mapFilters.js'

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
      _dataLayers: {type: Array},
      _selected: {type: String},
      _valueSearch: {type: String},
      _searchFilter: {type: String},
      _selection: {type: Object},
      _hoveredPlace: {type: String},
      _bounds: {type: Object},
      _year: {type: Number},
      _yearSpan: {type: Number},
      _timeFilter: {type: Boolean},
      _eventTypes: {type: Array},
      _availableEventTypes: {type: Array},
      _mapStyle: {type: String},
      _minYear: {type: Number},
      _hiddenOverlaysHandles: {type: Array},
      _zoom: {type: Number},
    }
  }

  constructor() {
    super()
    this._dataPlaces = []
    this._dataEvents = []
    this._filteredPlaces = []
    this._dataLayers = []
    const layerSettings = getMapLayerSettings()
    // The Wikidata building layer is off until the user switches it on.
    this._hiddenOverlaysHandles = layerSettings?.hiddenOverlays ?? [
      WIKIDATA_LAYER_HANDLE,
    ]
    this._mapStyle = layerSettings?.style ?? 'base'
    this._selected = ''
    this._valueSearch = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    // What the details panel shows: null or one of
    // {type: 'place', handle}
    // {type: 'person', person, data, placeHandles}, where data and
    //   placeHandles are filled in once the person has loaded
    // {type: 'wikidata', qid, label}
    this._selection = null
    // A place the person panel points at while a person is selected.
    this._hoveredPlace = ''
    // Intentionally non-reactive: only read on filter-change events, never
    // needs to trigger a re-render on its own.
    this._activeSearchQuery = ''
    this._bounds = {}
    // The year of the slider: the historical map's date and the centre of the
    // time filter.
    this._year = new Date().getFullYear() - 50
    this._yearSpan = 50
    // Whether places are filtered to _year ± _yearSpan.
    this._timeFilter = false
    // Selected event types; places need an event of one of them.
    this._eventTypes = []
    // Event types occurring in the tree, most frequent first.
    this._availableEventTypes = []
    this._minYear = 1500
    this._pendingPlace = null
    this._pendingPerson = null
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
    this._boundPlaceActive = e => this._handlePlaceActive(e)
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

  _handlePlaceActive(e) {
    this._hoveredPlace = e.detail.handle ?? ''
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

  _select(selection) {
    this._selection = selection
    this._hoveredPlace = ''
  }

  get _personSelection() {
    return this._selection?.type === 'person' ? this._selection : null
  }

  // The time filter does not apply while a person is selected.
  get _timeFilterActive() {
    return this._timeFilter && !this._personSelection
  }

  // The slider has an effect while it filters or dates the historical map.
  get _timeSliderEnabled() {
    return this._timeFilterActive || this._mapStyle === 'ohm'
  }

  get _highlightedHandles() {
    if (this._selection?.type === 'place') return [this._selection.handle]
    if (this._hoveredPlace) return [this._hoveredPlace]
    return EMPTY_ARRAY
  }

  get _placesForMap() {
    const highlightedHandles = new Set(this._highlightedHandles)
    const toMapPlace = obj => ({
      handle: obj.handle,
      name: obj.profile.name,
      lat: obj.profile.lat,
      long: obj.profile.long,
    })

    const personSelection = this._personSelection
    if (personSelection) {
      const personHandles = new Set(personSelection.placeHandles)
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
    const personData = this._personSelection?.data
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
        initialStyle="${this._mapStyle}"
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
          .events="${personData?.extended?.events ?? EMPTY_ARRAY}"
          .places="${personData ? this._dataPlaces : EMPTY_ARRAY}"
        ></grampsjs-map-person-lines-layer>
        <grampsjs-map-places-layer
          .places="${this._placesForMap}"
          .highlightedHandles="${this._highlightedHandles}"
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
        @map:filter-change="${this._handleFilterChange}"
        .appState="${this.appState}"
        year="${this._year}"
        yearSpan="${this._yearSpan}"
        ?timeFilter="${this._timeFilter}"
        .eventTypes="${this._availableEventTypes}"
        .selectedEventTypes="${this._eventTypes}"
        ?filtersSuspended="${Boolean(this._personSelection)}"
        value="${this._valueSearch}"
        >${this._renderPlaceDetails()}</grampsjs-map-searchbox
      >
      <grampsjs-map-time-slider
        min="${this._minYear}"
        value="${this._year}"
        span="${this._yearSpan}"
        ?timeFilter="${this._timeFilterActive}"
        ?disabled="${!this._timeSliderEnabled}"
        @timeslider:change="${this._handleTimeSliderChange}"
        .appState="${this.appState}"
      ></grampsjs-map-time-slider>
    `
  }

  _renderPlaceDetails() {
    const selection = this._selection
    if (selection?.type === 'person') {
      return this._renderPersonBox(selection)
    }
    if (selection?.type === 'wikidata') {
      return html`
        <grampsjs-wikidata-building-box
          qid="${selection.qid}"
          label="${selection.label}"
          .appState="${this.appState}"
        ></grampsjs-wikidata-building-box>
      `
    }
    if (selection?.type !== 'place') {
      return ''
    }
    const {handle} = selection
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

  _renderPersonBox({person, data}) {
    return html`
      <grampsjs-person-box
        handle="${data ? person.handle : ''}"
        name="${personProfileDisplayName(person.profile)}"
        .personData="${data}"
        .appState="${this.appState}"
      ></grampsjs-person-box>
    `
  }

  _handleLayerChange(e) {
    this._mapStyle = e.detail.style
    this._saveLayerSettings()
  }

  _saveLayerSettings() {
    saveMapLayerSettings({
      style: this._mapStyle,
      hiddenOverlays: this._hiddenOverlaysHandles,
    })
  }

  // A change from the filters panel or a filter chip: any of timeFilter,
  // yearSpan and eventTypes.
  _handleFilterChange(event) {
    const {timeFilter, yearSpan, eventTypes} = event.detail
    if (timeFilter !== undefined) this._timeFilter = timeFilter
    if (yearSpan !== undefined) this._yearSpan = yearSpan
    if (eventTypes !== undefined) this._eventTypes = eventTypes
    this._applyPlaceFilter()
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
    this._saveLayerSettings()
    if (overlay.handle === WIKIDATA_LAYER_HANDLE) {
      if (visible) {
        this._updateWikidataBuildings({immediate: true})
      } else {
        this._wikidata.cancel()
        if (this._selection?.type === 'wikidata') this._clearSearchBox()
      }
    }
  }

  _handleTimeSliderChange(event) {
    this._year = event.detail.value
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
    this._select(null)
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
    this._select(null)
  }

  _handlePersonSelected(person) {
    this._activeSearchQuery = ''
    this._valueSearch = personProfileDisplayName(person.profile)
    const selection = {type: 'person', person, data: null, placeHandles: []}
    this._select(selection)
    this._searchbox?.showDetails()
    this._highlightPersonPlaces(selection)
  }

  async _highlightPersonPlaces(selection) {
    const lang = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/people/${selection.person.handle}?extend=all&profile=all&locale=${lang}`
    )
    // Ignore the response if another selection was made in the meantime.
    if (this._selection !== selection) return
    if (!('data' in data)) {
      this._select(null)
      return
    }
    const extPerson = data.data
    const placeHandles = (extPerson.extended?.events || [])
      .map(event => event.place)
      .filter(Boolean)
    this._select({...selection, data: extPerson, placeHandles})
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
    this._select({type: 'wikidata', qid, label})
    this._valueSearch = label
    this._searchbox?.showDetails()
  }

  _handlePlaceSelected(object, {flyTo = true} = {}) {
    this._activeSearchQuery = ''
    this._valueSearch = object.profile.name
    this._select({type: 'place', handle: object.handle})
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
        selectedQid="${this._selection?.type === 'wikidata'
          ? this._selection.qid
          : ''}"
        year="${this._year}"
        yearSpan="${this._yearSpan}"
        ?timeFilter="${this._timeFilterActive}"
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
      group: 'own',
      thumbnail: {handle: obj.handle, checksum: obj.checksum, mime: obj.mime},
    }))
    if (!this._wikidataEnabled) return overlays
    return [
      ...overlays,
      {
        handle: WIKIDATA_LAYER_HANDLE,
        desc: this._('Wikidata buildings'),
        visible: this._wikidataVisible,
        group: 'external',
        color: `var(--grampsjs-map-building-color, ${BUILDING_COLOR})`,
        status: this._wikidataStatus,
      },
    ]
  }

  get _wikidataStatus() {
    if (this._zoom < WIKIDATA_MIN_ZOOM) {
      return this._('Zoom in to see Wikidata buildings')
    }
    if (this._wikidata.loading) return this._('Loading...')
    const viewport = this._viewport
    if (!viewport) return ''
    const years = this._timeFilterActive
      ? {year: this._year, span: this._yearSpan}
      : null
    // A status only explains an empty map; visible buildings need none.
    const count = countBuildingsInView(
      this._wikidata.buildings,
      viewport,
      years
    )
    return count === 0 ? this._('No buildings here') : ''
  }

  // The current map bounds as {west, south, east, north}, once known.
  get _viewport() {
    const bounds = this._bounds
    if (typeof bounds?.getWest !== 'function') return null
    return {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    }
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
    // The saved layer settings can have the building layer switched on.
    this._updateWikidataBuildings({immediate: true})
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
    const viewport = this._viewport
    if (!this._wikidataVisible || !viewport) return
    const lang = this.appState.i18n.lang || 'en'
    if (immediate) {
      this._wikidata.fetch(viewport, this._zoom, lang)
    } else {
      this._wikidata.scheduleFetch(viewport, this._zoom, lang)
    }
  }

  _applyPlaceFilter() {
    this._filteredPlaces = filterPlaces(
      this._dataPlaces,
      this._eventsByPlace ?? new Map(),
      {
        years: yearRange(this._year, this._yearSpan, this._timeFilter),
        eventTypes: this._eventTypes,
      }
    )
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
      const personPlaceHandles = this._personSelection?.placeHandles ?? []
      if (personPlaceHandles.length) {
        this._fitPersonPlaces(personPlaceHandles)
      } else if (!this._highlightedHandles.length && !getMapViewport()) {
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
      '/api/events/?keys=date,handle,place,type'
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
      this._availableEventTypes = countEventTypes(this._dataEvents)
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
