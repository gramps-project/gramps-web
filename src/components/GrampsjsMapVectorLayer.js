import {LitElement} from 'lit'

// Default color of features without their own style, which
// --grampsjs-map-vector-color overrides.
export const VECTOR_COLOR = '#1e88e5'

const isGeometry = types => ['match', ['geometry-type'], types, true, false]

// Draws a GeoJSON FeatureCollection from a KML or GeoJSON media object.
// Features keep their own simplestyle colors (which togeojson derives from
// KML styles) where they have them.
class GrampsjsMapVectorLayer extends LitElement {
  static get properties() {
    return {
      handle: {type: String},
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.data = null
    this._map = null
  }

  // No shadow DOM — renders no UI.
  createRenderRoot() {
    return this
  }

  get _sourceId() {
    return `vector-${this.handle}`
  }

  get _layerIds() {
    const id = this._sourceId
    return [`${id}-fill`, `${id}-line`, `${id}-circle`]
  }

  get _sourceSpec() {
    return {
      type: 'geojson',
      data: this.data ?? {type: 'FeatureCollection', features: []},
    }
  }

  // eslint-disable-next-line class-methods-use-this
  get _color() {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--grampsjs-map-vector-color')
        .trim() || VECTOR_COLOR
    )
  }

  get _layerSpecs() {
    const color = this._color
    const [fillId, lineId, circleId] = this._layerIds
    const source = this._sourceId
    return [
      {
        id: fillId,
        type: 'fill',
        source,
        filter: isGeometry(['Polygon', 'MultiPolygon']),
        paint: {
          'fill-color': ['to-color', ['get', 'fill'], color],
          'fill-opacity': ['coalesce', ['get', 'fill-opacity'], 0.2],
        },
      },
      {
        id: lineId,
        type: 'line',
        source,
        filter: isGeometry([
          'LineString',
          'MultiLineString',
          'Polygon',
          'MultiPolygon',
        ]),
        layout: {'line-join': 'round', 'line-cap': 'round'},
        paint: {
          'line-color': ['to-color', ['get', 'stroke'], color],
          'line-width': ['coalesce', ['get', 'stroke-width'], 2],
          'line-opacity': ['coalesce', ['get', 'stroke-opacity'], 0.9],
        },
      },
      {
        id: circleId,
        type: 'circle',
        source,
        filter: isGeometry(['Point', 'MultiPoint']),
        paint: {
          'circle-color': ['to-color', ['get', 'marker-color'], color],
          'circle-radius': 6,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      },
    ]
  }

  // Called by GrampsjsMap after the map has loaded.
  addToMap(map) {
    this._map = map
    if (!this.handle) return
    this._removeFromMap()
    map.addSource(this._sourceId, this._sourceSpec)
    const beforeId = this._beforeId(map)
    this._layerSpecs.forEach(spec => map.addLayer(spec, beforeId))
  }

  // Keep the shapes under buildings, pins and lines even if this layer is
  // added after them.
  // eslint-disable-next-line class-methods-use-this
  _beforeId(map) {
    return (
      ['wikidata-buildings-layer', 'person-lines-layer', 'places-layer'].find(
        id => map.getLayer(id)
      ) ?? undefined
    )
  }

  // Called by GrampsjsMap inside setStyle's transformStyle callback so the
  // shapes are part of the new style spec from its very first frame.
  getTransformStyleContribution(_prev, next) {
    if (!this.handle) return next
    return {
      ...next,
      sources: {...next.sources, [this._sourceId]: this._sourceSpec},
      layers: [...next.layers, ...this._layerSpecs],
    }
  }

  _removeFromMap() {
    if (!this._map) return
    this._layerIds.forEach(id => {
      if (this._map.getLayer(id)) this._map.removeLayer(id)
    })
    if (this._map.getSource(this._sourceId)) {
      this._map.removeSource(this._sourceId)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._removeFromMap()
  }

  updated(changed) {
    if (!changed.has('data') || !this._map) return
    const source = this._map.getSource(this._sourceId)
    if (source) {
      source.setData(this._sourceSpec.data)
    } else if (this._map.isStyleLoaded()) {
      this.addToMap(this._map)
    }
  }
}

window.customElements.define(
  'grampsjs-map-vector-layer',
  GrampsjsMapVectorLayer
)
