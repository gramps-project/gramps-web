import {html, LitElement} from 'lit'
import 'leaflet'
import 'maplibre-gl'
import '@maplibre/maplibre-gl-leaflet'
import '@openhistoricalmap/maplibre-gl-dates'
import './GrampsjsMapOverlay.js'
import './GrampsjsMapMarker.js'
import {fireEvent} from '../util.js'
import '../LocateControl.js'

const {L} = window

const defaultConfig = {
  leafletTileUrl:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  leafletTileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors; <a href="https://carto.com/attributions">CARTO</a>',
  leafletTileSize: 256,
  leafletZoomOffset: 0,
  glStyle: 'https://www.openhistoricalmap.org/map-styles/main/main.json',
  glAttribution:
    '<a href="https://www.openhistoricalmap.org/">OpenHistoricalMap</a>',
}

class GrampsjsMap extends LitElement {
  render() {
    return html`
      <link rel="stylesheet" href="leaflet.css" />
      <link rel="stylesheet" href="L.Control.Locate.min.css" />

      <div
        class="mapcontainer"
        style="width:${this.width}; height:${this.height};"
      >
        <div id="${this.mapid}" style="z-index: 0; width: 100%; height: 100%;">
          <slot> </slot>
        </div>
      </div>
    `
  }

  static get styles() {
    return []
  }

  static get properties() {
    return {
      height: {type: String},
      width: {type: String},
      latitude: {type: Number},
      longitude: {type: Number},
      year: {type: Number},
      mapid: {type: String},
      zoom: {type: Number},
      latMin: {type: Number},
      latMax: {type: Number},
      longMin: {type: Number},
      longMax: {type: Number},
      layerSwitcher: {type: Boolean},
      locateControl: {type: Boolean},
      _map: {type: Object},
      _glMap: {type: Object},
      _layercontrol: {type: Object},
      _currentLayer: {type: String},
    }
  }

  constructor() {
    super()
    this.height = '500px'
    this.width = '100%'
    this.zoom = 13
    this.mapid = 'mapid'
    this.latitude = 0
    this.longitude = 0
    this.year = -1
    this.latMin = 0
    this.latMax = 0
    this.longMin = 0
    this.longMax = 0
    this.layerSwitcher = false
    this._currentLayer = 'OpenStreetMap'
  }

  firstUpdated() {
    const mapel = this.shadowRoot.getElementById(this.mapid)
    if (this.latMin === 0 && this.latMax === 0) {
      this._map = new L.Map(mapel, {zoomControl: false}).setView(
        [this.latitude, this.longitude],
        this.zoom
      )
    } else {
      this._map = new L.Map(mapel, {zoomControl: false}).fitBounds([
        [this.latMin, this.longMin],
        [this.latMax, this.longMax],
      ])
    }
    const config = {...defaultConfig, ...window.grampsjsConfig}
    const tileLayer = new L.TileLayer(config.leafletTileUrl, {
      attribution: config.leafletTileAttribution,
      tileSize: config.leafletTileSize,
      zoomOffset: config.leafletZoomOffset,
      maxZoom: 19,
      zoomControl: false,
    })
    tileLayer.addTo(this._map)
    this._gl = L.maplibreGL({
      style: config.glStyle,
      attribution: config.glAttribution,
    })
    this._map.addControl(L.control.zoom({position: 'bottomright'}))
    if (this.locateControl) {
      this._map.addControl(
        L.control.locate({position: 'bottomright', drawCircle: false})
      )
    }
    this._layercontrol = L.control.layers(
      {
        OpenHistoricalMap: this._gl,
        OpenStreetMap: tileLayer,
      },
      null,
      {
        position: 'bottomleft',
      }
    )
    if (this.layerSwitcher) {
      this._map.addControl(this._layercontrol)
    }
    this._map.on('baselayerchange', e => this._handleBaseLayerChange(e))
    this._map.invalidateSize(false)
    this._map.on('moveend', e => this._handleMoveEnd(e))
  }

  _handleBaseLayerChange(e) {
    this._currentLayer = e.name
    if (this._currentLayer === 'OpenHistoricalMap') {
      const mapLibreMap = this._gl.getMaplibreMap()
      mapLibreMap.on('styledata', () =>
        mapLibreMap.filterByDate(`${this.year}`)
      )
    }
    fireEvent(this, 'map:layerchange', {layer: this._currentLayer})
  }

  _handleMoveEnd(e) {
    fireEvent(this, 'map:moveend', {bounds: e.target.getBounds()})
  }

  panTo(latitude, longitude) {
    if (this._map !== undefined) {
      // eslint-disable-next-line new-cap
      this._map.panTo(new L.latLng(latitude, longitude))
    }
  }

  updated(changed) {
    if (
      changed.has('year') &&
      this.year > 0 &&
      this._currentLayer === 'OpenHistoricalMap'
    ) {
      this._gl.getMaplibreMap().filterByDate(`${this.year}`)
      return
    }
    if (
      this._map !== undefined &&
      (changed.has('latitude') ||
        changed.has('longitude') ||
        changed.has('mapid') ||
        changed.has('zoom'))
    ) {
      if (this.latMin === 0 && this.latMax === 0) {
        this._map.setZoom(this.zoom)
        // eslint-disable-next-line new-cap
        this._map.panTo(new L.latLng(this.latitude, this.longitude))
      } else {
        this._map.fitBounds([
          [this.latMin, this.longMin],
          [this.latMax, this.longMax],
        ])
      }
      this._map.invalidateSize(false)
    }
  }
}

window.customElements.define('grampsjs-map', GrampsjsMap)
