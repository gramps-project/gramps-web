import {html, css, LitElement} from 'lit'
import 'maplibre-gl'
import '@openhistoricalmap/maplibre-gl-dates'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/checkbox/checkbox'

import './GrampsjsMapOverlay.js'
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
    return [
      sharedStyles,
      css`
        .maplibregl-ctrl-group {
          border-radius: 12px !important;
        }
        .maplibregl-ctrl-bottom-right {
          right: 8px;
        }
        .grampsjs-place-tooltip .maplibregl-popup-content {
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          background: var(--md-sys-color-surface-container-high);
          color: var(--md-sys-color-on-surface);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
        }
        .grampsjs-place-tooltip .maplibregl-popup-tip {
          border-top-color: var(
            --md-sys-color-surface-container-high
          ) !important;
        }
      `,
    ]
  }

  render() {
    return html`
      <link rel="stylesheet" href="maplibre-gl.css" />
      <div
        class="mapcontainer"
        style="width:${this.width}; height:${this.height};"
      >
        <div id="${this.mapid}" style="z-index: 0; width: 100%; height: 100%;">
          <slot @slotchange="${this._onSlotChange}"> </slot>
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
      this._mapInitialLoadFired = true
      if (this.year > 0 && this._map.filterByDate) {
        this._map.filterByDate(`${this.year}`)
      }
      if (this.latMin !== 0 || this.latMax !== 0) {
        this._map.fitBounds([
          [this.longMin, this.latMin],
          [this.longMax, this.latMax],
        ])
      }
      this._slottedChildren
        .filter(el => typeof el.addToMap === 'function')
        .forEach(el => el.addToMap(this._map))
    })
    this._map.on('moveend', () => {
      fireEvent(this, 'map:moveend', {bounds: this._map.getBounds()})
    })
    this._map.on('sourcedata', () => {
      if (
        this._currentStyle === 'ohm' &&
        this.year > 0 &&
        typeof this._map.filterByDate === 'function'
      ) {
        this._map.filterByDate(`${this.year}`)
      }
    })
  }

  get _slottedChildren() {
    const slot = this.shadowRoot.querySelector('slot')
    return slot.assignedElements({flatten: true})
  }

  // Handles children added after the map's load event (e.g. async data layers).
  _onSlotChange() {
    // Only initialise children that haven't been added to the map yet — never
    // re-call addToMap on an already-initialised layer, as that would briefly
    // remove and re-add its MapLibre source/layers on every slot mutation.
    const toInit = this._slottedChildren.filter(
      el => typeof el.addToMap === 'function' && !el._map
    )
    if (!toInit.length) return
    if (!this._map?.isStyleLoaded()) {
      // If the initial load has already fired but isStyleLoaded() is transiently
      // false (e.g. sprites still loading), defer addToMap until the map is idle.
      if (this._mapInitialLoadFired) {
        this._map.once('idle', () => {
          toInit.filter(el => !el._map).forEach(el => el.addToMap(this._map))
        })
      }
      return
    }
    toInit.forEach(el => el.addToMap(this._map))
  }

  panTo(latitude, longitude) {
    if (this._map !== undefined) {
      this._map.panTo([longitude, latitude])
    }
  }

  jumpTo(latitude, longitude, zoom) {
    if (this._map !== undefined) {
      this._map.jumpTo({center: [longitude, latitude], zoom})
    }
  }

  fitBounds(bounds, options = {}) {
    if (this._map !== undefined) {
      this._map.fitBounds(bounds, {padding: 60, maxZoom: 14, ...options})
    }
  }

  flyTo(latitude, longitude) {
    if (this._map !== undefined) {
      this._map.flyTo({
        center: [longitude, latitude],
        zoom: Math.max(this._map.getZoom(), 14),
        speed: 2.5,
      })
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
    this._slottedChildren
      .filter(
        el =>
          (overlay.handle && el.handle === overlay.handle) ||
          (!overlay.handle && el.title === overlay.desc)
      )
      .forEach(el => {
        // eslint-disable-next-line no-param-reassign
        el.hidden = !visible
      })
  }

  _handleStyleChange(style) {
    const styleUrl = this._getStyleUrl(style)
    const contributors = this._slottedChildren.filter(
      el => typeof el.getTransformStyleContribution === 'function'
    )
    this._map.setStyle(
      styleUrl,
      contributors.length > 0
        ? {
            transformStyle: (prev, next) =>
              contributors.reduce(
                (s, el) => el.getTransformStyleContribution(prev, s),
                next
              ),
          }
        : undefined
    )
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
