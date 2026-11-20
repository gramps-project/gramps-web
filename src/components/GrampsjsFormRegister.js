/* eslint-disable lit-a11y/click-events-have-key-events */
import {html, css, LitElement} from 'lit'
import '@material/web/textfield/outlined-text-field'
import '@material/web/button/filled-button.js'

import {mdiCheckCircle} from '@mdi/js'

import './GrampsjsIcon.js'
import {renderOidcButtons} from './GrampsjsOidcButton.js'
import {sharedStyles} from '../SharedStyles.js'
import {
  apiRegisterUser,
  apiGetOIDCConfig,
  apiGetRegistrationEnabled,
  apiOIDCLogin,
} from '../api.js'
import {fireEvent} from '../util.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsFormRegister extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #register-container {
          margin: auto;
          height: 100%;
          max-width: 20em;
        }

        #register-form {
          position: relative;
          top: 20vh;
        }

        #register-form md-outlined-text-field {
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

        hr {
          margin-top: 2em;
          margin-bottom: 2em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      isFormValid: {type: Boolean},
      email: {type: String},
      emailError: {type: String},
      register: {type: Boolean},
      tree: {type: String},
      oidcConfig: {type: Object},
      _oidcProvider: {type: String},
      _registered: {type: Boolean},
      _registrationEnabled: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.isFormValid = false
    this.register = true
    this.email = ''
    this.emailError = ''
    this.tree = ''
    this.oidcConfig = {}
    this._oidcProvider = ''
    this._registered = false
    // undefined while loading, null when the server does not say
    this._registrationEnabled = undefined
    this._boundHandlePageShow = this._handlePageShow.bind(this)
  }

  async connectedCallback() {
    super.connectedCallback()
    window.addEventListener('pageshow', this._boundHandlePageShow)
    const config = await apiGetOIDCConfig()
    if (!config.error) {
      this.oidcConfig = config
    }
  }

  willUpdate(changed) {
    if (changed.has('tree')) {
      this._loadRegistrationEnabled()
    }
  }

  async _loadRegistrationEnabled() {
    const {tree} = this
    this._registrationEnabled = undefined
    const enabled = await apiGetRegistrationEnabled(tree)
    if (this.tree !== tree) {
      return
    }
    this._registrationEnabled = enabled
    if (enabled === false && this.isConnected) {
      fireEvent(this, 'nav', {path: this._loginPath(), replace: true})
    }
  }

  _loginPath() {
    return this.tree ? `login/${this.tree}` : 'login'
  }

  disconnectedCallback() {
    window.removeEventListener('pageshow', this._boundHandlePageShow)
    super.disconnectedCallback()
  }

  // a page restored from the back/forward cache must not keep showing
  // a sign-in in progress
  _handlePageShow(e) {
    if (e.persisted) {
      this._oidcProvider = ''
    }
  }

  render() {
    // empty while loading and while redirecting to the login page
    if (
      this._registrationEnabled === undefined ||
      this._registrationEnabled === false
    ) {
      return ''
    }
    const oidcEnabled =
      this.oidcConfig?.enabled &&
      this.oidcConfig?.providers?.length > 0 &&
      !this._registered
    const localAuthDisabled =
      this.oidcConfig?.enabled && this.oidcConfig?.disable_local_auth

    return html`
      <div id="register-container">
        <form id="register-form" @keydown="${this._checkFormValid}">
          <h2>${this._('Register to Gramps Web')}</h2>
          ${localAuthDisabled ? '' : this._renderLocalForm()}
          ${oidcEnabled && !localAuthDisabled ? html`<hr />` : ''}
          ${oidcEnabled
            ? renderOidcButtons(this.oidcConfig.providers, {
                translate: (...args) => this._(...args),
                loadingProvider: this._oidcProvider,
                onClick: id => this._submitOIDCLogin(id),
              })
            : ''}
          <p class="reset-link">
            ${this._('Already have an account?')}
            <span class="link" @click="${this._handleClickLogin}">
              ${this._('login')}
            </span>
          </p>
        </form>
      </div>
    `
  }

  _renderLocalForm() {
    return html`
      <div id="inner-form">
        <md-outlined-text-field
          required
          outlined
          autocapitalize="off"
          id="username"
          label="${this._('Username')}"
          type="text"
        ></md-outlined-text-field>
        <md-outlined-text-field
          required
          outlined
          autocapitalize="off"
          id="password"
          label="${this._('Password')}"
          @input="${this._handlePasswordInput}"
          type="password"
        ></md-outlined-text-field>
        <md-outlined-text-field
          required
          outlined
          autocapitalize="off"
          id="password2"
          error-text="${this._('Passwords do not match.')}"
          label="${this._('Confirm Password')}"
          @input="${this._handleConfirmPasswordInput}"
          type="password"
        ></md-outlined-text-field>
        <md-outlined-text-field
          id="email"
          required
          label="${this._('E-mail address')}"
          .value="${this.email}"
          @input="${this.handleEmailInput}"
          ?error="${this.emailError !== ''}"
          error-text="${this.emailError}"
          type="email"
        ></md-outlined-text-field>
        <md-outlined-text-field
          required
          outlined
          id="fullname"
          @input="${this._checkFormValid}"
          label="${this._('Full name')}"
          type="text"
        ></md-outlined-text-field>
        <md-filled-button
          type="button"
          @click="${this._register}"
          ?disabled="${!this.isFormValid}"
        >
          ${this._('Register new account')}
        </md-filled-button>
      </div>
      <p class="success" id="register-success" style="display:none;">
        <grampsjs-icon
          path="${mdiCheckCircle}"
          color="currentColor"
        ></grampsjs-icon
        ><br />
        ${this._('New account registered successfully.')}
        <br />
        ${this._(
          'Please confirm your e-mail address by clicking the link in the e-mail you received and then wait for the tree owner to activate your account.'
        )}
      </p>
    `
  }

  async _submitOIDCLogin(providerId) {
    this._oidcProvider = providerId
    const res = await apiOIDCLogin(providerId, this.tree)
    if ('error' in res) {
      this._oidcProvider = ''
      this._showError(res.error)
    }
  }

  _handleClickLogin() {
    this.register = false
    this._handleNav(this._loginPath())
  }

  _handleNav(path) {
    fireEvent(this, 'nav', {path})
  }

  _handlePasswordInput() {
    const pwField = this.shadowRoot.getElementById('password')
    const pw2Field = this.shadowRoot.getElementById('password2')
    // Only update if pw2Field has been set
    if (pw2Field.value !== '') {
      pw2Field.error = pwField.value !== pw2Field.value
      this._checkFormValid()
    }
  }

  _handleConfirmPasswordInput() {
    const pwField = this.shadowRoot.getElementById('password')
    const pw2Field = this.shadowRoot.getElementById('password2')
    // Set error attribute if passwords do not match
    pw2Field.error = pwField.value !== pw2Field.value
    this._checkFormValid()
  }

  handleEmailInput(e) {
    this.email = e.target.value
    this.validateEmail()
    // call check async
    setTimeout(() => {
      this._checkFormValid()
    }, 0)
  }

  validateEmail() {
    // using email pattern from https://emailregex.com/
    const emailPattern =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    this.emailError = emailPattern.test(this.email)
      ? ''
      : this._('Invalid E-mail address')
  }

  _checkFormValid() {
    const mdFields = Array.from(
      this.shadowRoot.querySelectorAll('md-outlined-text-field')
    )
    // form is valid if all fields are valid
    this.isFormValid = mdFields.every(
      field => field.validity.valid && !field.error
    )
  }

  async _register(e) {
    e?.preventDefault()
    e?.stopPropagation()

    const userField = this.shadowRoot.getElementById('username')
    const pwField = this.shadowRoot.getElementById('password')
    const emailField = this.shadowRoot.getElementById('email')
    const nameField = this.shadowRoot.getElementById('fullname')
    const tree = this.tree || ''
    const res = await apiRegisterUser(
      userField.value,
      pwField.value,
      emailField.value,
      nameField.value,
      tree
    )
    const innerForm = this.shadowRoot.getElementById('inner-form')
    const divSuccess = this.shadowRoot.getElementById('register-success')
    if ('error' in res) {
      this._showError(res.error)
    } else {
      divSuccess.style.display = 'block'
      innerForm.style.display = 'none'
      this._registered = true
    }
  }

  _showError(message) {
    fireEvent(this, 'grampsjs:error', {message})
  }
}

window.customElements.define('grampsjs-form-register', GrampsjsFormRegister)
