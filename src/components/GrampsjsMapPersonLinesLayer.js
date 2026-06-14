import {LitElement} from 'lit'

const SOURCE_ID = 'person-lines'
const LAYER_ID = 'person-lines-layer'

class GrampsjsMapPersonLinesLayer extends LitElement {
  static get properties() {
    return {
      events: {type: Array},
      places: {type: Array},
    }
  }

  constructor() {
    super()
    this.events = []
    this.places = []
    this._map = null
  }

  // No shadow DOM — this component renders no UI.
  createRenderRoot() {
    return this
  }

  addToMap(map) {
    this._map = map
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    map.addSource(SOURCE_ID, {type: 'geojson', data: this._buildGeoJSON()})
    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: {'line-join': 'round', 'line-cap': 'round'},
      paint: this._paint(),
    })
  }

  getTransformStyleContribution(_prev, next) {
    return {
      ...next,
      sources: {
        ...next.sources,
        [SOURCE_ID]: {type: 'geojson', data: this._buildGeoJSON()},
      },
      layers: [
        ...next.layers,
        {
          id: LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: {'line-join': 'round', 'line-cap': 'round'},
          paint: this._paint(),
        },
      ],
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._map) {
      if (this._map.getLayer(LAYER_ID)) this._map.removeLayer(LAYER_ID)
      if (this._map.getSource(SOURCE_ID)) this._map.removeSource(SOURCE_ID)
    }
  }

  updated(changed) {
    if (changed.has('events') || changed.has('places')) {
      this._updateSource()
    }
  }

  _updateSource() {
    if (!this._map) return
    const source = this._map.getSource(SOURCE_ID)
    if (source) {
      source.setData(this._buildGeoJSON())
    } else if (this._map.isStyleLoaded()) {
      this.addToMap(this._map)
    }
  }

  _buildGeoJSON() {
    const placesById = Object.fromEntries(
      (this.places || [])
        .filter(p => {
          const lat = parseFloat(p?.profile?.lat)
          const lon = parseFloat(p?.profile?.long)
          return (
            !Number.isNaN(lat) &&
            !Number.isNaN(lon) &&
            !(lat === 0 && lon === 0)
          )
        })
        .map(p => [p.handle, p.profile])
    )

    // Only dated events (have sortval) with a known place and coordinates,
    // sorted chronologically. Events without a date are skipped (no line segment).
    const coords = (this.events || [])
      .filter(ev => ev.date?.sortval && ev.place && placesById[ev.place])
      .sort((a, b) => (a.date.sortval || 0) - (b.date.sortval || 0))
      .map(ev => {
        const p = placesById[ev.place]
        return [parseFloat(p.long), parseFloat(p.lat)]
      })

    if (coords.length < 2) return {type: 'FeatureCollection', features: []}

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {type: 'LineString', coordinates: coords},
          properties: {},
        },
      ],
    }
  }

  _paint() {
    const color =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--grampsjs-map-marker-color')
        .trim() || '#ea4335'
    return {
      'line-color': color,
      'line-width': 3,
      'line-opacity': 0.7,
    }
  }
}

window.customElements.define(
  'grampsjs-map-person-lines-layer',
  GrampsjsMapPersonLinesLayer
)
