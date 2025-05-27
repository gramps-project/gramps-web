/*
Form for editing an attribute
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditUrl extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <p>
        <grampsjs-form-select-type
          required
          id="urltype"
          heading="${this._('Type')}"
          .appState="${this.appState}"
          typeName="url_types"
          ?loadingTypes=${this.loadingTypes}
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
          .data="${this.data}"
          value=${this.data?.type?.string || ''}
        >
        </grampsjs-form-select-type>
      </p>
      <p>
        <grampsjs-form-string
          required
          fullwidth
          id="path"
          @formdata:changed="${this._handleFormData}"
          label="${this._('Path')}"
          .appState="${this.appState}"
          .data="${this.data}"
          value="${this.data?.path || ''}"
        >
        </grampsjs-form-string>
      </p>
      <p>
        <grampsjs-form-string
          fullwidth
          id="desc"
          @formdata:changed="${this._handleFormData}"
          label="${this._('Description')}"
          .appState="${this.appState}"
          .data="${this.data}"
          value="${this.data?.desc || ''}"
        >
        </grampsjs-form-string>
      </p>
    `
  }
}

window.customElements.define('grampsjs-form-edit-url', GrampsjsFormEditUrl)
