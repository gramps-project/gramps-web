/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/web/textfield/filled-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsFormString extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-filled-text-field.fullwidth {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: String},
      label: {type: String},
      disabled: {type: Boolean},
      fullwidth: {type: Boolean},
      required: {type: Boolean},
      type: {type: String},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.label = ''
    this.disabled = false
    this.fullwidth = false
    this.required = false
    this.type = 'text'
  }

  render() {
    return html`
      <md-filled-text-field
        @input="${this.handleChange}"
        label="${this.label}"
        value="${this.value}"
        type="${this.type}"
        ?disabled="${this.disabled}"
        ?required="${this.required}"
        class="${this.fullwidth ? 'fullwidth' : ''}"
      ></md-filled-text-field>
    `
  }

  reset() {
    this.shadowRoot.querySelector('md-filled-text-field').value = ''
  }

  handleChange() {
    const el = this.shadowRoot.querySelector('md-filled-text-field')
    if (el !== null) {
      fireEvent(this, 'formdata:changed', {data: el.value})
    }
  }

  isValid() {
    const el = this.shadowRoot.querySelector('md-filled-text-field')
    if (el !== null) {
      if (el?.validity?.valid) {
        return true
      }
      return false
    }
    return true
  }
}

window.customElements.define('grampsjs-form-string', GrampsjsFormString)
