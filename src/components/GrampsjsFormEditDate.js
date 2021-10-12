/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditDate extends GrampsjsObjectForm {
  static get properties () {
    return {
      prop: {type: String}
    }
  }

  constructor () {
    super()
    this.prop = 'date'
  }

  renderForm () {
    return html`
    <grampsjs-form-select-date
      @formdata:changed="${this._handleFormData}"
      fullwidth
      id="${this.prop}"
      label="${this._('Date')}"
      .data="${this.data.date}">
    </grampsjs-form-select-date>
    `
  }
}

window.customElements.define('grampsjs-form-edit-date', GrampsjsFormEditDate)
