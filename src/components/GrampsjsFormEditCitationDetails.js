/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {confidence} from '../views/GrampsjsViewNewCitation.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditCitationDetails extends GrampsjsObjectForm {
  static get properties() {
    return {
      source: {type: Object},
    }
  }

  constructor() {
    super()
    this.source = {}
  }

  renderForm() {
    return html`
      <h4 class="label">${this._('Source')}</h4>
      <grampsjs-form-select-object-list
        id="source"
        objectType="source"
        .objectsInitial="${this.data.source_handle
          ? [
              {
                object_type: 'source',
                object: this.source,
                handle: this.data.source_handle,
              },
            ]
          : []}"
        .appState="${this.appState}"
        notDeletable
      ></grampsjs-form-select-object-list>

      <h4 class="label">${this._('Page')}</h4>
      <p>
        <grampsjs-form-string
          fullwidth
          id="page"
          value="${this.data.page}"
        ></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Date')}</h4>
      <p>
        <grampsjs-form-select-date
          fullwidth
          id="date"
          @formdata:changed="${this._handleFormData}"
          .data="${this.data.date}"
          .appState="${this.appState}"
        >
        </grampsjs-form-select-date>
      </p>

      <h4 class="label">${this._('Confidence')}</h4>
      <mwc-select id="select-confidence" @change="${this.handleConfidence}">
        ${Object.keys(confidence).map(
          conf => html`
            <mwc-list-item
              value="${conf}"
              ?selected="${
                // eslint-disable-next-line eqeqeq
                conf == this.data.confidence
              }"
              >${this._(confidence[conf])}</mwc-list-item
            >
          `
        )}
      </mwc-select>
    `
  }

  get isValid() {
    if (!this.data.source_handle) {
      return false
    }
    return this._areDateSelectValid()
  }

  handleConfidence(e) {
    this.data = {...this.data, confidence: parseInt(e.target.value, 10)}
  }
}

window.customElements.define(
  'grampsjs-form-edit-citation-details',
  GrampsjsFormEditCitationDetails
)
