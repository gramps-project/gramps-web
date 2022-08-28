/* eslint-disable lit-a11y/click-events-have-key-events */
/*
Form for editing a location's geographic coordinates
*/

import {html, css} from 'lit'

import '@material/mwc-button'
import '@material/mwc-icon-button'
import '@material/mwc-circular-progress'

import './GrampsjsMap.js'
import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {queryNominatim} from '../api.js'

class GrampsjsFormEditLatLong extends GrampsjsObjectForm {
  static get styles () {
    return [
      super.styles,
      css`
      mwc-dialog {
        --mdc-dialog-min-width: 80vw;
      }

      .search-results {
        clear: left;
        padding: 1em 0em;
      }

      .search-result {
        padding: 0.5em 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      }

      .attribution {
        font-size: 0.8em;
        color: rgba(0, 0, 0, 0.4);
        text-align: right;
      }

      .attribution a:link, a:hover, a:visited {
        color: rgba(0, 0, 0, 0.4);
      }
      `]
  }

  static get properties () {
    return {
      searchRes: {type: Array},
      searchResLoading: {type: Boolean},
      showMore: {type: Boolean},
      _searchFieldValue: {type: String}
    }
  }

  constructor () {
    super()
    this.searchRes = []
    this.searchResLoading = false
    this.showMore = false
    this._searchFieldValue = ''
  }

  renderForm () {
    return html`
    <div>
      <div style="width:calc(50% - 20px);margin-right:20px;float:left;"><grampsjs-form-string
        @formdata:changed="${this._handleFormData}"
        fullwidth
        id="lat"
        value="${this.data.lat || ''}"
        label="${this._('Latitude')}"
        style="width:50%;"
      ></grampsjs-form-string></div><div style="width:50%;float:left;"><grampsjs-form-string
        fullwidth
        @formdata:changed="${this._handleFormData}"
        id="long"
        value="${this.data.long || ''}"
        label="${this._('Longitude')}"
      ></grampsjs-form-string></div>
    </div>
    <div style="clear:left; height: 20px;"></div>
    <div>
      <div style="width:calc(100% - 60px);float:left;">
        <grampsjs-form-string
          @formdata:changed="${this._handleSearchField}"
          @keydown="${this._handleSearchKey}"
          id="geocode"
          label="${this._('Search %s', 'OpenStreetMap')}"
          fullwidth
        ></grampsjs-form-string>
      </div>
      <div style="float:left;padding:5px;">
        <mwc-icon-button icon="search" @click="${this._executeSearch}"></mwc-icon-button>
      </div>
    </div>
    ${this._renderSearchResults()}
  <p>
    <grampsjs-map
      latitude="${this.data.lat ? parseFloat(this.data.lat) : 0}"
      longitude="${this.data.long ? parseFloat(this.data.long) : 0}"
      mapid="edit-latlong-map"
      id="map"
      @click="${this._handleMapClick}"
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

  _handleSearchField (e) {
    this._searchFieldValue = e.detail.data
  }

  _handleSearchKey (event) {
    if (event.code === 'Enter') {
      this._executeSearch()
      event.preventDefault()
      event.stopPropagation()
    }
  }

  async _executeSearch () {
    if (this._searchFieldValue) {
      this.searchResLoading = true
      const res = await queryNominatim(this._searchFieldValue)
      this.searchResLoading = false
      this.searchRes = res.data || []
    } else {
      this.searchRes = []
    }
  }

  reset () {
    this.shadowRoot.querySelectorAll('grampsjs-form-string').forEach(element => element.reset())
  }

  _renderSearchResults () {
    if (this.searchResLoading) {
      return html`
      <div class="search-results">
        <mwc-circular-progress indeterminate density="-3" open>
        </mwc-circular-progress>
      </div>`
    }
    if ((this.searchRes.length === 0)) {
      return html`
      <div class="search-results">
      </div>
      `
    }
    return html`
    <div class="search-results">
    ${this.searchRes.slice(0, this.showMore ? this.searchRes.length : 3).map(res => html`
    <div class="search-result">
    <span class="link" @click=${() => this._handleResClick(res)}>${res.display_name}</span>
    </div>
    `)}
    ${this.showMore || (this.searchRes.length <= 3)
    ? ''
    : html`
      <mwc-icon-button
        @click="${this._handleShowMore}"
        icon="more_horiz"
      ></mwc-button>
    `}
    <div class="attribution"><a href="https://nominatim.openstreetmap.org/">OpenStreetMap Nominatim</a></div>
    </div>`
  }

  _handleShowMore () {
    this.showMore = true
  }

  _handleResClick (res) {
    this._setLatLong(res.lat, res.lon)
  }

  _handleMapClick (e) {
    const map = this.shadowRoot.querySelector('grampsjs-map')
    if (map !== null) {
      const latlng = map._map.mouseEventToLatLng(e)
      this._setLatLong(latlng.lat, latlng.lng)
    }
  }

  _setLatLong (lat, long) {
    this.data = {lat: `${lat}`, long: `${long}`}
    const map = this.shadowRoot.querySelector('grampsjs-map')
    if (map !== null) {
      map.zoom = map._map.getZoom()
      map.latitude = lat
      map.longitude = long
    }
  }
}

window.customElements.define('grampsjs-form-edit-lat-long', GrampsjsFormEditLatLong)
