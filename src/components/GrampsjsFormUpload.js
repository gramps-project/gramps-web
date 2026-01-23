/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

async function parseJsonFile(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.onload = event => {
      try {
        const parsedJson = JSON.parse(event.target.result)
        resolve(parsedJson)
      } catch (error) {
        reject(error)
      }
    }
    fileReader.onerror = error => reject(error)
    fileReader.readAsText(file)
  })
}

class GrampsjsFormUpload extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div#preview {
          margin-top: 25px;
        }

        img.img-preview {
          max-width: 300px;
          max-height: 300px;
        }

        .file-icon {
          color: var(--grampsjs-body-font-color-60);
          --mdc-icon-size: 100px;
        }

        span.filename {
          font-size: 0.8em;
          line-height: 36px;
          margin-left: 1em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      file: {type: Object},
      imageUrl: {type: String},
      preview: {type: Boolean},
      filename: {type: Boolean},
      disabled: {type: Boolean},
      outlined: {type: Boolean},
      label: {type: String},
      accept: {type: String},
      _isVisible: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.file = {}
    this.imageUrl = ''
    this.preview = false
    this.filename = false
    this.disabled = false
    this.outlined = false
    this.label = ''
    this.accept = undefined
    this._isVisible = false
  }

  render() {
    return html`
      <input
        id="input-upload"
        type="file"
        accept="${this.accept}"
        hidden
        @change="${this._handleInputChange}"
      />
      <mwc-button
        ?raised="${!this.outlined}"
        ?outlined="${this.outlined}"
        ?disabled="${this.disabled}"
        icon="upload"
        @click="${this._handleClickUpload}"
      >
        ${this.label || this._('Select a file')}
      </mwc-button>
      ${this.filename ? this.renderFileName() : ''}
      ${this.preview ? this.renderPreview() : ''}
    `
  }

  renderPreview() {
    if (!this.file.name) {
      return ''
    }
    return html`
      <div id="preview">
        ${this.file.type.startsWith('image')
          ? this.renderImage()
          : this.renderIcon()}
      </div>
    `
  }

  renderFileName() {
    return html`<span class="filename">${this.file.name}</span>`
  }

  renderImage() {
    if (!this.imageUrl) {
      return ''
    }
    return html` <img src="${this.imageUrl}" alt="" class="img-preview" /> `
  }

  // eslint-disable-next-line class-methods-use-this
  renderIcon() {
    return html` <mwc-icon class="file-icon">insert_drive_file</mwc-icon> `
  }

  _handleClickUpload() {
    const input = this.shadowRoot.getElementById('input-upload')
    input.click()
  }

  _handleInputChange() {
    const input = this.shadowRoot.getElementById('input-upload')
    if (input?.files?.length) {
      this.imageUrl = ''
      ;[this.file] = input.files
      this._processPreview()
      this.handleChange()
    }
  }

  _processPreview() {
    if (this.file.type.startsWith('image')) {
      const reader = new FileReader()
      reader.onload = () => {
        this.imageUrl = reader.result
      }
      reader.readAsDataURL(this.file)
    }
  }

  async readAsJson() {
    const json = await parseJsonFile(this.file)
    return json
  }

  reset() {
    this.file = {}
    this.imageUrl = ''
    const input = this.shadowRoot.getElementById('input-upload')
    input.value = ''
  }

  handleChange() {
    fireEvent(this, 'formdata:changed', {data: this.file})
  }

  firstUpdated() {
    // monitor if the form is visible
    // used for lazy loading of pasted images
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this._isVisible = true
        } else {
          this._isVisible = false
        }
      })
    })
    observer.observe(this)
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundHandlePaste = this._handlePaste.bind(this)
    window.addEventListener('paste', this._boundHandlePaste)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._boundHandlePaste) {
      window.removeEventListener('paste', this._boundHandlePaste)
    }
  }

  _handlePaste(event) {
    if (!this._isVisible) {
      return
    }
    const {items} = event.clipboardData
    if (!items) {
      return
    }
    // prevent other forms down on the same page from also handling the paste
    event.stopImmediatePropagation()
    for (const item of items) {
      if (item.kind === 'file') {
        this.file = item.getAsFile()
        this._processPreview()
        this.handleChange()
      }
    }
  }
}
window.customElements.define('grampsjs-form-upload', GrampsjsFormUpload)
