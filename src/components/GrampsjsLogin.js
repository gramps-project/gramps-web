/* eslint-disable lit-a11y/click-events-have-key-events */
import {html, css, LitElement} from 'lit'

import '@material/mwc-icon'
import '@material/mwc-button'
import '@material/mwc-textfield'
import '@material/mwc-circular-progress'

import './GrampsjsPasswordManagerPolyfill.js'
import {sharedStyles} from '../SharedStyles.js'
import {apiGetTokens, apiResetPassword} from '../api.js'
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

        p.reset-link {
          padding-top: 1em;
          font-size: 0.9em;
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
    }
  }

  constructor() {
    super()
    this.resetpw = false
    this.isFormValid = false
    this.credentials = {}
    this.tree = ''
  }

  render() {
    if (this.resetpw) {
      return this._renderResetPw()
    }
    return this._renderLogin()
  }

  _renderLogin() {
    return html`
      <div id="login-container">
        <form
          id="login-form"
          action="${BASE_DIR}/"
          @keydown="${this._handleLoginKey}"
        >
          <h2>${this._('Log in to Gramps Web')}</h2>
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
          <mwc-button
            raised
            label="${this._('login')}"
            type="submit"
            @click="${this._submitLogin}"
          >
            <span slot="trailingIcon" style="display:none;">
              <mwc-circular-progress
                indeterminate
                density="-7"
                closed
                id="login-progress"
              >
              </mwc-circular-progress>
            </span>
          </mwc-button>
          <p class="reset-link">
            <span
              class="link"
              @click="${() => {
                this.resetpw = true
              }}"
              >${this._('Lost password?')}</span
            >
          </p>
          ${window.grampsjsConfig.hideRegisterLink
            ? ''
            : html`
                <p class="reset-link">
                  <span
                    class="link"
                    @click="${() => this._handleNav('register')}"
                    >${this._('Register new account')}</span
                  >
                </p>
              `}
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
            <mwc-button
              raised
              label="${this._('reset password')}"
              type="submit"
              @click="${this._resetPw}"
            >
              <span slot="trailingIcon" style="display:none;">
                <mwc-circular-progress
                  indeterminate
                  density="-7"
                  closed
                  id="login-progress"
                >
                </mwc-circular-progress>
              </span>
            </mwc-button>
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
    submitProgress.parentElement.style.display = 'block'
    submitProgress.closed = false
    apiGetTokens(this.credentials.username, this.credentials.password).then(
      res => {
        if ('error' in res) {
          submitProgress.parentElement.style.display = 'none'
          submitProgress.closed = true
          this._showError(res.error)
        } else {
          document.location.href = '/'
        }
      }
    )
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
