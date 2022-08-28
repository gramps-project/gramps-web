// Adopted from the Home Assistant project

import {html, LitElement} from 'lit'

import {fireEvent} from '../util.js'

export class GrampsjsPasswordManagerPolyfill extends LitElement {
  createRenderRoot () {
    // Add under document body so the element isn't placed inside any shadow roots
    return document.body
  }

  styles () {
    return `
    .password-manager-polyfill {
      position: absolute;
      top: ${(this.boundingRect?.y || 19) + 48}px;
      left: calc(50% - ${(this.boundingRect?.width || 360) / 2}px);
      width: ${this.boundingRect?.width || 360}px;
      opacity: 0;
      z-index: -1;
    }
    .password-manager-polyfill input {
      width: 100%;
      height: 62px;
      padding: 0;
      border: 0;
    }
    .password-manager-polyfill input[type="submit"] {
      width: 0;
      height: 0;
    }
  `
  }

  static get properties () {
    return {
      credentials: {type: Object},
      boundingRect: {type: Object}
    }
  }

  constructor () {
    super()
    this.credentials = {}
  }

  render () {
    return html`
      <form
        class="password-manager-polyfill"
        aria-hidden="true"
        @submit=${this._handleSubmit}
      >
        <input
          tabindex="-1"
          id="username"
          type="text"
          .value="${this.credentials.username || ''}"
          @input=${this._valueChanged}
        />
        <input
          tabindex="-1"
          id="password"
          type="password"
          .value="${this.credentials.password || ''}"
          @input=${this._valueChanged}
        />
        <input type="submit" />
        <style>
          ${this.styles()}
        </style>
      </form>
      `
  }

  _handleSubmit (ev) {
    ev.preventDefault()
    fireEvent(this, 'form-submitted')
  }

  _valueChanged (e) {
    this.credentials = {...this.credentials, [e.target.id]: e.target.value}
    fireEvent(this, 'value-changed', {value: this.credentials})
  }
}

window.customElements.define('grampsjs-password-manager-polyfill', GrampsjsPasswordManagerPolyfill)
