/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/web/switch/switch.js'

import {mdiLock, mdiLockOpen} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsFormPrivate extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      checked: {type: Boolean},
      disabled: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.checked = false
    this.disabled = false
  }

  render() {
    return html`
      <label>
        ${this._('Private')}
        <md-switch
          icons
          @change="${this.handleChange}"
          ?selected="${this.checked}"
          ?disabled="${this.disabled}"
        >
          <svg viewBox="0 0 24 24" slot="on-icon">
            <path d="${mdiLock}" />
          </svg>
          <svg viewBox="0 0 24 24" slot="off-icon">
            <path d="${mdiLockOpen}" />
          </svg>
        </md-switch>
      </label>
    `
  }

  reset() {
    this.checked = false
  }

  handleChange(e) {
    this.checked = e.target.selected
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {checked: this.checked},
      })
    )
  }
}

window.customElements.define('grampsjs-form-private', GrampsjsFormPrivate)
