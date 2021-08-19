// Adopted from the Home Assistant project

import {html, LitElement} from 'lit'


export class GrampsjsPasswordManagerPolyfill extends LitElement {

  createRenderRoot() {
    // Add under document body so the element isn't placed inside any shadow roots
    return document.body
  }

  static get styles() {
    return `
    .password-manager-polyfill {
      position: absolute;
      top: ${this.boundingRect?.y || 148}px;
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

  render() {
    return html`
        <form
          class="password-manager-polyfill"
          aria-hidden="true"
          @submit=${this._handleSubmit}
        >
          ${this.step.data_schema.map((input) => this.renderInput(input))}
          <input type="submit" />
          <style>
            ${this.styles}
          </style>
        </form>
      `
  }

  renderInput(schema) {
    const inputType = schema.name.includes('password') ? 'password' : 'text'
    if (schema.type !== 'string') {
      return ''
    }
    return html`
      <input
        tabindex="-1"
        .id=${schema.name}
        .type=${inputType}
        .value=${this.stepData[schema.name] || ''}
        @input=${this._valueChanged}
      />
    `
  }

  _handleSubmit(ev) {
    ev.preventDefault()
    this.dispatchEvent(new CustomEvent('form-submitted', {bubbles: true, composed: true}))
  }

  _valueChanged(ev) {
    const {target} = ev
    this.stepData = {...this.stepData, [target.id]: target.value}
    this.dispatchEvent(new CustomEvent('value-changed', {bubbles: true, composed: true, detail: {value: this.stepData}}))
  }
}

window.customElements.define('grampsjs-password-manager-polyfill', GrampsjsPasswordManagerPolyfill)
