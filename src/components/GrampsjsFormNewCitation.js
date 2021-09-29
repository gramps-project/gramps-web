/*
Form for adding a new event reference
*/

import {html} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-icon'
import '@material/mwc-button'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

const confidence = {
  0: 'Very Low',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Very High'
}

class GrampsjsFormNewCitation extends GrampsjsObjectForm {
  constructor () {
    super()
    this.data = {_class: 'Citation', confidence: 2}
  }

  renderForm () {
    return html`
      <h4 class="label">${this._('Source')}</h4>
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
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
          ?selected="${conf == this.data.confidence}"
        >${this._(confidence[conf])}</mwc-list-item>
        `)}
      </mwc-select>

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .strings="${this.strings}"
      ></grampsjs-form-private>

    `
  }

  handleConfidence (e) {
    this.data = {...this.data, confidence: parseInt(e.target.value, 10)}
  }
}

window.customElements.define('grampsjs-form-new-citation', GrampsjsFormNewCitation)
