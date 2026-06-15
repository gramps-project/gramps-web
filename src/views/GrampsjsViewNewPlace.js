import {html} from 'lit'

import '@material/mwc-textfield'
import '@material/mwc-circular-progress'
import '@material/web/button/outlined-button.js'

import {mdiMapMarker} from '@mdi/js'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormEditLatLong.js'
import '../components/GrampsjsIcon.js'

export class GrampsjsViewNewPlace extends GrampsjsViewNewObject {
  static get properties() {
    return {
      ...super.properties,
      _latLongDialogOpen: {type: Boolean, state: true},
    }
  }

  constructor() {
    super()
    this.data = {_class: 'Place'}
    this.postUrl = '/api/places/'
    this.itemPath = 'place'
    this.objClass = 'Place'
    this._latLongDialogOpen = false
  }

  renderContent() {
    return html`
      <h2>${this._('New Place')}</h2>

      <h3 class="label">${this._('Name')}</h3>
      <p>
        <mwc-textfield
          required
          validationMessage="${this._('This field is mandatory')}"
          style="width:100%;"
          @input="${this.handleName}"
          id="place-name"
        ></mwc-textfield>
      </p>

      <h3 class="label">${this._('Type')}</h3>
      <grampsjs-form-select-type
        required
        noheading
        id="select-place-type"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        defaultValue="Unknown"
        typeName="place_types"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>

      <h3 class="label">${this._('Enclosed By')}</h3>
      <grampsjs-form-select-object-list
        id="enclosed"
        multiple
        objectType="place"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>

      <h3 class="label">${this._('Coordinates')}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
        <grampsjs-form-string
          id="lat"
          style="width:150px;"
          value="${this.data.lat ?? ''}"
          label="${this._('Latitude')}"
          .appState="${this.appState}"
        ></grampsjs-form-string>
        <grampsjs-form-string
          id="long"
          style="width:150px;"
          value="${this.data.long ?? ''}"
          label="${this._('Longitude')}"
          .appState="${this.appState}"
        ></grampsjs-form-string>
        <md-outlined-button
          style="flex-shrink:0;"
          @click="${this._openLatLongDialog}"
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiMapMarker}"
            color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
          ></grampsjs-icon>
          ${this._('Pick on map')}
        </md-outlined-button>
      </div>

      ${this._latLongDialogOpen
        ? html`
            <grampsjs-form-edit-lat-long
              @object:save="${this._handleLatLongSave}"
              @object:cancel="${this._closeLatLongDialog}"
              .appState="${this.appState}"
              .data="${{lat: this.data.lat ?? '', long: this.data.long ?? ''}}"
            ></grampsjs-form-edit-lat-long>
          `
        : ''}
      ${this._renderCitationForm()} ${this._renderTagsForm()}

      <div class="spacer"></div>
      <h3 class="label">${this._('Privacy')}</h3>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {
      ...this.data,
      name: {_class: 'PlaceName', value: e.target.value.trim()},
    }
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-place-type') {
      this.data = {
        ...this.data,
        place_type: e.detail.data,
      }
    }
    if (originalTarget.id === 'enclosed-list') {
      const handles = e.detail.data
      this.data = {
        ...this.data,
        placeref_list: handles.map(handle => ({
          _class: 'PlaceRef',
          ref: handle,
        })),
      }
    }
    if (['lat', 'long'].includes(originalTarget.id)) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    }
    this.checkFormValidity()
  }

  _openLatLongDialog() {
    this._latLongDialogOpen = true
  }

  _closeLatLongDialog() {
    this._latLongDialogOpen = false
  }

  _handleLatLongSave(e) {
    this.data = {...this.data, ...e.detail.data}
    this._latLongDialogOpen = false
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector(
      'grampsjs-form-select-type'
    )
    this.isFormValid = selectType === null ? true : selectType.isValid()
    const placeName = this.shadowRoot.getElementById('place-name')
    try {
      this.isFormValid = this.isFormValid && placeName?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  _reset() {
    super._reset()
    this.data = {_class: 'Place'}
    this._latLongDialogOpen = false
    this.isFormValid = false
  }
}

window.customElements.define('grampsjs-view-new-place', GrampsjsViewNewPlace)
