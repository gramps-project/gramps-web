/*
Form for editing a location's geographic coordinates
*/

import {html, css} from 'lit'

import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/slider/slider.js'

import {mdiMapMarker} from '@mdi/js'

import './GrampsjsMap.js'
import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {getMediaUrl} from '../api.js'
import {
  GrampsjsNominatimSearchMixin,
  nominatimSearchStyles,
} from '../mixins/GrampsjsNominatimSearchMixin.js'

class GrampsjsFormEditMapLayer extends GrampsjsNominatimSearchMixin(
  GrampsjsObjectForm
) {
  static get styles() {
    return [
      super.styles,
      nominatimSearchStyles,
      css`
        md-dialog {
          min-width: 80vw;
        }

        md-slider {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      ...super.properties,
      opacity: {type: Number},
      state: {type: String},
      pinCoordinates: {type: Array},
    }
  }

  constructor() {
    super()
    this.opacity = 0.6
    this.state = ''
    this.pinCoordinates = []
  }

  _getBounds() {
    const [attr] = (this.data.attribute_list || []).filter(
      attr_ => attr_.type === 'map:bounds'
    )
    if (attr === undefined) {
      return []
    }
    return JSON.parse(attr.value)
  }

  _getLatCenter() {
    const bounds = this._getBounds()
    if (bounds.length !== 2) {
      return 50
    }
    return (bounds[0][0] + bounds[1][0]) / 2
  }

  _getLongCenter() {
    const bounds = this._getBounds()
    if (bounds.length !== 2) {
      return 50
    }
    return (bounds[0][1] + bounds[1][1]) / 2
  }

  _getZoom() {
    const bounds = this._getBounds()
    if (bounds.length !== 2) {
      return 1
    }
    const yMin = bounds[0][0]
    const xMin = bounds[0][1]
    const yMax = bounds[1][0]
    const xMax = bounds[1][1]
    const Lx = xMax - xMin
    const Ly = yMax - yMin
    const L = Math.max(Lx, Ly)
    return Math.round(Math.log2(360 / L))
  }

  _getLogWidth() {
    const bounds = this._getBounds()
    if (bounds.length !== 2) {
      return Math.round(Math.log(0.1) * 10) / 10
    }
    const w = bounds[1][1] - bounds[0][1]
    return Math.round(Math.log(w) * 10) / 10
  }

  renderForm() {
    return html`
      Scale<br />
      <md-slider
        value="${this._getLogWidth()}"
        min="-6.9"
        max="5.2"
        step="0.1"
        @input="${this._handleScaleSlider}"
      ></md-slider>
      Opacity<br />
      <md-slider
        value="${this.opacity}"
        min="0.0"
        max="1.0"
        step="0.05"
        @input="${this._handleOpacitySlider}"
      ></md-slider>
      <div style="margin-top:16px;">${this._renderSearchBox()}</div>
      ${this._renderSearchResults()}
      <div style="margin-bottom:16px;display:flex;gap:8px;">
        ${this.state === 'placeMarker'
          ? html`
              <md-filled-button @click="${this._handleClickPinBtn}">
                <grampsjs-icon
                  slot="icon"
                  path="${mdiMapMarker}"
                  color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
                ></grampsjs-icon>
                ${this._('Select a point on the map')}
              </md-filled-button>
            `
          : html`
              <md-outlined-button @click="${this._handleClickPinBtn}">
                <grampsjs-icon
                  slot="icon"
                  path="${mdiMapMarker}"
                  color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
                ></grampsjs-icon>
                ${this._('Select a point on the map')}
              </md-outlined-button>
            `}
        ${this.pinCoordinates.length === 2
          ? this.state === 'alignImage'
            ? html`
                <md-filled-button @click="${this._handleClickAlignBtn}">
                  <grampsjs-icon
                    slot="icon"
                    path="${mdiMapMarker}"
                    color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
                  ></grampsjs-icon>
                  ${this._('Align the image')}
                </md-filled-button>
              `
            : html`
                <md-outlined-button @click="${this._handleClickAlignBtn}">
                  <grampsjs-icon
                    slot="icon"
                    path="${mdiMapMarker}"
                    color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
                  ></grampsjs-icon>
                  ${this._('Align the image')}
                </md-outlined-button>
              `
          : ''}
      </div>
      <grampsjs-map
        .appState="${this.appState}"
        latitude="${this.pinCoordinates.length === 2
          ? this.pinCoordinates[0]
          : this._getLatCenter()}"
        longitude="${this.pinCoordinates.length === 2
          ? this.pinCoordinates[1]
          : this._getLongCenter()}"
        zoom="${this._getZoom()}"
        mapid="media-map"
        id="map"
        @mapclick="${this._handleMapClick}"
      >
        ${this._getBounds().length === 2
          ? html` <grampsjs-map-overlay
              url="${getMediaUrl(this.data.handle)}"
              opacity="${this.opacity}"
              title="${this.data.desc}"
              handle="${this.data.handle}"
              .bounds="${this._getBounds()}"
            ></grampsjs-map-overlay>`
          : ''}
        ${this.pinCoordinates.length === 2
          ? html`
              <grampsjs-map-marker
                latitude="${this.pinCoordinates[0]}"
                longitude="${this.pinCoordinates[1]}"
              ></grampsjs-map-marker>
            `
          : ''}
      </grampsjs-map>
    `
  }

  _handleClickPinBtn() {
    if (this.state !== 'placeMarker') {
      this.state = 'placeMarker'
    } else {
      this.state = ''
    }
  }

  _handleClickAlignBtn() {
    if (this.state !== 'alignImage') {
      this.state = 'alignImage'
    } else {
      this.state = ''
    }
  }

  _handleScaleSlider(e) {
    this._setScale(Math.exp(e.target.value))
  }

  _handleOpacitySlider(e) {
    this.opacity = parseFloat(e.target.value)
  }

  _setScale(w) {
    const boundsOld = this._getBounds()
    if (boundsOld.length !== 2) {
      return
    }
    const wOld = boundsOld[1][1] - boundsOld[0][1]
    const latTop = boundsOld[1][0]
    const longLeft = boundsOld[0][1]
    const scaleCenter =
      this.pinCoordinates.length === 2
        ? this.pinCoordinates
        : [latTop, longLeft]
    const s = w / wOld
    const bounds = [
      [
        scaleCenter[0] + (boundsOld[0][0] - scaleCenter[0]) * s,
        scaleCenter[1] + (boundsOld[0][1] - scaleCenter[1]) * s,
      ],
      [
        scaleCenter[0] + (boundsOld[1][0] - scaleCenter[0]) * s,
        scaleCenter[1] + (boundsOld[1][1] - scaleCenter[1]) * s,
      ],
    ]
    this._setBounds(bounds)
  }

  _handleMapClick(e) {
    if (e.detail?.lngLat !== undefined) {
      const {lat, lng} = e.detail.lngLat
      if (this.state === 'placeMarker') {
        this.pinCoordinates = [lat, lng]
        this.state = ''
        e.preventDefault()
        e.stopPropagation()
        if (this._getBounds().length === 0) {
          this._placeImage(lat, lng, 0.1)
        }
      }
      if (this.state === 'alignImage') {
        this._alignToPin(lat, lng)
        this.state = ''
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }

  _placeImage(lat, long, width) {
    const url = getMediaUrl(this.data.handle)
    const img = new Image()
    img.onload = () => {
      const imgWidth = img.naturalWidth
      const imgHeight = img.naturalHeight
      const height =
        (imgHeight / imgWidth) * width * Math.cos((lat / 180) * Math.PI)
      this._setBounds([
        [lat - height, long],
        [lat, long + width],
      ])
    }
    img.src = url
  }

  _setTopLeft(lat, long) {
    const boundsOld = this._getBounds()
    if (boundsOld.length !== 2) {
      return
    }
    const h = boundsOld[1][0] - boundsOld[0][0]
    const w = boundsOld[1][1] - boundsOld[0][1]
    const bounds = [
      [lat - h, long],
      [lat, long + w],
    ]
    this._setBounds(bounds)
  }

  _alignToPin(lat, long) {
    if (this.pinCoordinates.length !== 2) {
      return
    }
    const [latPin, longPin] = this.pinCoordinates
    const boundsOld = this._getBounds()
    const dLat = latPin - lat
    const dLong = longPin - long
    const bounds = [
      [boundsOld[0][0] + dLat, boundsOld[0][1] + dLong],
      [boundsOld[1][0] + dLat, boundsOld[1][1] + dLong],
    ]
    this._setBounds(bounds)
  }

  _handleResClick(res) {
    this.searchRes = []
    const map = this.shadowRoot.querySelector('grampsjs-map')
    if (map !== null) {
      map.jumpTo(parseFloat(res.lat), parseFloat(res.lon), 10)
    }
  }

  _setBounds(bounds) {
    let [attr] = (this.data.attribute_list || []).filter(
      attr_ => attr_.type === 'map:bounds'
    )
    if (!attr) {
      attr = {}
    }
    this.data = {
      ...this.data,
      attribute_list: [
        ...(this.data.attribute_list || []).filter(
          attr_ => attr_.type !== 'map:bounds'
        ),
        {...attr, type: 'map:bounds', value: JSON.stringify(bounds)},
      ],
    }
  }
}

window.customElements.define(
  'grampsjs-form-edit-map-layer',
  GrampsjsFormEditMapLayer
)
