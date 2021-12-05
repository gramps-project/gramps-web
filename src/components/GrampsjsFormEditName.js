/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormName.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditName extends GrampsjsObjectForm {
  renderForm () {
    return html`
    <grampsjs-form-name
      id="name"
      @formdata:changed="${this._handleFormData}"
      .strings="${this.strings}"
    >
    </grampsjs-form-name>
    <pre>${JSON.stringify(this.data, null, 2)}</pre>
`
  }
}

window.customElements.define('grampsjs-form-edit-name', GrampsjsFormEditName)
