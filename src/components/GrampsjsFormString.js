/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsFormString extends GrampsjsTranslateMixin(LitElement) {
  static get styles () {
    return [
      sharedStyles,
      css`
      mwc-textfield.fullwidth {
        width: 100%;
      }
      `
    ]
  }

  static get properties () {
    return {
      value: {type: String},
      label: {type: String},
      disabled: {type: Boolean},
      fullwidth: {type: Boolean},
      required: {type: Boolean},
      type: {type: String}
    }
  }

  constructor () {
    super()
    this.value = ''
    this.label = ''
    this.disabled = false
    this.fullwidth = false
    this.required = false
    this.type = 'text'
  }

  render () {
    return html`
    <mwc-textfield
      @input="${this.handleChange}"
      label="${this.label}"
      value="${this.value}"
      type="${this.type}"
      ?disabled="${this.disabled}"
      ?required="${this.required}"
      class="${this.fullwidth ? 'fullwidth' : ''}"
    ></mwc-textfield>
    `
  }

  reset () {
    this.shadowRoot.querySelector('mwc-textfield').value = ''
  }

  handleChange () {
    const el = this.shadowRoot.querySelector('mwc-textfield')
    if (el !== null) {
      fireEvent(this, 'formdata:changed', {data: el.value})
    }
  }

  isValid () {
    const el = this.shadowRoot.querySelector('mwc-textfield')
    if (el !== null) {
      if (el?.validity?.valid) {
        return true
      } else {
        return false
      }
    }
    return true
  }
}

window.customElements.define('grampsjs-form-string', GrampsjsFormString)
