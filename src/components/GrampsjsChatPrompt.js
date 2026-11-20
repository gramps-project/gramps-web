import {html, css, LitElement} from 'lit'
import '@material/web/textfield/outlined-text-field'
import '@material/web/iconbutton/filled-icon-button'
import '@material/web/iconbutton/icon-button'
import '@material/web/icon/icon.js'

import {mdiClose, mdiImagePlusOutline, mdiSend} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'
import {MAX_CHAT_IMAGES, readChatImage} from '../chatImages.js'

class GrampsjsChatPrompt extends GrampsjsAppStateMixin(LitElement) {
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
          --md-outlined-text-field-input-text-placeholder-color: var(
            --grampsjs-color-shade-120
          );
          resize: none;
        }

        md-filled-icon-button.send {
          --md-filled-icon-button-container-color: var(--md-sys-color-primary);
          position: relative;
          margin-left: 16px;
          margin-top: 9px;
          margin-bottom: 9px;
          margin-right: 0;
          --md-filled-icon-button-icon-size: 22px;
          --md-filled-icon-button-state-layer-height: 66px;
          --md-filled-icon-button-state-layer-width: 66px;
        }

        md-icon-button.attach {
          margin: 0 8px 8px 0;
        }

        .images {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 0 0 16px 48px;
        }

        .image {
          position: relative;
          width: 64px;
          height: 64px;
        }

        .image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        .image button {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background-color: var(--grampsjs-color-shade-230);
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
      // whether images can be attached
      vision: {type: Boolean},
      images: {type: Array},
      _reading: {type: Number},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.maxRows = 5
    this.nRows = 1
    this.loading = false
    this.vision = false
    // {data, thumbnail} for each attached image
    this.images = []
    // number of files being read
    this._reading = 0
  }

  render() {
    return html`
      <div @dragover="${this._handleDragOver}" @drop="${this._handleDrop}">
        ${this.vision && this.images.length > 0
          ? html`<div class="images">
              ${this.images.map(
                (image, index) => html`<div class="image">
                  <img src="${image.thumbnail}" alt="${this._('Image')}" />
                  <button
                    aria-label="${this._('Remove')}"
                    title="${this._('Remove')}"
                    @click="${() => this._removeImage(index)}"
                  >
                    <grampsjs-icon
                      path="${mdiClose}"
                      height="16"
                      width="16"
                      color="var(--grampsjs-body-font-color)"
                    ></grampsjs-icon>
                  </button>
                </div>`
              )}
            </div>`
          : ''}
        <div class="container">
          ${this.vision
            ? html`<md-icon-button
                  class="attach"
                  aria-label="${this._('Attach images')}"
                  title="${this._('Attach images')}"
                  ?disabled="${this._slotsLeft <= 0}"
                  @click="${this._handleAttachClick}"
                >
                  <grampsjs-icon
                    path="${mdiImagePlusOutline}"
                    color="currentColor"
                  ></grampsjs-icon>
                </md-icon-button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  @change="${this._handleFileChange}"
                />`
            : ''}
          <md-outlined-text-field
            type="textarea"
            rows="${this.nRows}"
            placeholder="${this._('Ask something about your ancestors')}"
            value="${this.value}"
            @input="${this._handleInput}"
            @keydown="${this._handleKey}"
            @paste="${this._handlePaste}"
          >
          </md-outlined-text-field>
          <md-filled-icon-button
            @click="${this._handleBtnClick}"
            class="send"
            ?disabled="${this.loading || this._reading > 0}"
          >
            <md-icon
              >${renderIconSvg(
                mdiSend,
                'var(--grampsjs-color-shade-255)'
              )}</md-icon
            >
          </md-filled-icon-button>
        </div>
      </div>
    `
  }

  get _slotsLeft() {
    return MAX_CHAT_IMAGES - this.images.length - this._reading
  }

  _handleAttachClick() {
    this.renderRoot.querySelector('input[type="file"]')?.click()
  }

  _handleFileChange(event) {
    const input = event.target
    this._addFiles([...input.files])
    // allows selecting the same file again
    input.value = ''
  }

  // Images pasted together with text, e.g. from a word processor, are
  // pictures of that text, so only a paste without text attaches them
  _handlePaste(event) {
    if (!this.vision) return
    const data = event.clipboardData
    if (!data || data.types.includes('text/plain')) return
    const files = [...data.files].filter(file => file.type.startsWith('image/'))
    if (files.length === 0) return
    event.preventDefault()
    this._addFiles(files)
  }

  _handleDragOver(event) {
    if (!this.vision || !event.dataTransfer?.types.includes('Files')) return
    // allows dropping, which would otherwise open the file in the browser
    event.preventDefault()
  }

  _handleDrop(event) {
    if (!this.vision || !event.dataTransfer?.files.length) return
    event.preventDefault()
    this._addFiles([...event.dataTransfer.files])
  }

  // Reads image files and attaches them, ignoring other files and those
  // beyond the maximum number of images
  async _addFiles(files) {
    const images = files
      .filter(file => file.type.startsWith('image/'))
      .slice(0, Math.max(0, this._slotsLeft))
    if (images.length === 0) return
    this._reading += images.length
    const results = await Promise.all(
      images.map(file =>
        readChatImage(file).catch(() => {
          fireEvent(this, 'grampsjs:error', {
            message: this._('Could not open file: %s', file.name),
          })
          return null
        })
      )
    )
    this._reading -= images.length
    this.images = [...this.images, ...results.filter(Boolean)]
  }

  _removeImage(index) {
    this.images = this.images.filter((_, i) => i !== index)
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
      this._clearText()
    }
  }

  _handleInput() {
    this.value = this.renderRoot.querySelector('md-outlined-text-field').value
    this._updateNRows()
  }

  _clearText() {
    const input = this.renderRoot.querySelector('md-outlined-text-field')
    if (input !== null) {
      input.value = ''
      this.value = ''
    }
    this._updateNRows()
  }

  _submit() {
    if (this.value.trim() && !this.loading && this._reading === 0) {
      fireEvent(this, 'chat:prompt', {
        message: this.value.trim(),
        images: this.vision ? this.images : [],
      })
      this._clearText()
      this.images = []
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
    if (textField !== null) {
      textField.focus()
    }
  }
}

window.customElements.define('grampsjs-chat-prompt', GrampsjsChatPrompt)
