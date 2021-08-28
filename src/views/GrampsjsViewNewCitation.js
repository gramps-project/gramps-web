import {html} from 'lit'

import '@material/mwc-textfield'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'


export class GrampsjsViewNewCitation extends GrampsjsViewNewObject {

  constructor() {
    super()
    this.data = {_class: 'Citation'}
    this.postUrl = '/api/citations/'
    this.itemPath = 'citation'
  }

  renderContent() {
    return html`
    <h2>${this._('New Citation')}</h2>

    <h4 class="label">${this._('Source')}</h4>
    <grampsjs-form-select-object-list
      id="source"
      objectType="source"
      .strings="${this.strings}"
    ></grampsjs-form-select-object-list>


    <h4 class="label">${this._('Page')}</h4>
    <p>
      <grampsjs-form-string fullwidth id="page"></grampsjs-form-string>
    </p>


    <h4 class="label">${this._('Date')}</h4>
    <p>
      <grampsjs-form-select-date
        id="date"
        .strings="${this.strings}"
      >
      </grampsjs-form-select-date>
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

  checkFormValidity() {
    this.isFormValid = !!this.data?.source_handle
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'source-list') {
      this.data = {...this.data, source_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'date') {
      this.data = {...this.data, date: e.detail.data}
    }
    this.checkFormValidity()
  }

  _reset() {
    super._reset()
    this.isFormValid = false
    this.data = {_class: 'Citation'}
  }
}

window.customElements.define('grampsjs-view-new-citation', GrampsjsViewNewCitation)
