/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormName.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditName extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-type
        required
        id="name-type"
        noheading
        label="${this._('Name type')}"
        .strings="${this.strings}"
        typeName="name_types"
        ?loadingTypes=${this.loadingTypes}
        defaultTypeName="Birth Name"
        initialValue=${this.data?.type || ''}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        @formdata:changed="${this._handleFormData}"
      >
      </grampsjs-form-select-type>

      <grampsjs-form-name
        origintype
        showMore
        id="name"
        @formdata:changed="${this._handleFormData}"
        ?loadingTypes=${this.loadingTypes}
        .strings="${this.strings}"
        .data="${this.data}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-name>
    `
  }
}

window.customElements.define('grampsjs-form-edit-name', GrampsjsFormEditName)
