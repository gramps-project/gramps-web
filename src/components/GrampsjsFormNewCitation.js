/*
Form for adding a new event reference
*/

import {html} from 'lit'
import '@material/mwc-button'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

const confidence = {
  0: 'Very Low',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Very High',
}

class GrampsjsFormNewCitation extends GrampsjsObjectForm {
  constructor() {
    super()
    this.data = {_class: 'Citation', confidence: 2}
  }

  renderForm() {
    return html`
      <h3 class="label">${this._('Source')}</h3>
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        id="source"
        objectType="source"
        allowNew
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>

      <h3 class="label">${this._('Page')}</h3>
      <p>
        <grampsjs-form-string fullwidth id="page"></grampsjs-form-string>
      </p>

      <h3 class="label">${this._('Date')}</h3>
      <p>
        <grampsjs-form-select-date id="date" .appState="${this.appState}">
        </grampsjs-form-select-date>
      </p>

      <h3 class="label">${this._('Confidence')}</h3>
      <md-filled-select
        id="select-confidence"
        @change="${this.handleConfidence}"
      >
        ${Object.keys(confidence).map(
          conf => html`
            <md-select-option
              value="${conf}"
              ?selected="${
                // eslint-disable-next-line eqeqeq
                conf == this.data.confidence
              }"
            >
              <div slot="headline">${this._(confidence[conf])}</div>
            </md-select-option>
          `
        )}
      </md-filled-select>

      <h3 class="label">${this._('Media')}</h3>
      <grampsjs-form-select-object-list
        multiple
        id="object-media"
        objectType="media"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>
    `
  }

  handleConfidence(e) {
    this.data = {...this.data, confidence: parseInt(e.target.value, 10)}
  }

  get isValid() {
    if (!this.data.source_handle) {
      return false
    }
    return this._areDateSelectValid()
  }
}

window.customElements.define(
  'grampsjs-form-new-citation',
  GrampsjsFormNewCitation
)
