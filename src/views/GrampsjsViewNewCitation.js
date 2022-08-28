import {html} from 'lit'

import '@material/mwc-textfield'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'

export const confidence = {
  0: 'Very Low',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Very High'
}

export class GrampsjsViewNewCitation extends GrampsjsViewNewObject {
  constructor () {
    super()
    this.data = {_class: 'Citation', confidence: 2}
    this.postUrl = '/api/citations/'
    this.itemPath = 'citation'
    this.objClass = 'Citation'
  }

  renderContent () {
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

    <h4 class="label">${this._('Con_fidence')}</h4>
    <mwc-select
      id="select-confidence"
      @change="${this.handleConfidence}"
    >
      ${Object.keys(confidence).map(conf => html`
      <mwc-list-item
        value="${conf}"
        ?selected="${// eslint-disable-next-line eqeqeq
  conf == this.data.confidence}"
      >${this._(confidence[conf])}</mwc-list-item>
      `)}
    </mwc-select>

    <div class="spacer"></div>
    <grampsjs-form-private
      id="private"
      .strings="${this.strings}"
    ></grampsjs-form-private>

    ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  checkFormValidity () {
    this.isFormValid = !!this.data?.source_handle
  }

  handleConfidence (e) {
    this.data = {...this.data, confidence: parseInt(e.target.value, 10)}
  }

  _handleFormData (e) {
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

  _reset () {
    super._reset()
    this.isFormValid = false
    this.data = {_class: 'Citation', confidence: 2}
  }
}

window.customElements.define('grampsjs-view-new-citation', GrampsjsViewNewCitation)
