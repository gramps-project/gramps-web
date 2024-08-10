import {html, css, LitElement} from 'lit'
import '@material/web/textfield/outlined-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

class GrampsjsChatPrompt extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-outlined-text-field {
          width: 100%;
          --md-outlined-text-field-container-shape: 26px;
          resize: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: String},
      maxRows: {type: Number},
      nRows: {type: Number},
      loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.maxRows = 5
    this.nRows = 1
    this.loading = false
  }

  render() {
    return html`
      <md-outlined-text-field
        type="textarea"
        rows="${this.nRows}"
        placeholder="${this._('Ask me anything')}"
        value="${this.value}"
        @input="${this._handleInput}"
        @keydown="${this._handleKey}"
      >
      </md-outlined-text-field>
    `
  }

  _handleKey(event) {
    if (event.code === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      this._submit()
      this._clear()
    } else if (event.code === 'Escape') {
      this._clear()
    }
  }

  _handleInput() {
    this.value = this.renderRoot.querySelector('md-outlined-text-field').value
    this._updateNRows()
  }

  _clear() {
    const input = this.renderRoot.querySelector('md-outlined-text-field')
    if (input !== null) {
      input.value = ''
      this.value = ''
    }
    this._updateNRows()
  }

  _submit() {
    fireEvent(this, 'chat:prompt', {message: this.value})
  }

  _updateNRows() {
    if (!this.value) {
      this.nRows = 1
    }
    this.nRows = Math.min(this.maxRows, this.value.split('\n').length)
  }

  focusInput() {
    this.renderRoot.querySelector('md-outlined-text-field').focus()
  }
}

window.customElements.define('grampsjs-chat-prompt', GrampsjsChatPrompt)
