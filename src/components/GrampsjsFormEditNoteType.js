/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditNoteType extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-type
        id="note-type"
        .strings="${this.strings}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="note_types"
        defaultTypeName="General"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        initialValue="${this.data?.type || ''}"
      >
      </grampsjs-form-select-type>

      </p>
    `
  }
}

window.customElements.define(
  'grampsjs-form-edit-note-type',
  GrampsjsFormEditNoteType
)
