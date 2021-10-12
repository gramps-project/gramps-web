/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditTitle extends GrampsjsObjectForm {
  static get properties () {
    return {
      prop: {type: String}
    }
  }

  constructor () {
    super()
    this.prop = 'title'
  }

  renderForm () {
    return html`
    <grampsjs-form-string
      @formdata:changed="${this._handleFormData}"
      fullwidth
      id="${this.prop}"
      label="${this._('Title')}"
      value="${this.data[this.prop] || ''}">
    </grampsjs-form-string>
    <pre>${JSON.stringify(this.data, null, 2)}</pre<y
    `
  }
}

window.customElements.define('grampsjs-form-edit-title', GrampsjsFormEditTitle)
