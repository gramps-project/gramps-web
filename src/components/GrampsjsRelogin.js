import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'
import '@material/web/textfield/filled-text-field'
import './GrampsjsOidcButton.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {apiGetOIDCConfig, apiGetTokens, apiOIDCLogin} from '../api.js'
import {OIDC_RETURN_PATH_KEY, reloginProviders} from '../oidc.js'
import {fireEvent} from '../util.js'

class GrampsjsRelogin extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        grampsjs-oidc-button {
          display: block;
          margin-bottom: 16px;
        }

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
      _loading: {type: Boolean},
      _providers: {type: Array},
      _localAuth: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.username = ''
    this._error = ''
    this._loading = false
    this._providers = []
    this._localAuth = true
  }

  show() {
    this.renderRoot.querySelector('md-dialog').show()
    this._loadProviders()
  }

  // Offers the providers the user has linked now, not the one from the token's
  // claim, which refreshed tokens don't have.
  async _loadProviders() {
    this._loading = true
    const config = await apiGetOIDCConfig()
    let accounts = null
    if (config?.enabled) {
      const res = await this.appState.apiGet('/api/users/-/oidc-accounts/')
      // older API versions can't list them
      accounts = 'error' in res ? null : res.data
    }
    this._providers = reloginProviders(
      config,
      accounts,
      this.appState?.auth?.claims?.oidc_provider
    )
    this._localAuth = !(config?.enabled && config.disable_local_auth)
    this._loading = false
  }

  render() {
    return html`
      <md-dialog
        id="filter-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <form slot="content" id="form-id" method="dialog">
          ${this._loading ? '' : this._renderContent()}
        </form>

        <div slot="actions">
          <md-text-button form="form-id" value="cancel"
            >${this._('Cancel')}</md-text-button
          >
          ${!this._loading && this._localAuth
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

  _renderContent() {
    return html`
      ${this._providers.length
        ? html`
            <p>${this._('Please sign in again to continue.')}</p>
            ${this._providers.map(
              provider => html`
                <grampsjs-oidc-button
                  .provider="${provider.id}"
                  .providerName="${provider.name}"
                  .onClick="${() => this._handleOIDCLogin(provider.id)}"
                  .buttonText="${this._('Continue with %s', provider.name)}"
                  .signingInText="${this._('Signing in...')}"
                ></grampsjs-oidc-button>
              `
            )}
          `
        : html`<p>${this._('Please re-enter your password to continue.')}</p>`}
      ${this._localAuth
        ? html`
            <md-filled-text-field
              label="${this._('Password: ').replace(':', '')}"
              type="password"
              id="password"
            >
            </md-filled-text-field>
            ${this._error
              ? html` <p class="alert error">${this._error}</p>`
              : ''}
          `
        : ''}
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

  // Signing in through the provider leaves the page and comes back to it.
  async _handleOIDCLogin(providerId) {
    fireEvent(this, 'relogin-redirect')
    try {
      sessionStorage.setItem(OIDC_RETURN_PATH_KEY, window.location.pathname)
    } catch {
      // then the sign-in ends on the home page
    }
    const res = await apiOIDCLogin(providerId)
    if (res?.error) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
    }
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
