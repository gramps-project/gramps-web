/*
Form for editing an attribute
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditAttribute extends GrampsjsObjectForm {
  static get properties() {
    return {
      source: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.source = false
  }

  renderForm() {
    return html`
      <grampsjs-form-select-type
        required
        id="${this.source ? 'srcattrtype' : 'attrtype'}"
        heading="${this._('Type')}"
        .appState="${this.appState}"
        typeName="attribute_types"
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        .data="${this.data}"
        initialValue=${this.data?.type?.string || ''}
      >
      </grampsjs-form-select-type>
      <grampsjs-form-string
        required
        fullwidth
        id="attrvalue"
        @formdata:changed="${this._handleFormData}"
        label="${this._('Value')}"
        .appState="${this.appState}"
        .data="${this.data}"
        value="${this.data?.value || ''}"
      >
      </grampsjs-form-string>
    `
  }
}

window.customElements.define(
  'grampsjs-form-edit-attribute',
  GrampsjsFormEditAttribute
)
