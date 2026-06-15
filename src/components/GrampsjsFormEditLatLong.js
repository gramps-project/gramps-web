/*
Form for editing a location's geographic coordinates
*/

import {html, css} from 'lit'

import './GrampsjsMap.js'
import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {
  GrampsjsNominatimSearchMixin,
  nominatimSearchStyles,
} from '../mixins/GrampsjsNominatimSearchMixin.js'

class GrampsjsFormEditLatLong extends GrampsjsNominatimSearchMixin(
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
      `,
    ]
  }

  renderForm() {
    return html`
      <div>
        <div style="width:calc(50% - 20px);margin-right:20px;float:left;">
          <grampsjs-form-string
            @formdata:changed="${this._handleFormData}"
            fullwidth
            id="lat"
            value="${this.data.lat || ''}"
            label="${this._('Latitude')}"
            style="width:50%;"
          ></grampsjs-form-string>
        </div>
        <div style="width:50%;float:left;">
          <grampsjs-form-string
            fullwidth
            @formdata:changed="${this._handleFormData}"
            id="long"
            value="${this.data.long || ''}"
            label="${this._('Longitude')}"
          ></grampsjs-form-string>
        </div>
      </div>
      <div style="clear:left; height: 20px;"></div>
      ${this._renderSearchBox()} ${this._renderSearchResults()}
      <p
        style="color:var(--grampsjs-body-font-color-40);font-size:0.9em;margin-bottom:0.25em;"
      >
        ${this._('Select a point on the map')}
      </p>
      <p>
        <grampsjs-map
          .appState="${this.appState}"
          latitude="${this.data.lat ? parseFloat(this.data.lat) : 0}"
          longitude="${this.data.long ? parseFloat(this.data.long) : 0}"
          mapid="edit-latlong-map"
          id="map"
          @mapclick="${this._handleMapClick}"
        >
          ${this.data.lat && this.data.long
            ? html`
                <grampsjs-map-marker
                  latitude="${parseFloat(this.data.lat)}"
                  longitude="${parseFloat(this.data.long)}"
                >
                </grampsjs-map-marker>
              `
            : ''}
        </grampsjs-map>
      </p>
    `
  }

  _handleResClick(res) {
    this._setLatLong(res.lat, res.lon)
    const map = this.shadowRoot.querySelector('grampsjs-map')
    if (map !== null) {
      map.jumpTo(res.lat, res.lon, map._map?.getZoom() ?? map.zoom)
    }
  }

  _handleMapClick(e) {
    const {lngLat} = e.detail
    if (lngLat?.lat !== undefined && lngLat?.lng !== undefined) {
      this._setLatLong(lngLat.lat, lngLat.lng)
    }
  }

  _setLatLong(lat, long) {
    this.data = {lat: `${lat}`, long: `${long}`}
  }

  reset() {
    this.shadowRoot
      .querySelectorAll('grampsjs-form-string')
      .forEach(element => element.reset())
  }
}

window.customElements.define(
  'grampsjs-form-edit-lat-long',
  GrampsjsFormEditLatLong
)
