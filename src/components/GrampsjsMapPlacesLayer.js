import {LitElement} from 'lit'
import {fireEvent} from '../util.js'

class GrampsjsMapPlacesLayer extends LitElement {
  static get properties() {
    return {
      places: {type: Array},
      highlightedHandles: {type: Array},
    }
  }

  constructor() {
    super()
    this.places = []
    this.highlightedHandles = []
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
    if (map.getLayer('places-layer')) map.removeLayer('places-layer')
    if (map.getSource('places')) map.removeSource('places')
    map.addSource('places', {type: 'geojson', data: this._buildGeoJSON()})
    map.addLayer({
      id: 'places-layer',
      type: 'circle',
      source: 'places',
      paint: this._paint(),
    })
    if (!this._handlersAdded) {
      this._handlersAdded = true
      this._popup = new window.maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
        className: 'grampsjs-place-tooltip',
      })
      map.on('click', 'places-layer', e => {
        const feature = e.features?.[0]
        if (!feature) return
        e.originalEvent.stopPropagation()
        fireEvent(this, 'map:marker-clicked', {
          handle: feature.properties.handle,
        })
      })
      map.on('mouseenter', 'places-layer', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature || feature.properties.highlighted) return
        const coords = feature.geometry.coordinates.slice()
        this._popup
          .setLngLat(coords)
          .setText(feature.properties.name)
          .addTo(map)
      })
      map.on('mouseleave', 'places-layer', () => {
        map.getCanvas().style.cursor = ''
        this._popup.remove()
      })
    }
  }

  // Called by GrampsjsMap inside setStyle's transformStyle callback so the
  // places source and layer are part of the new style from its very first frame.
  getTransformStyleContribution(_prev, next) {
    return {
      ...next,
      sources: {
        ...next.sources,
        places: {type: 'geojson', data: this._buildGeoJSON()},
      },
      layers: [
        ...next.layers,
        {
          id: 'places-layer',
          type: 'circle',
          source: 'places',
          paint: this._paint(),
        },
      ],
    }
  }

  updated(changed) {
    if (changed.has('places') || changed.has('highlightedHandles')) {
      this._updateSource()
    }
  }

  _updateSource() {
    if (!this._map) return
    const source = this._map.getSource('places')
    if (source) {
      source.setData(this._buildGeoJSON())
    } else if (this._map.isStyleLoaded()) {
      this.addToMap(this._map)
    }
  }

  _buildGeoJSON() {
    const anyHighlighted = this.highlightedHandles?.length > 0
    return {
      type: 'FeatureCollection',
      features: (this.places || []).map(place => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(place.long), parseFloat(place.lat)],
        },
        properties: {
          handle: place.handle,
          name: place.name,
          highlighted: (this.highlightedHandles || []).includes(place.handle),
          anyHighlighted,
        },
      })),
    }
  }

  _paint() {
    const markerColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--grampsjs-map-marker-color')
        .trim() || '#ea4335'
    return {
      'circle-radius': ['case', ['get', 'highlighted'], 14, 9],
      'circle-color': markerColor,
      'circle-opacity': [
        'case',
        ['get', 'highlighted'],
        1,
        ['case', ['boolean', ['get', 'anyHighlighted'], false], 0.55, 0.9],
      ],
      'circle-stroke-width': ['case', ['get', 'highlighted'], 3, 1.5],
      'circle-stroke-color': '#ffffff',
    }
  }
}

window.customElements.define(
  'grampsjs-map-places-layer',
  GrampsjsMapPlacesLayer
)
