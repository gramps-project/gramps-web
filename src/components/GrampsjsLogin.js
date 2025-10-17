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

const BASE_DIR = ''

class GrampsjsLogin extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #login-container {
          margin: auto;
          height: 100%;
          max-width: 20em;
        }

        #login-form {
          position: relative;
          top: 20vh;
        }

        #login-form mwc-textfield {
          width: 100%;
          margin-bottom: 0.7em;
        }

        #login-form md-outlined-text-field {
          width: 100%;
          margin-bottom: 0.7em;
        }

        #login-form md-filled-button {
          width: 100%;
          margin-bottom: 0.5em;
        }

        .button-container {
          display: flex;
          gap: 0.5em;
          margin-top: 1em;
          margin-bottom: 0.5em;
          --button-height: 48px;
        }

        .button-container md-outlined-button,
        .button-container md-filled-button {
          flex: 1;
          height: var(--button-height);
        }

        .button-container md-outlined-button {
          --md-outlined-button-container-height: var(--button-height);
          --md-outlined-button-leading-space: 8px;
          --md-outlined-button-trailing-space: 8px;
          --md-outlined-button-top-space: 0px;
          --md-outlined-button-bottom-space: 0px;
          min-height: var(--button-height);
          max-height: var(--button-height);
        }

        .button-container md-outlined-button::part(outline) {
          height: var(--button-height);
        }

        .button-container md-filled-button {
          --md-filled-button-container-height: var(--button-height);
          --md-filled-button-leading-space: 8px;
          --md-filled-button-trailing-space: 8px;
          --md-filled-button-top-space: 0px;
          --md-filled-button-bottom-space: 0px;
          min-height: var(--button-height);
          max-height: var(--button-height);
        }

        .button-container md-filled-button::part(container) {
          height: var(--button-height);
        }

        p.reset-link {
          padding-top: 1em;
          font-size: 0.9em;
        }

        p.forgot-password {
          text-align: center;
          font-size: 0.85em;
          margin-top: 0.75em;
          margin-bottom: 1.5em;
        }

        p.success {
          padding-top: 1em;
          color: var(--grampsjs-alert-success-font-color);
          font-size: 1.2em;
          font-weight: 400;
          --mdc-icon-size: 1.6em;
          line-height: 1.4em;
          text-align: center;
        }

        mwc-circular-progress {
          --mdc-theme-primary: var(--mdc-theme-on-primary);
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
    }
  }

  constructor() {
    super()
    this.resetpw = false
    this.isFormValid = false
    this.credentials = {}
    this.tree = ''
    this.oidcConfig = {}
  }

  async connectedCallback() {
    super.connectedCallback()
    const config = await apiGetOIDCConfig()
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

  _renderLogin() {
    const localAuthDisabled =
      this.oidcConfig?.enabled && this.oidcConfig?.disable_local_auth

    return html`
      <div id="login-container">
        <form
          id="login-form"
          action="${BASE_DIR}/"
          @keydown="${this._handleLoginKey}"
        >
          <h2>${this._('Log in to Gramps Web')}</h2>
          ${localAuthDisabled
            ? ''
            : html`
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
                <div class="button-container">
                  ${window.grampsjsConfig.hideRegisterLink
                    ? ''
                    : html`
                        <md-outlined-button
                          @click="${() => this._handleNav('register')}"
                        >
                          ${this._('Register new account')}
                        </md-outlined-button>
                      `}
                  <md-filled-button type="submit" @click="${this._submitLogin}">
                    ${this._('login')}
                  </md-filled-button>
                </div>
                <mwc-circular-progress
                  indeterminate
                  density="-7"
                  closed
                  id="login-progress"
                  style="display:none; margin-top: 0.5em;"
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
              `}
          ${this.oidcConfig?.enabled &&
          this.oidcConfig?.providers &&
          !localAuthDisabled
            ? html`<hr />`
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
        </form>
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
    return `${this._('Continue with')} ${providerName}`
  }

  _credChanged(e) {
    this.credentials = {...this.credentials, [e.target.id]: e.target.value}
  }

  _renderResetPw() {
    return html`
      <div id="login-container">
        <form id="login-form" action="${BASE_DIR}/">
          <h2>${this._('reset password')}</h2>
          <div id="inner-form">
            <md-outlined-text-field
              id="username"
              label="${this._('Username')}"
              type="text"
            ></md-outlined-text-field>
            <md-filled-button
              type="submit"
              @click="${this._resetPw}"
              style="width: 100%;"
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
        </form>
      </div>
    `
  }

  _checkFormValid() {
    const fields = Array.from(this.shadowRoot.querySelectorAll('mwc-textfield'))
    this.isFormValid = fields.every(el => el?.validity?.valid)
  }

  _handleLoginKey(event) {
    if (event.code === 'Enter') {
      this._submitLogin()
    }
  }

  async _submitLogin() {
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

  async _resetPw() {
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
