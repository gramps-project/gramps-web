import {html, css, LitElement} from 'lit'
import {GrampsjsEditYDnaMixin} from '../mixins/GrampsjsEditYDnaMixin.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

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
      <md-dialog open @cancel="${this._handleCancelDialog}">
        <div slot="headline">${this._('Edit Y-DNA data')}</div>
        <div slot="content">
          <div @formdata:changed="${this._handleFormData}">
            ${this.renderEditor()}
          </div>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleCancelDialog}"
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button @click="${this._handleClickSaveEditedYDna}"
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
    this.data = {...this.data, raw_data: e.detail.data}
    this.checkFormValidity()
  }

  async _handleClickSaveEditedYDna() {
    fireEvent(this, 'object:save', {
      data: {person_handle: this.personHandle, raw_data: this.data.raw_data},
    })
  }
}

window.customElements.define('grampsjs-form-edit-ydna', GrampsjsFormEditYDna)
