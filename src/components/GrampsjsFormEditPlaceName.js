/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditPlaceName extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-string
        @formdata:changed="${this._handleFormData}"
        fullwidth
        id="place-name-value"
        label="${this._('Name')}"
        value="${this.data.value || ''}"
      >
      </grampsjs-form-string>
    `
  }
}

window.customElements.define(
  'grampsjs-form-edit-placename',
  GrampsjsFormEditPlaceName
)
