/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditSourceData extends GrampsjsObjectForm {
  static get properties() {
    return {
      prop: {type: String},
    }
  }

  constructor() {
    super()
    console.log('jit this.data', this.data)
    this.prop = {abbrev: 'abbrev', author: 'author', pubinfo: 'pubinfo'}
  }

  renderForm() {
    return html`
      <div style="width:100%;float:left;margin-bottom:20px;">
        <grampsjs-form-string
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="${this.prop.abbrev}"
          label="${this._('Abbrevation')}"
          value="${this.data[this.prop.abbrev] || ''}"
        >
        </grampsjs-form-string>
      </div>
      <div style="width:100%;float:left;margin-bottom:20px;">
        <grampsjs-form-string
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="${this.prop.author}"
          label="${this._('Author')}"
          value="${this.data[this.prop.author] || ''}"
        >
        </grampsjs-form-string>
      </div>
      <div style="width:100%;float:left;margin-bottom:20px;">
        <grampsjs-form-string
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="${this.prop.pubinfo}"
          label="${this._('Publication Info')}"
          value="${this.data[this.prop.pubinfo] || ''}"
        >
        </grampsjs-form-string>
      </div>
    `
  }
}

window.customElements.define(
  'grampsjs-form-edit-source-data',
  GrampsjsFormEditSourceData
)
