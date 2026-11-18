import {html, css, LitElement} from 'lit'
import {GrampsjsEditYDnaMixin} from '../mixins/GrampsjsEditYDnaMixin.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsHelpButton.js'
import './GrampsjsFormPrivate.js'

import {fireEvent} from '../util.js'

export class GrampsjsFormEditYDna extends GrampsjsEditYDnaMixin(
  GrampsjsAppStateMixin(LitElement)
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-outlined-text-field {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      personHandle: {type: String},
    }
  }

  constructor() {
    super()
    this.personHandle = ''
  }

  render() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <div slot="headline">
          ${this._('Edit Y-DNA data')}
          <grampsjs-help-button
            path="user-guide/y-dna/"
            .appState="${this.appState}"
          ></grampsjs-help-button>
        </div>
        <div slot="content">
          <div @formdata:changed="${this._handleFormData}">
            ${this.renderEditor()}
            <p>
              <grampsjs-form-private
                id="private"
                ?checked="${this.data.private}"
                .appState="${this.appState}"
              ></grampsjs-form-private>
            </p>
          </div>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleCancelDialog}"
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button
            @click="${this._handleClickSaveEditedYDna}"
            ?disabled="${!this.data.raw_data}"
            >${this._('_Save')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  _handleCancelDialog() {
    fireEvent(this, 'dialog:cancel')
  }

  get isValid() {
    return this.isFormValid
  }

  _handleFormData(e) {
    if (e.composedPath()[0].id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
      return
    }
    this.data = {...this.data, raw_data: e.detail.data}
    this.checkFormValidity()
  }

  async _handleClickSaveEditedYDna() {
    fireEvent(this, 'object:save', {
      data: {
        person_handle: this.personHandle,
        raw_data: this.data.raw_data,
        private: !!this.data.private,
      },
    })
  }
}

window.customElements.define('grampsjs-form-edit-ydna', GrampsjsFormEditYDna)
