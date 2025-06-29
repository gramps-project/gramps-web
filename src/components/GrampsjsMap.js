import {html, LitElement} from 'lit'
import 'maplibre-gl'
import '@openhistoricalmap/maplibre-gl-dates'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/checkbox/checkbox'

import './GrampsjsMapOverlay.js'
import './GrampsjsMapMarker.js'
import './GrampsjsMapLayerSwitcher.js'
import './GrampsjsIcon.js'
import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const defaultConfig = {
  glStyle: 'https://www.openhistoricalmap.org/map-styles/main/main.json',
  glAttribution:
    '<a href="https://maplibre.org/" target="_blank">MapLibre</a> | <a href="https://www.openhistoricalmap.org/">OpenHistoricalMap</a> contributors',
  baseStyle: 'https://tiles.openfreemap.org/styles/liberty',
  baseAttribution: '<a href="https://openfreemap.org">OpenFreeMap</a>',
}

const {maplibregl} = window

class GrampsjsMap extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles]
  }

  render() {
    return html`
      <link rel="stylesheet" href="maplibre-gl.css" />
      <div
        class="mapcontainer"
        style="width:${this.width}; height:${this.height};"
      >
        <div id="${this.mapid}" style="z-index: 0; width: 100%; height: 100%;">
          <slot> </slot>
        </div>
        <grampsjs-map-layer-switcher
          .appState="${this.appState}"
          .overlays="${this.overlays}"
          .currentStyle="${this._currentStyle}"
          @map:layerchange="${this._onStyleChange}"
          @map:overlay-toggle="${this._handleOverlayToggle}"
        ></grampsjs-map-layer-switcher>
      </div>
    `
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
      overlays: {type: Array},
      _map: {type: Object},
      _currentStyle: {type: String},
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
    this.overlays = []
    this._currentStyle = 'base'
  }

  firstUpdated() {
    const mapel = this.shadowRoot.getElementById(this.mapid)
    const config = {...defaultConfig, ...window.grampsjsConfig}
    const styleUrl =
      this._currentStyle === 'base' ? config.baseStyle : config.glStyle
    this._map = new maplibregl.Map({
      container: mapel,
      style: styleUrl,
      center: [this.longitude, this.latitude],
      zoom: this.zoom,
      attributionControl: true,
    })
    this._map.on('click', e => {
      const mapContainer = this._map.getContainer()

      const customEvent = new CustomEvent('mapclick', {
        detail: e,
        bubbles: true,
        composed: true,
      })

      mapContainer.dispatchEvent(customEvent)
    })
    this._map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    // Add geolocate control to the map controller
    this._map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'bottom-right'
    )
    this._map.on('load', () => {
      if (this.year > 0 && this._map.filterByDate) {
        this._map.filterByDate(`${this.year}`)
      }
      if (this.latMin !== 0 || this.latMax !== 0) {
        this._map.fitBounds([
          [this.longMin, this.latMin],
          [this.longMax, this.latMax],
        ])
      }
    })
    this._map.on('moveend', () => {
      fireEvent(this, 'map:moveend', {bounds: this._map.getBounds()})
    })
  }

  get _slottedChildren() {
    const slot = this.shadowRoot.querySelector('slot')
    return slot.assignedElements({flatten: true})
  }

  panTo(latitude, longitude) {
    if (this._map !== undefined) {
      this._map.panTo([longitude, latitude])
    }
  }

  updated(changed) {
    if (
      changed.has('year') &&
      this.year > 0 &&
      this._map &&
      this._map.isStyleLoaded &&
      this._map.isStyleLoaded()
    ) {
      try {
        this._map.filterByDate(`${this.year}`)
      } catch (e) {
        // Ignore errors if filterByDate fails (e.g. style does not support it)
      }
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
        this._map.panTo([this.longitude, this.latitude])
      } else {
        this._map.fitBounds([
          [this.longMin, this.latMin],
          [this.longMax, this.latMax],
        ])
      }
    }
  }

  _onStyleChange(e) {
    const config = {...defaultConfig, ...window.grampsjsConfig}
    const {style} = e.detail
    this._currentStyle = style
    const styleUrl = style === 'base' ? config.baseStyle : config.glStyle
    this._map.setStyle(styleUrl)
    if (this._currentStyle === 'ohm') {
      this._map.on('styledata', () => {
        this._map.filterByDate(`${this.year}`)
      })
    }
  }
}

window.customElements.define('grampsjs-map', GrampsjsMap)
