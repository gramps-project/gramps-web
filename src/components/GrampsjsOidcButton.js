import {html, css, LitElement} from 'lit'
import '@material/web/button/outlined-button'
import {mdiGoogle, mdiMicrosoft, mdiGithub, mdiOpenid} from '@mdi/js'

import './GrampsjsIcon.js'

class GrampsjsOidcButton extends LitElement {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          margin-top: 1em;
        }

        md-outlined-button {
          width: 100%;
          --md-outlined-button-container-height: 44px;
        }

        grampsjs-icon {
          margin-right: 8px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      provider: {type: String},
      providerName: {type: String},
      onClick: {type: Function},
      disabled: {type: Boolean},
      loading: {type: Boolean},
      buttonText: {type: String},
      signingInText: {type: String},
    }
  }

  constructor() {
    super()
    this.provider = 'custom'
    this.providerName = 'OIDC'
    this.onClick = () => {}
    this.disabled = false
    this.loading = false
    this.buttonText = 'Sign in'
    this.signingInText = 'Signing in...'
  }

  _getProviderIcon() {
    let iconPath
    switch (this.provider) {
      case 'google':
        iconPath = mdiGoogle
        break
      case 'microsoft':
        iconPath = mdiMicrosoft
        break
      case 'github':
        iconPath = mdiGithub
        break
      default:
        iconPath = mdiOpenid
    }
    return html`<grampsjs-icon
      .path="${iconPath}"
      slot="icon"
      color="var(--mdc-theme-primary)"
    ></grampsjs-icon>`
  }

  _handleClick(e) {
    e.preventDefault()
    if (this.disabled || this.loading) {
      return
    }
    if (this.onClick) {
      this.onClick()
    }
  }

  render() {
    return html`
      <md-outlined-button
        @click="${this._handleClick}"
        ?disabled="${this.disabled || this.loading}"
      >
        ${this._getProviderIcon()}
        ${this.loading ? this.signingInText : this.buttonText}
      </md-outlined-button>
    `
  }
}

window.customElements.define('grampsjs-oidc-button', GrampsjsOidcButton)
