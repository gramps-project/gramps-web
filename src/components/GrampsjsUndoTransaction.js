/*
The dropdown menu for adding objects in the top app bar
*/

import {html, LitElement} from 'lit'
import '@material/mwc-snackbar'

import {fireEvent} from '../util.js'
import {apiPost} from '../api.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsUndoTransaction extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      transaction: {type: Array},
      redirect: {type: String},
    }
  }

  constructor() {
    super()
    this.transaction = []
    this.redirect = ''
    this._boundHandleEvent = this._handleEvent.bind(this)
  }

  render() {
    return html`
      <mwc-snackbar leading id="undo-snackbar">
        <mwc-button slot="action" @click="${this._handleUndo}"
          >${this._('Undo')}</mwc-button
        >
        <mwc-icon-button icon="close" slot="dismiss"></mwc-icon-button>
      </mwc-snackbar>
    `
  }

  async _handleUndo() {
    if (this.transaction.length > 0) {
      const res = await apiPost('/api/transactions/?undo=1', this.transaction)
      if ('data' in res) {
        fireEvent(this, 'nav', {path: this.redirect})
      } else if ('error' in res) {
        fireEvent(this, 'grampsjs:error', {message: res.error})
      }
    }
  }

  _handleEvent(event) {
    this.transaction = event.detail.transaction || []
    this.redirect = event.detail.redirect || ''
    const snackbar = this.renderRoot.querySelector('mwc-snackbar')
    snackbar.labelText = this._(event.detail.message)
    snackbar.show()
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('transaction:undo', this._boundHandleEvent)
  }

  disconnectedCallback() {
    window.removeEventListener('transaction:undo', this._boundHandleEvent)
    super.disconnectedCallback()
  }
}

window.customElements.define(
  'grampsjs-undo-transaction',
  GrampsjsUndoTransaction
)
