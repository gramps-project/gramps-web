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
      files: {type: Array},
      imageUrl: {type: String},
      preview: {type: Boolean},
      filename: {type: Boolean},
      disabled: {type: Boolean},
      outlined: {type: Boolean},
      label: {type: String},
      accept: {type: String},
      multiple: {type: Boolean},
      _isVisible: {type: Boolean},
    }
  }

  get file() {
    return this.files[0]
  }

  constructor() {
    super()
    this.files = []
    this.imageUrl = ''
    this.preview = false
    this.filename = false
    this.disabled = false
    this.outlined = false
    this.label = ''
    this.accept = undefined
    this.multiple = false
    this._isVisible = false
  }

  render() {
    return html`
      <input
        id="input-upload"
        type="file"
        accept="${this.accept}"
        ?multiple="${this.multiple}"
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
        ${this.label ||
        (this.multiple ? this._('Select files') : this._('Select a file'))}
      </mwc-button>
      ${this.filename ? this.renderFileName() : ''}
      ${this.preview ? this.renderPreview() : ''}
    `
  }

  renderPreview() {
    if (!this.files[0]?.name) {
      return ''
    }
    return html`
      <div id="preview">
        ${this.files[0].type.startsWith('image')
          ? this.renderImage()
          : this.renderIcon()}
      </div>
    `
  }

  renderFileName() {
    return html`<span class="filename">${this.files[0]?.name || ''}</span>`
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
      this.files = Array.from(input.files)
      this._processPreview()
      this.handleChange()
    }
  }

  _processPreview() {
    if (this.files[0]?.type.startsWith('image')) {
      const reader = new FileReader()
      reader.onload = () => {
        this.imageUrl = reader.result
      }
      reader.readAsDataURL(this.files[0])
    }
  }

  async readAsJson() {
    const json = await parseJsonFile(this.file)
    return json
  }

  reset() {
    this.files = []
    this.imageUrl = ''
    const input = this.shadowRoot.getElementById('input-upload')
    input.value = ''
  }

  removeFile(index) {
    this.files = this.files.filter((_, i) => i !== index)
    if (this.files.length > 0) {
      this._processPreview()
    } else {
      this.imageUrl = ''
    }
    this.handleChange()
  }

  handleChange() {
    fireEvent(this, 'formdata:changed', {
      data: this.files[0] || {},
      files: this.files,
    })
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
    const pastedFiles = []
    for (const item of items) {
      if (item.kind === 'file') {
        pastedFiles.push(item.getAsFile())
      }
    }
    if (pastedFiles.length > 0) {
      this.files = [...this.files, ...pastedFiles]
      this._processPreview()
      this.handleChange()
    }
  }
}
window.customElements.define('grampsjs-form-upload', GrampsjsFormUpload)
