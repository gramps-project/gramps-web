/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormName.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditName extends GrampsjsObjectForm {
  static get properties() {
    return {
      isFormValid: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.isFormValid = false
  }

  renderForm() {
    return html`
      <grampsjs-form-select-type
        required
        id="name-type"
        noheading
        label="${this._('Name type')}"
        .appState="${this.appState}"
        typeName="name_types"
        ?loadingTypes=${this.loadingTypes}
        defaultValue="Birth Name"
        value=${this.data?.type?.string || this.data?.type || null}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        @formdata:changed="${this._handleFormData}"
      >
      </grampsjs-form-select-type>

      <grampsjs-form-name
        origintype
        id="name"
        @formdata:changed="${this._handleFormData}"
        ?loadingTypes=${this.loadingTypes}
        .appState="${this.appState}"
        .data="${this.data}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-name>
    `
  }

  _handleFormData(e) {
    super._handleFormData(e)
    this.checkFormValidity()
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector(
      'grampsjs-form-select-type'
    )
    this.isFormValid = selectType === null ? true : selectType.isValid()
  }

  get isValid() {
    return this.isFormValid
  }
}

window.customElements.define('grampsjs-form-edit-name', GrampsjsFormEditName)
