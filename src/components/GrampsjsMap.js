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
  mapOhmStyle: 'https://www.openhistoricalmap.org/map-styles/main/main.json',
  mapBaseStyleLight: 'https://tiles.openfreemap.org/styles/liberty',
  mapBaseStyleDark: 'https://tiles.openfreemap.org/styles/dark',
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
        ${this.layerSwitcher ? this._renderLayerSwitcher() : html`<div></div>`}
      </div>
    `
  }

  _renderLayerSwitcher() {
    return html`
      <div class="map-layerswitcher">
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
      layerSwitcher: {type: Boolean},
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
    this.layerSwitcher = false
    this._currentStyle = 'base'
    this._mediaQuery = undefined
  }

  connectedCallback() {
    super.connectedCallback()
    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this._mediaQuery.addEventListener('change', this._onThemeChange)
  }

  disconnectedCallback() {
    this._mediaQuery?.removeEventListener('change', this._onThemeChange)
    super.disconnectedCallback()
  }

  firstUpdated() {
    const mapel = this.shadowRoot.getElementById(this.mapid)
    const styleUrl = this._getStyleUrl(this._currentStyle)
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
      // Add overlays after initial load
      this._reAddOverlays()
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
    const {style} = e.detail
    this._currentStyle = style
    this._handleStyleChange(style)
  }

  _onThemeChange = () => {
    this._handleStyleChange(this._currentStyle)
  }

  _handleOverlayToggle(e) {
    const {overlay, visible} = e.detail

    const overlays = this._slottedChildren.filter(
      el => el.tagName === 'GRAMPSJS-MAP-OVERLAY'
    )

    overlays.forEach(overlayElement => {
      // Prefer matching by stable handle when available; fall back to title/desc for backward compatibility
      const matchesByHandle =
        overlay.handle &&
        overlayElement.handle &&
        overlayElement.handle === overlay.handle
      const matchesByTitle =
        !overlay.handle && overlayElement.title === overlay.desc

      if (matchesByHandle || matchesByTitle) {
        // eslint-disable-next-line no-param-reassign
        overlayElement.hidden = !visible
      }
    })
  }

  _handleStyleChange(style) {
    const styleUrl = this._getStyleUrl(style)
    this._map.setStyle(styleUrl)
    // Always wait for style to load before re-adding overlays
    this._map.once('styledata', () => {
      if (this._currentStyle === 'ohm') {
        this._map.filterByDate(`${this.year}`)
      }
      this._reAddOverlays()
    })
  }

  _reAddOverlays() {
    const overlays = this._slottedChildren.filter(
      el => el.tagName === 'GRAMPSJS-MAP-OVERLAY'
    )
    overlays.forEach(overlayElement => {
      // After style change, MapLibre cleared all layers. Reset overlay state and re-add.
      overlayElement.resetForStyleChange()
      overlayElement.addOverlay()
    })
  }

  _getStyleUrl(style) {
    const config = {...defaultConfig, ...window.grampsjsConfig}
    const theme = this.appState.getCurrentTheme()
    const mapBaseStyle =
      theme === 'dark' ? config.mapBaseStyleDark : config.mapBaseStyleLight
    return style === 'base' ? mapBaseStyle : config.mapOhmStyle
  }
}

window.customElements.define('grampsjs-map', GrampsjsMap)
