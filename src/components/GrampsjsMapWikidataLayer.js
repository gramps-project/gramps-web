import {LitElement} from 'lit'
import {fireEvent} from '../util.js'
import {WIKIDATA_MIN_ZOOM} from '../wikidata.ts'

export const WIKIDATA_LAYER_HANDLE = 'wikidata-buildings'

// Marker color, which --grampsjs-map-building-color overrides.
export const BUILDING_COLOR = '#8e24aa'

const SOURCE_ID = 'wikidata-buildings'
const LAYER_ID = 'wikidata-buildings-layer'

class GrampsjsMapWikidataLayer extends LitElement {
  static get properties() {
    return {
      buildings: {type: Array},
      selectedQid: {type: String},
      year: {type: Number},
      yearSpan: {type: Number},
      timeFilter: {type: Boolean},
      hidden: {type: Boolean},
      handle: {type: String},
    }
  }

  constructor() {
    super()
    this.buildings = []
    this.selectedQid = ''
    this.year = -1
    this.yearSpan = 0
    this.timeFilter = false
    this.hidden = false
    // Matched by GrampsjsMap when the layer switcher toggles this overlay.
    this.handle = WIKIDATA_LAYER_HANDLE
    this._map = null
    this._handlersAdded = false
    this._popup = null
  }

  // No shadow DOM — this component renders no UI.
  createRenderRoot() {
    return this
  }

  // Called by GrampsjsMap on initial map load.
  addToMap(map) {
    this._map = map
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    map.addSource(SOURCE_ID, {type: 'geojson', data: this._buildGeoJSON()})
    map.addLayer(this._layerSpec(), this._beforeId(map))
    if (!this._handlersAdded) {
      this._handlersAdded = true
      this._addHandlers(map)
    }
  }

  // Keep buildings under the tree's pins and lines.
  // eslint-disable-next-line class-methods-use-this
  _beforeId(map) {
    return (
      ['person-lines-layer', 'places-layer'].find(id => map.getLayer(id)) ??
      undefined
    )
  }

  _addHandlers(map) {
    this._popup = new window.maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
      className: 'grampsjs-place-tooltip',
    })
    map.on('click', LAYER_ID, e => {
      const feature = e.features?.[0]
      if (!feature || this._isOnTreePlace(e.point)) return
      fireEvent(this, 'map:wikidata-clicked', {
        qid: feature.properties.qid,
        label: feature.properties.label,
      })
    })
    map.on('mouseenter', LAYER_ID, e => {
      map.getCanvas().style.cursor = 'pointer'
      const feature = e.features?.[0]
      if (!feature || feature.properties.selected) return
      this._popup
        .setLngLat(feature.geometry.coordinates.slice())
        .setText(feature.properties.label)
        .addTo(map)
    })
    map.on('mouseleave', LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
      this._popup.remove()
    })
  }

  // A click on a tree place that covers a building belongs to the place.
  _isOnTreePlace(point) {
    if (!this._map.getLayer('places-layer')) return false
    return (
      this._map.queryRenderedFeatures(point, {layers: ['places-layer']})
        .length > 0
    )
  }

  // Called by GrampsjsMap inside setStyle's transformStyle callback so the
  // building source and layer are part of the new style from its first frame.
  getTransformStyleContribution(_prev, next) {
    return {
      ...next,
      sources: {
        ...next.sources,
        [SOURCE_ID]: {type: 'geojson', data: this._buildGeoJSON()},
      },
      layers: [...next.layers, this._layerSpec()],
    }
  }

  updated(changed) {
    if (!this._map) return
    if (changed.has('buildings') || changed.has('selectedQid')) {
      this._map.getSource(SOURCE_ID)?.setData(this._buildGeoJSON())
    }
    if (!this._map.getLayer(LAYER_ID)) return
    if (
      changed.has('year') ||
      changed.has('yearSpan') ||
      changed.has('timeFilter')
    ) {
      this._map.setFilter(LAYER_ID, this._yearFilter())
    }
    if (changed.has('hidden')) {
      this._map.setLayoutProperty(
        LAYER_ID,
        'visibility',
        this.hidden ? 'none' : 'visible'
      )
      if (this.hidden) this._popup?.remove()
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._popup?.remove()
    if (this._map?.getLayer(LAYER_ID)) this._map.removeLayer(LAYER_ID)
    if (this._map?.getSource(SOURCE_ID)) this._map.removeSource(SOURCE_ID)
  }

  _layerSpec() {
    const filter = this._yearFilter()
    return {
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      minzoom: WIKIDATA_MIN_ZOOM,
      layout: {visibility: this.hidden ? 'none' : 'visible'},
      paint: this._paint(),
      ...(filter ? {filter} : {}),
    }
  }

  // Shows buildings that existed at some point within the selected years,
  // while the time filter is switched on. Buildings without dates are always
  // shown.
  _yearFilter() {
    if (!this.timeFilter || !(this.year > 0)) return null
    const span = this.yearSpan
    return [
      'all',
      [
        'any',
        ['!', ['has', 'inception']],
        ['<=', ['get', 'inception'], this.year + span],
      ],
      [
        'any',
        ['!', ['has', 'demolished']],
        ['>=', ['get', 'demolished'], this.year - span],
      ],
    ]
  }

  _buildGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: (this.buildings || []).map(building => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [building.long, building.lat],
        },
        properties: {
          qid: building.qid,
          label: building.label,
          selected: building.qid === this.selectedQid,
          ...(building.inceptionYear === null
            ? {}
            : {inception: building.inceptionYear}),
          ...(building.demolishedYear === null
            ? {}
            : {demolished: building.demolishedYear}),
        },
      })),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _paint() {
    const color =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--grampsjs-map-building-color')
        .trim() || BUILDING_COLOR
    return {
      'circle-radius': ['case', ['get', 'selected'], 9, 5],
      'circle-color': color,
      'circle-opacity': 0.85,
      'circle-stroke-width': ['case', ['get', 'selected'], 3, 1],
      'circle-stroke-color': '#ffffff',
    }
  }
}

window.customElements.define(
  'grampsjs-map-wikidata-layer',
  GrampsjsMapWikidataLayer
)
