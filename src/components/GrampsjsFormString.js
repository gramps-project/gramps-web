/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'


class GrampsjsFormString extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      mwc-textfield.fullwidth {
        width: 100%;
      }
      `
    ]
  }

  static get properties() {
    return {
      strings: {type: Object},
      value: {type: Object},
      label: {type: String},
      disabled: {type: Boolean},
      fullwidth: {type: Boolean},
      required: {type: Boolean}
    }
  }


  constructor() {
    super()
    this.strings = {}
    this.value = ''
    this.label = ''
    this.disabled = false
    this.fullwidth = false
    this.required = false
  }

  render() {
    return html`
    <mwc-textfield
      @input="${this.handleChange}"
      label="${this.label}"
      class="${this.fullwidth ? 'fullwidth' : ''}"
    ></mwc-textfield>
    `
  }

  reset() {
    this.shadowRoot.querySelector('mwc-textfield').value = ''
  }

  handleChange() {
    const el = this.shadowRoot.querySelector('mwc-textfield')
    if (el !== null) {
      fireEvent(this, 'formdata:changed', {data: el.value})
    }
  }

}

window.customElements.define('grampsjs-form-string', GrampsjsFormString)
