/*
<<<<<<< HEAD
Form for edit the repository type
=======
Form for adding a new event reference
>>>>>>> b1e6065 (Updated for edit repository type)
*/

import {html} from 'lit'

import './GrampsjsFormSelectType.js'
<<<<<<< HEAD
=======
import './GrampsjsFormString.js'
>>>>>>> b1e6065 (Updated for edit repository type)
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditRepositoryType extends GrampsjsObjectForm {
  constructor() {
    super()
    this.isFormValid = true
  }

  renderForm() {
    return html`
      <div>
        <grampsjs-form-select-type
          @formdata:changed="${this._handleSelectNewValue}"
          required
          id="repository-type"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="repository_types"
          value=${this.data.type}
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-select-type>
      </div>
    `
  }

  _handleSelectNewValue(e) {
    if (e.target.value !== '') {
      this.isFormValid = true
      this.data.type = e.target.value
    } else this.isFormValid = false
  }

  get isValid() {
    return this.isFormValid
  }
}

window.customElements.define(
  'grampsjs-form-edit-repository-type',
  GrampsjsFormEditRepositoryType
)
