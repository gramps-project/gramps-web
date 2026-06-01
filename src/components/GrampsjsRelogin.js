import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'
import '@material/web/textfield/filled-text-field'
import './GrampsjsOidcButton.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {apiGetTokens, apiOIDCLogin} from '../api.js'
import {fireEvent} from '../util.js'

class GrampsjsRelogin extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-filled-text-field {
          margin-right: 8px;
          margin-bottom: 12px;
        }

        .hidden {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      username: {type: String},
      _error: {type: String},
    }
  }

  constructor() {
    super()
    this.username = ''
    this._error = ''
  }

  get _oidcProvider() {
    return this.appState?.auth?.claims?.oidc_provider || ''
  }

  show() {
    this.renderRoot.querySelector('md-dialog').show()
  }

  render() {
    return html`
      <md-dialog
        id="filter-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <form slot="content" id="form-id" method="dialog">
          ${this._oidcProvider
            ? html`
                <p>${this._('Please sign in again to continue.')}</p>
                <grampsjs-oidc-button
                  .provider="${this._oidcProvider}"
                  .providerName="${this._oidcProvider}"
                  .onClick="${() => this._handleOIDCLogin()}"
                  .buttonText="${this._(
                    'Continue with %s',
                    this._oidcProvider
                  )}"
                  .signingInText="${this._('Signing in...')}"
                ></grampsjs-oidc-button>
              `
            : html`
                <p>${this._('Please re-enter your password to continue.')}</p>
                <md-filled-text-field
                  label="${this._('Password: ').replace(':', '')}"
                  type="password"
                  id="password"
                >
                </md-filled-text-field>
                ${this._error
                  ? html` <p class="alert error">${this._error}</p>`
                  : ''}
              `}
        </form>

        <div slot="actions">
          <md-text-button form="form-id" value="cancel"
            >${this._('Cancel')}</md-text-button
          >
          ${!this._oidcProvider
            ? html`<md-text-button @click="${this._handleClickOk}"
                >${this._('login')}</md-text-button
              >`
            : ''}
          <md-text-button
            class="hidden"
            form="form-id"
            value="ok"
            id="hidden-ok"
          ></md-text-button>
        </div>
      </md-dialog>
    `
  }

  async _handleClickOk(e) {
    e.stopPropagation()
    e.preventDefault()
    const error = await this._fetchToken()
    if (!error) {
      this._error = ''
      this.renderRoot.querySelector('#hidden-ok').click()
    } else {
      this._error = this._((error.message ?? error) || 'Error')
    }
    // click the actual (hidden) OK button
  }

  async _handleOIDCLogin() {
    await apiOIDCLogin(this._oidcProvider)
  }

  async _fetchToken() {
    const password = this.renderRoot.querySelector('#password')?.value
    if (!password) {
      return 'Password is required'
    }
    const res = await apiGetTokens(this.username, password)
    if ('error' in res) {
      return res.error
    }
    return false
  }

  _handleClose() {
    this._error = ''
    const {returnValue} = this.renderRoot.querySelector('md-dialog')
    if (returnValue === 'ok') {
      fireEvent(this, 'relogin')
    }
  }
}

window.customElements.define('grampsjs-relogin', GrampsjsRelogin)
