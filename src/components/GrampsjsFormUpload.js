/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'


class GrampsjsFormUpload extends GrampsjsTranslateMixin(LitElement) {
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
        color: rgba(0, 0, 0, 0.6);
        --mdc-icon-size: 100px;
      }

      span.filename {
        font-size: 0.8em;
        line-height: 36px;
        margin-left: 1em;
      }
      `
    ]
  }

  static get properties() {
    return {
      file: {type: Object},
      imageUrl: {type: String},
      preview: {type: Boolean},
      filename: {type: Boolean},
      disabled: {type: Boolean}
    }
  }


  constructor() {
    super()
    this.file = {}
    this.imageUrl = ''
    this.preview = false
    this.filename = false
    this.disabled = false
  }

  render() {
    return html`
    <input
      id="input-upload"
      type="file"
      hidden
      @change="${this._handleInputChange}"
    >
    <mwc-button
      raised
      ?disabled="${this.disabled}"
      icon="upload"
      @click="${this._handleClickUpload}"
    >
      ${this._('Select a file')}
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
    ${this.file.type.startsWith('image') ? this.renderImage() : this.renderIcon()}
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
    return html`
    <img src="${this.imageUrl}" alt="" class="img-preview"/>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderIcon() {
    return html`
    <mwc-icon class="file-icon">insert_drive_file</mwc-icon>
    `
  }

  _handleClickUpload() {
    const input = this.shadowRoot.getElementById('input-upload')
    input.click()
  }

  _handleInputChange() {
    const input = this.shadowRoot.getElementById('input-upload')
    if (input?.files?.length) {
      this.imageUrl = '';
      [this.file] = input.files
      const reader = new FileReader()
      reader.onload = () => {
        this.imageUrl = reader.result
      }
      reader.readAsDataURL(this.file)
      this.handleChange()
    }
  }

  reset() {
    this.file = {}
    this.imageUrl = ''
  }

  handleChange() {
    fireEvent(this, 'formdata:changed', {data: this.file})
  }
}

window.customElements.define('grampsjs-form-upload', GrampsjsFormUpload)
