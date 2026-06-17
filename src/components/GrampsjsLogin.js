/* eslint-disable lit-a11y/click-events-have-key-events */
import {html, css, LitElement} from 'lit'

import '@material/mwc-icon'
import '@material/mwc-textfield'
import '@material/mwc-circular-progress'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'

import './GrampsjsPasswordManagerPolyfill.js'
import './GrampsjsOidcButton.js'
import {sharedStyles} from '../SharedStyles.js'
import {
  apiGetTokens,
  apiResetPassword,
  apiGetOIDCConfig,
  apiOIDCLogin,
} from '../api.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsLogin extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          min-height: 100vh;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            sans-serif;
        }

        /* Violet gradient wash at the top, matching ancestry.net.nz */
        #login-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
        }

        #login-container::before {
          content: '';
          position: absolute;
          inset-inline: 0;
          top: 0;
          height: 24rem;
          background: linear-gradient(
            to bottom,
            #f5f3ff,
            rgba(245, 243, 255, 0.5),
            transparent
          );
          pointer-events: none;
        }

        #login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 26em;
          margin: 2em 1.5em;
          padding: 2.5em 2.25em;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06),
            0 4px 16px rgba(0, 0, 0, 0.06);
          box-sizing: border-box;
        }

        /* Wordmark */
        .wordmark {
          display: block;
          margin-bottom: 2em;
          font-size: 1.1em;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .wordmark span {
          color: #7c3aed;
        }

        /* Headings */
        #login-card h2 {
          margin: 0 0 0.5em 0;
          font-size: 1.75em;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .subtitle {
          margin: 0 0 2em 0;
          font-size: 0.95em;
          line-height: 1.6;
          color: #64748b;
        }

        /* Text fields (admin login path) */
        md-outlined-text-field,
        mwc-textfield {
          width: 100%;
          margin-bottom: 0.75em;
        }

        /* Submit button row */
        .button-row {
          display: flex;
          gap: 0.5em;
          margin-top: 1.25em;
        }

        .button-row md-outlined-button,
        .button-row md-filled-button {
          flex: 1;
          --md-outlined-button-container-height: 44px;
          --md-filled-button-container-height: 44px;
          --md-filled-button-container-color: #7c3aed;
          --md-filled-button-hover-container-color: #6d28d9;
          --md-filled-button-label-text-color: #ffffff;
          --md-filled-button-hover-label-text-color: #ffffff;
          --md-filled-button-container-shape: 0.6rem;
          --md-outlined-button-container-shape: 0.6rem;
          --md-outlined-button-outline-color: #d1d5db;
        }

        p.forgot-password {
          text-align: center;
          font-size: 0.85em;
          margin-top: 0.75em;
          margin-bottom: 0;
          color: #64748b;
        }

        p.forgot-password .link {
          color: #7c3aed;
          cursor: pointer;
        }

        p.forgot-password .link:hover {
          text-decoration: underline;
        }

        /* Divider between local and OIDC */
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75em;
          margin: 1.75em 0;
          color: #9ca3af;
          font-size: 0.8em;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        /* Reset-password form */
        p.success {
          padding-top: 1em;
          color: var(--grampsjs-alert-success-font-color);
          font-size: 1.1em;
          font-weight: 400;
          --mdc-icon-size: 1.5em;
          line-height: 1.5em;
          text-align: center;
        }

        p.reset-link {
          padding-top: 1em;
          font-size: 0.9em;
          text-align: center;
        }

        mwc-circular-progress {
          --mdc-theme-primary: var(--mdc-theme-on-primary);
          margin-top: 0.5em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      resetpw: {type: Boolean},
      isFormValid: {type: Boolean},
      credentials: {type: Object},
      tree: {type: String},
      oidcConfig: {type: Object},
      _oidcConfigLoaded: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.resetpw = false
    this.isFormValid = false
    this.credentials = {}
    this.tree = ''
    this.oidcConfig = {}
    this._oidcConfigLoaded = false
  }

  async connectedCallback() {
    super.connectedCallback()
    const config = await apiGetOIDCConfig()
    this._oidcConfigLoaded = true
    if (!config.error) {
      this.oidcConfig = config

      if (
        config.enabled &&
        config.disable_local_auth &&
        config.auto_redirect &&
        config.providers &&
        config.providers.length === 1
      ) {
        requestAnimationFrame(() =>
          this._submitOIDCLogin(config.providers[0].id)
        )
      }
    }
  }

  render() {
    if (this.resetpw) {
      return this._renderResetPw()
    }
    return this._renderLogin()
  }

  _renderWordmark() {
    return html`<span class="wordmark">ancestry<span>.net.nz</span></span>`
  }

  _renderLogin() {
    const localAuthDisabled =
      this.oidcConfig?.enabled && this.oidcConfig?.disable_local_auth
    const adminLogin = window.location.pathname === '/login-admin'
    const showLocalAuth =
      this._oidcConfigLoaded &&
      !localAuthDisabled &&
      (adminLogin || !this.oidcConfig?.enabled)

    return html`
      <div id="login-container">
        <div id="login-card">
          ${this._renderWordmark()}
          <h2>${this._('Sign in')}</h2>
          <p class="subtitle">
            ${this._('This is a private site for family members.')}
          </p>

          ${showLocalAuth
            ? html`
                <md-outlined-text-field
                  id="username"
                  label="${this._('Username')}"
                  @input="${this._credChanged}"
                  @change="${this._credChanged}"
                  value="${this.credentials.username || ''}"
                ></md-outlined-text-field>
                <md-outlined-text-field
                  id="password"
                  label="${this._('Password')}"
                  type="password"
                  @input="${this._credChanged}"
                  @change="${this._credChanged}"
                  value="${this.credentials.password || ''}"
                ></md-outlined-text-field>
                <div class="button-row">
                  ${window.grampsjsConfig.hideRegisterLink
                    ? ''
                    : html`
                        <md-outlined-button
                          @click="${() => this._handleNav('register')}"
                        >
                          ${this._('Register new account')}
                        </md-outlined-button>
                      `}
                  <md-filled-button
                    type="submit"
                    @click="${this._submitLogin}"
                    ?disabled="${!this.credentials.username ||
                    !this.credentials.password}"
                  >
                    ${this._('login')}
                  </md-filled-button>
                </div>
                <mwc-circular-progress
                  indeterminate
                  density="-7"
                  closed
                  id="login-progress"
                  style="display:none;"
                >
                </mwc-circular-progress>
                <p class="forgot-password">
                  <span
                    class="link"
                    @click="${() => {
                      this.resetpw = true
                    }}"
                    >${this._('Lost password?')}</span
                  >
                </p>
              `
            : ''}
          ${showLocalAuth &&
          this.oidcConfig?.enabled &&
          this.oidcConfig?.providers
            ? html`<div class="divider">or</div>`
            : ''}
          ${this.oidcConfig?.enabled && this.oidcConfig?.providers
            ? this.oidcConfig.providers.map(
                provider => html`
                  <grampsjs-oidc-button
                    .provider="${provider.id}"
                    .providerName="${provider.name}"
                    .onClick="${() => this._submitOIDCLogin(provider.id)}"
                    .buttonText="${this._getOIDCButtonText(
                      provider.id,
                      provider.name
                    )}"
                    .signingInText="${this._('Signing in...')}"
                  ></grampsjs-oidc-button>
                `
              )
            : ''}
        </div>
        <grampsjs-password-manager-polyfill
          .credentials=${this.credentials}
          @form-submitted=${this._submitLogin}
          @value-changed=${this._loginFormChanged}
        ></grampsjs-password-manager-polyfill>
      </div>
    `
  }

  firstUpdated() {
    const pf = this.shadowRoot.querySelector(
      'grampsjs-password-manager-polyfill'
    )
    if (pf !== null) {
      pf.boundingRect = this.getBoundingClientRect()
    }
  }

  _handleNav(path) {
    fireEvent(this, 'nav', {path})
  }

  _getOIDCButtonText(providerId, providerName) {
    return this._('Continue to sign in')
  }

  _credChanged(e) {
    this.credentials = {...this.credentials, [e.target.id]: e.target.value}
  }

  _renderResetPw() {
    return html`
      <div id="login-container">
        <div id="login-card">
          ${this._renderWordmark()}
          <h2>${this._('reset password')}</h2>
          <p class="subtitle">
            ${this._("Enter your username and we'll send a reset link.")}
          </p>
          <div id="inner-form">
            <md-outlined-text-field
              id="username"
              label="${this._('Username')}"
              type="text"
            ></md-outlined-text-field>
            <md-filled-button
              type="submit"
              @click="${this._resetPw}"
              style="width: 100%; --md-filled-button-container-color: #7c3aed; --md-filled-button-label-text-color: #fff; --md-filled-button-container-shape: 0.6rem;"
            >
              ${this._('reset password')}
            </md-filled-button>
          </div>
          <p class="success" id="reset-success" style="display:none;">
            <mwc-icon>check_circle</mwc-icon><br />
            ${this._('A password reset link has been sent by e-mail.')}
          </p>
          <p class="reset-link">
            <span
              class="link"
              @click="${() => {
                this.resetpw = false
              }}"
              >${this._('_Back')}</span
            >
          </p>
        </div>
      </div>
    `
  }

  _checkFormValid() {
    const fields = Array.from(this.shadowRoot.querySelectorAll('mwc-textfield'))
    this.isFormValid = fields.every(el => el?.validity?.valid)
  }

  _handleLoginKey(event) {
    if (event.code === 'Enter') {
      this._submitLogin(event)
    }
  }

  async _submitLogin(e) {
    e?.preventDefault()
    e?.stopPropagation()

    if (!this.credentials.username || !this.credentials.password) {
      return
    }

    const submitProgress = this.shadowRoot.getElementById('login-progress')
    submitProgress.style.display = 'block'
    submitProgress.closed = false
    apiGetTokens(this.credentials.username, this.credentials.password).then(
      res => {
        if ('error' in res) {
          submitProgress.style.display = 'none'
          submitProgress.closed = true
          this._showError(res.error)
        } else {
          document.location.href = '/'
        }
      }
    )
  }

  async _submitOIDCLogin(providerId) {
    if (!providerId) {
      this._showError('No OIDC provider specified')
      return
    }
    const res = await apiOIDCLogin(providerId)
    if ('error' in res) {
      this._showError(res.error)
    }
  }

  _loginFormChanged(ev) {
    this.credentials = {...this.credentials, ...ev.detail.value}
  }

  async _resetPw(e) {
    e?.preventDefault()
    e?.stopPropagation()

    const userField = this.shadowRoot.getElementById('username')
    if (userField.value === '') {
      this._showError('Username must not be empty.')
      return
    }
    const res = await apiResetPassword(userField.value)
    const innerForm = this.shadowRoot.getElementById('inner-form')
    const divSuccess = this.shadowRoot.getElementById('reset-success')
    if ('error' in res) {
      this._showError(res.error)
    } else {
      divSuccess.style.display = 'block'
      innerForm.style.display = 'none'
    }
  }

  _showError(message) {
    fireEvent(this, 'grampsjs:error', {message})
  }
}

window.customElements.define('grampsjs-login', GrampsjsLogin)
