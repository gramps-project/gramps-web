import {css, html} from 'lit'

import './GrampsjsDnaMatch.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'

export class GrampsjsFormNewMatch extends GrampsjsObjectForm {
  static get styles() {
    return [
      super.styles,
      css`
        md-outlined-text-field {
          width: 100%;
        }

        .container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .box {
          flex: 1 1 300px;
          box-sizing: border-box;
          padding: 10px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      sourcePersonInitial: {type: Object},
      _parsedDataOk: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.sourcePersonInitial = {}
    this._parsedDataOk = false
  }

  renderForm() {
    return html` <div class="container">
        <div class="box">
          <h4 class="label">${this._('First person')}</h4>
          <p>
            <grampsjs-form-select-object-list
              fixedMenuPosition
              notDeletable
              objectType="person"
              .strings="${this.strings}"
              id="match-source"
              label="${this._('Select')}"
              class="edit"
              .objectsInitial="${this.sourcePersonInitial.handle
                ? [
                    {
                      object: this.sourcePersonInitial,
                      object_type: 'person',
                      handle: this.sourcePersonInitial.handle,
                    },
                  ]
                : []}"
            ></grampsjs-form-select-object-list>
          </p>
        </div>
        <div class="box">
          <h4 class="label">${this._('Second person')}</h4>
          <p>
            <grampsjs-form-select-object-list
              fixedMenuPosition
              notDeletable
              objectType="person"
              .strings="${this.strings}"
              id="match-target"
              label="${this._('Select')}"
              class="edit"
            ></grampsjs-form-select-object-list>
          </p>
        </div>
      </div>

      <h4 class="label">${this._('Raw match data')}</h4>
      <p>
        <md-outlined-text-field
          type="textarea"
          rows="5"
          id="match-data"
          @input="${this._handleRawData}"
        >
        </md-outlined-text-field>
      </p>

      <h4 class="label">${this._('Preview')}</h4>
      ${this.data.raw_data
        ? html`
            <grampsjs-dna-match
              .postData="${{string: this.data.raw_data}}"
              .strings="${this.strings}"
              @connected-component:updated="${e =>
                this._handleMatchTableUpdated(e)}"
            ></grampsjs-dna-match>
          `
        : html`<p>
            ${this._(
              'Paste the raw data in the field above to see the preview.'
            )}
          </p>`}`
  }

  _handleMatchTableUpdated(event) {
    const data = event.detail?.data?.data
    if (data && data.length) {
      this._parsedDataOk = true
    } else {
      this._parsedDataOk = false
    }
    this.checkFormValidity()
  }

  checkFormValidity() {
    this.isFormValid =
      this.data.source_handle &&
      this.data.target_handle &&
      this.data.source_handle !== this.data.target_handle &&
      this.data.raw_data &&
      this._parsedDataOk
  }

  get isValid() {
    return this.isFormValid
  }

  _handleRawData() {
    const el = this.shadowRoot.querySelector('md-outlined-text-field')
    if (el !== null) {
      fireEvent(el, 'formdata:changed', {data: el.value.trim()})
    }
  }

  _handleFormData(e) {
    super._handleFormData(e)
    this.checkFormValidity()
  }
}

window.customElements.define('grampsjs-form-new-match', GrampsjsFormNewMatch)
