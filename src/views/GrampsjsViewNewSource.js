import {html} from 'lit'

import '@material/mwc-textfield'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'

export class GrampsjsViewNewSource extends GrampsjsViewNewObject {
  constructor() {
    super()
    this.data = {_class: 'Source'}
    this.postUrl = '/api/sources/'
    this.itemPath = 'source'
    this.objClass = 'Source'
  }

  renderContent() {
    return html`
      <h2>${this._('New Source')}</h2>

      <h4 class="label">${this._('Title')}</h4>
      <p>
        <mwc-textfield
          required
          validationMessage="${this._('This field is mandatory')}"
          style="width:100%;"
          @input="${this.handleName}"
          id="source-name"
        ></mwc-textfield>
      </p>

      <h4 class="label">${this._('Author')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="author"></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Publication info')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="pubinfo"></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Abbreviation')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="abbrev"></grampsjs-form-string>
      </p>

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .strings="${this.strings}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {...this.data, title: e.target.value.trim()}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    super._handleFormData(e)
  }

  checkFormValidity() {
    const name = this.shadowRoot.getElementById('source-name')
    name.reportValidity()
    try {
      this.isFormValid = name?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  _reset() {
    super._reset()
    this.isFormValid = false
    this.data = {_class: 'Source'}
  }
}

window.customElements.define('grampsjs-view-new-source', GrampsjsViewNewSource)
