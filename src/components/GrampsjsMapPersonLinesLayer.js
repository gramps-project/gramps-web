import {LitElement} from 'lit'

const SOURCE_ID = 'person-lines'
const LAYER_ID = 'person-lines-layer'
const ARROWS_LAYER_ID = 'person-lines-arrows'
const ARROW_IMAGE_ID = 'person-line-arrow'

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
    // Re-add the arrow image after every style swap (images don't survive setStyle).
    this._onStyleLoad = () => this._addArrowImage()
  }

  // No shadow DOM — this component renders no UI.
  createRenderRoot() {
    return this
  }

  addToMap(map) {
    this._map = map
    map.off('style.load', this._onStyleLoad)
    map.on('style.load', this._onStyleLoad)
    this._addArrowImage()
    if (map.getLayer(ARROWS_LAYER_ID)) map.removeLayer(ARROWS_LAYER_ID)
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    map.addSource(SOURCE_ID, {type: 'geojson', data: this._buildGeoJSON()})
    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: {'line-join': 'round', 'line-cap': 'round'},
      paint: this._linePaint(),
    })
    map.addLayer({
      id: ARROWS_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'symbol-placement': 'line-center',
        'icon-image': ARROW_IMAGE_ID,
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-color': this._color(),
        'icon-opacity': 0.9,
      },
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
          paint: this._linePaint(),
        },
        {
          id: ARROWS_LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'symbol-placement': 'line',
            'icon-image': ARROW_IMAGE_ID,
            'symbol-spacing': 200,
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
          },
          paint: {
            'icon-color': this._color(),
            'icon-opacity': 0.9,
          },
        },
      ],
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._map) {
      this._map.off('style.load', this._onStyleLoad)
      if (this._map.getLayer(ARROWS_LAYER_ID))
        this._map.removeLayer(ARROWS_LAYER_ID)
      if (this._map.getLayer(LAYER_ID)) this._map.removeLayer(LAYER_ID)
      if (this._map.getSource(SOURCE_ID)) this._map.removeSource(SOURCE_ID)
      if (this._map.hasImage(ARROW_IMAGE_ID))
        this._map.removeImage(ARROW_IMAGE_ID)
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

  // Draw a filled right-pointing triangle as a white SDF image so MapLibre can
  // tint it via icon-color at render time.
  _addArrowImage() {
    if (!this._map || this._map.hasImage(ARROW_IMAGE_ID)) return
    const canvas = document.createElement('canvas')
    canvas.width = 22
    canvas.height = 18
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(2, 2)
    ctx.lineTo(20, 9)
    ctx.lineTo(2, 16)
    ctx.closePath()
    ctx.fill()
    this._map.addImage(ARROW_IMAGE_ID, ctx.getImageData(0, 0, 22, 18), {
      sdf: true,
    })
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

  _color() {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--grampsjs-map-marker-color')
        .trim() || '#ea4335'
    )
  }

  _linePaint() {
    return {
      'line-color': this._color(),
      'line-width': 3,
      'line-opacity': 0.7,
    }
  }
}

window.customElements.define(
  'grampsjs-map-person-lines-layer',
  GrampsjsMapPersonLinesLayer
)
