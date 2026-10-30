/*
Offers to undo a transaction in the app snackbar
*/

import {LitElement} from 'lit'

import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export const UNDO_TIMEOUT = 8000

class GrampsjsUndoTransaction extends GrampsjsAppStateMixin(LitElement) {
  constructor() {
    super()
    this._boundHandleEvent = this._handleEvent.bind(this)
  }

  // eslint-disable-next-line class-methods-use-this
  render() {
    return null
  }

  async _undo(transaction, redirect) {
    if (transaction.length > 0) {
      const res = await this.appState.apiPost(
        '/api/transactions/?undo=1',
        transaction
      )
      if ('data' in res) {
        fireEvent(this, 'nav', {path: redirect})
      } else if ('error' in res) {
        fireEvent(this, 'grampsjs:error', {message: res.error})
      }
    }
  }

  _handleEvent(event) {
    const transaction = event.detail.transaction || []
    const redirect = event.detail.redirect || ''
    fireEvent(this, 'grampsjs:notification', {
      message: this._(event.detail.message),
      action: {
        label: this._('Undo'),
        handler: () => this._undo(transaction, redirect),
      },
      timeout: UNDO_TIMEOUT,
      dismissible: true,
      keep: true,
    })
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
