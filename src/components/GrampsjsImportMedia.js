import {css, html, LitElement} from 'lit'
import '@material/mwc-button'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {apiPost} from '../api.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'

const STATE_ERROR = -1
const STATE_INITIAL = 0
const STATE_READY = 1
const STATE_PROGRESS = 2
const STATE_DONE = 3

export class GrampsjsImportMedia extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hidden {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _mediaState: {type: Object},
      _uploadHint: {type: String},
    }
  }

  constructor() {
    super()
    this._mediaState = STATE_INITIAL
    this._uploadHint = ''
  }

  render() {
    return html`
      <h3>${this._('Import Media Files')}</h3>
      <p>
        ${this._('Upload a ZIP archive with files for existing media objects.')}
      </p>

      <p>
        <grampsjs-form-upload
          outlined
          accept="application/zip"
          id="upload-media"
          .strings="${this.strings}"
          filename
          @formdata:changed="${this._handleUploadChangedMedia}"
        ></grampsjs-form-upload>
      </p>
      <p>
        <mwc-button
          raised
          label="${this._('Import')}"
          type="submit"
          @click="${this._submitMedia}"
          ?disabled=${this._mediaState !== STATE_READY}
        ></mwc-button>
        <grampsjs-task-progress-indicator
          id="progress-media"
          ?open="${this._mediaState !== STATE_INITIAL &&
          this._mediaState !== STATE_READY}"
          class="button"
          size="20"
          hideAfter="0"
          pollInterval="0.2"
          @task:complete="${this._handleSuccessMedia}"
          @task:error="${() => this._handleCompletedMedia(STATE_ERROR)}"
        ></grampsjs-task-progress-indicator>
      </p>
    `
  }

  async _submitMedia() {
    if (this._mediaState === STATE_READY) {
      const uploadForm = this.shadowRoot.querySelector('#upload-media')
      await this._submitMediaArchive(uploadForm.file)
    }
  }

  async _submitMediaArchive(file) {
    this._mediaState = STATE_PROGRESS
    const prog = this.renderRoot.querySelector('#progress-media')
    prog.reset()
    prog.open = true

    const res = await apiPost(
      '/api/media/archive/upload/zip',
      file,
      false,
      false
    )
    if ('error' in res) {
      prog.setError()
      prog.errorMessage = this._(res.error)
      this._handleCompletedMedia(STATE_ERROR)
    } else if ('task' in res) {
      prog.taskId = res.task?.id || ''
    } else {
      prog.setComplete()
      this._handleSuccessMedia()
    }
  }

  _handleSuccessMedia() {
    this._handleCompletedMedia(STATE_DONE)
    fireEvent(this, 'media:uploaded')
  }

  _handleCompletedMedia(state) {
    this._mediaState = state
    const uploadForm = this.shadowRoot.querySelector('#upload-media')
    uploadForm.reset()
  }

  _handleUploadChangedMedia() {
    const uploadForm = this.shadowRoot.querySelector('#upload-media')
    if (!uploadForm.file?.name) {
      this._mediaState = STATE_INITIAL
      return
    }
    this._mediaState = STATE_READY
  }
}

window.customElements.define('grampsjs-import-media', GrampsjsImportMedia)
