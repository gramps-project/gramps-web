/*
The dropdown menu for adding objects in the top app bar
*/

import {css, html, LitElement} from 'lit'
import '@material/mwc-snackbar'
import '@material/web/iconbutton/icon-button.js'

import {mdiClose} from '@mdi/js'

import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsUndoTransaction extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        /* mwc-snackbar styles its dismiss button via ::slotted(mwc-icon-button),
           matched by tag name, so md-icon-button gets none of it. Replicate the
           size, colour and spacing it used to provide. */
        md-icon-button[slot='dismiss'] {
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-width: 36px;
          --md-icon-button-state-layer-height: 36px;
          --md-icon-button-icon-color: rgba(255, 255, 255, 0.87);
          --md-icon-button-hover-icon-color: rgba(255, 255, 255, 0.87);
          --md-icon-button-focus-icon-color: rgba(255, 255, 255, 0.87);
          --md-icon-button-pressed-icon-color: rgba(255, 255, 255, 0.87);
          margin-left: 8px;
          margin-right: 0;
        }
      `,
    ]
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
        <md-icon-button slot="dismiss" aria-label="${this._('Close')}">
          <grampsjs-icon
            path="${mdiClose}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
      </mwc-snackbar>
    `
  }

  async _handleUndo() {
    if (this.transaction.length > 0) {
      const res = await this.appState.apiPost(
        '/api/transactions/?undo=1',
        this.transaction
      )
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
