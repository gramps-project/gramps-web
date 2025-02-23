import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textfield'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

export class GrampsjsViewNewPlace extends GrampsjsViewNewObject {
  constructor() {
    super()
    this.data = {_class: 'Place'}
    this.postUrl = '/api/places/'
    this.itemPath = 'place'
    this.objClass = 'Place'
  }

  renderContent() {
    return html`
      <h2>${this._('New Place')}</h2>

      <h4 class="label">${this._('Name')}</h4>
      <p>
        <mwc-textfield
          required
          validationMessage="${this._('This field is mandatory')}"
          style="width:100%;"
          @input="${this.handleName}"
          id="place-name"
        ></mwc-textfield>
      </p>

      <grampsjs-form-select-type
        required
        id="select-place-type"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="place_types"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>

      <h4 class="label">${this._('Enclosed By')}</h4>
      <grampsjs-form-select-object-list
        id="enclosed"
        multiple
        objectType="place"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>

      ${this._renderCitationForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {
      ...this.data,
      name: {_class: 'PlaceName', value: e.target.value.trim()},
    }
  }

  _handleFormData(e) {
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-place-type') {
      this.data = {
        ...this.data,
        place_type: {_class: 'PlaceType', string: e.detail.data},
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
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
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
  }
}

window.customElements.define('grampsjs-view-new-place', GrampsjsViewNewPlace)
