/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditType extends GrampsjsObjectForm {
  static get properties() {
    return {
      formId: {type: String},
      typeName: {type: String},
    }
  }

  constructor() {
    super()
    this.formId = ''
    this.typeName = ''
  }

  renderForm() {
    return html`
      <grampsjs-form-select-type
        id="${this.formId}"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="${this.typeName}"
        defaultTypeName="General"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        initialValue="${this.data?.type || ''}"
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-edit-type', GrampsjsFormEditType)
