import {html, css, LitElement} from 'lit'
import '@material/web/textfield/outlined-text-field'
import '@material/web/iconbutton/filled-icon-button'
import '@material/web/icon/icon.js'

import {mdiSend} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'

class GrampsjsChatPrompt extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          display: flex;
          align-items: end;
          justify-content: center;
        }

        md-outlined-text-field {
          flex: 1;
          --md-outlined-text-field-container-shape: 28px;
          --md-outlined-text-field-input-text-placeholder-color: #777;
          resize: none;
        }

        md-filled-icon-button.send {
          --md-filled-icon-button-container-color: rgba(109, 76, 65, 0.8);
          position: relative;
          margin-left: 16px;
          margin-top: 9px;
          margin-bottom: 9px;
          margin-right: 0;
          --md-filled-icon-button-icon-size: 22px;
          --md-filled-icon-button-state-layer-height: 66px;
          --md-filled-icon-button-state-layer-width: 66px;
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
      <div class="container">
        <md-outlined-text-field
          type="textarea"
          ?disabled="${this.loading}"
          rows="${this.nRows}"
          placeholder="${this._('Ask something about your ancestors')}"
          value="${this.value}"
          @input="${this._handleInput}"
          @keydown="${this._handleKey}"
        >
        </md-outlined-text-field>
        <md-filled-icon-button
          @click="${this._handleBtnClick}"
          class="send"
          ?disabled="${this.loading}"
        >
          <md-icon>${renderIconSvg(mdiSend, '#ffffff')}</md-icon>
        </md-filled-icon-button>
      </div>
    `
  }

  _handleBtnClick() {
    this._submit()
  }

  _handleKey(event) {
    if (event.code === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      this._submit()
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
    if (this.value.trim()) {
      fireEvent(this, 'chat:prompt', {message: this.value.trim()})
      this._clear()
    }
  }

  _updateNRows() {
    if (!this.value) {
      this.nRows = 1
    }
    this.nRows = Math.min(this.maxRows, this.value.split('\n').length)
  }

  focusInput() {
    const textField = this.renderRoot.querySelector('md-outlined-text-field')
    textField.focus()
  }
}

window.customElements.define('grampsjs-chat-prompt', GrampsjsChatPrompt)
