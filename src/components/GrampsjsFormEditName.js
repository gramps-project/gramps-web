/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormName.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditName extends GrampsjsObjectForm {
  renderForm () {
    return html`
    <grampsjs-form-name
      showMore
      id="name"
      @formdata:changed="${this._handleFormData}"
      .strings="${this.strings}"
      .data="${this.data}"
    >
    </grampsjs-form-name>

    <grampsjs-form-select-type
      required
      id="name-type"
      .strings="${this.strings}"
      typeName="name_types"
      defaultTypeName="Birth Name"
      initialValue=${this.data?.type || ''}
      .types="${this.types}"
      .typesLocale="${this.typesLocale}"
      @formdata:changed="${this._handleFormData}"
    >
    </grampsjs-form-select-type>

    <pre>${JSON.stringify(this.data, null, 2)}</pre>
`
  }
}

window.customElements.define('grampsjs-form-edit-name', GrampsjsFormEditName)
