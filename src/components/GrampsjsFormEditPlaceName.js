/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import './GrampsjsFormSelectDate.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {emptyDate} from '../util.js'

class GrampsjsFormEditPlaceName extends GrampsjsObjectForm {
  static get properties() {
    return {
      showDateInput: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.showDateInput = false
  }

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
      ${this.showDateInput
        ? html`
            <grampsjs-form-select-date
              @formdata:changed="${this._handleFormData}"
              id="place-name-date"
              label="${this._('Date')}"
              .data="${this.data.date ?? emptyDate}"
              .appState="${this.appState}"
            >
            </grampsjs-form-select-date>
          `
        : ''}
    `
  }

  get isValid() {
    return this.data.value !== ''
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'place-name-value') {
      this.data = {...this.data, value: e.detail.data}
    } else if (originalTarget.id === 'place-name-date') {
      this.data = {...this.data, date: e.detail.data}
    }
    super._handleFormData(e)
  }
}

window.customElements.define(
  'grampsjs-form-edit-placename',
  GrampsjsFormEditPlaceName
)
