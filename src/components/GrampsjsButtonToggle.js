import {LitElement, css, html} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsButtonToggle extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-button {
          --mdc-typography-button-text-transform: none;
          --mdc-typography-button-font-weight: 400;
          --mdc-typography-button-letter-spacing: 0px;
          --mdc-typography-button-font-size: 13px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      icon: {type: String},
      checked: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.icon = ''
    this.checked = false
  }

  render() {
    return html`
      <mwc-button
        dense
        ?unelevated="${this.checked}"
        icon="${this.icon}"
        @click="${this.toggle}"
      >
        <slot></slot>
      </mwc-button>
    `
  }

  toggle() {
    this.checked = !this.checked
    fireEvent(this, 'grampsjs-button-toggle:toggle', {checked: this.checked})
  }
}

window.customElements.define('grampsjs-button-toggle', GrampsjsButtonToggle)
