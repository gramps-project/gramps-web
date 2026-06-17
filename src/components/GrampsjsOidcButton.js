import {html, css, LitElement} from 'lit'
import '@material/web/button/filled-button'
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

        md-filled-button {
          width: 100%;
          --md-filled-button-container-height: 44px;
          --md-filled-button-container-color: #7c3aed;
          --md-filled-button-hover-container-color: #6d28d9;
          --md-filled-button-label-text-color: #ffffff;
          --md-filled-button-hover-label-text-color: #ffffff;
          --md-filled-button-container-shape: 0.6rem;
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
      color="#ffffff"
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
      <md-filled-button
        @click="${this._handleClick}"
        ?disabled="${this.disabled || this.loading}"
      >
        ${this._getProviderIcon()}
        ${this.loading ? this.signingInText : this.buttonText}
      </md-filled-button>
    `
  }
}

window.customElements.define('grampsjs-oidc-button', GrampsjsOidcButton)
