/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditFamily extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-type
        id="family-rel-type"
        heading="${this._('Relationship type:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="family_relation_types"
        defaultValue="Unknown"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        value=${this.data?.type?.string || this.data?.type || ''}
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define(
  'grampsjs-form-edit-family',
  GrampsjsFormEditFamily
)
