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

export class GrampsjsImport extends GrampsjsTranslateMixin(LitElement) {
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
      _state: {type: Object},
      _mediaState: {type: Object},
      _uploadHint: {type: String},
    }
  }

  constructor() {
    super()
    this._state = 0
    this._uploadHint = ''
  }

  render() {
    return html`
      <h3>${this._('Import Family Tree')}</h3>

      <p>
        <grampsjs-form-upload
          outlined
          id="upload-tree"
          .strings="${this.strings}"
          filename
          @formdata:changed="${this._handleUploadChanged}"
        ></grampsjs-form-upload>
      </p>
      ${this._uploadHint ? html`${this._uploadHint}` : ''}
      <p>
        <mwc-button
          raised
          label="${this._('Import')}"
          type="submit"
          @click="${this._submit}"
          ?disabled=${this._state !== STATE_READY}
        ></mwc-button>
        <grampsjs-task-progress-indicator
          id="progress-tree"
          taskName="importFile"
          ?open="${this._state !== STATE_INITIAL &&
          this._state !== STATE_READY}"
          class="button"
          size="20"
          hideAfter="0"
          pollInterval="0.2"
          @task:complete="${this._handleSuccess}"
          @task:error="${() => this._handleCompleted(STATE_ERROR)}"
        ></grampsjs-task-progress-indicator>
      </p>
    `
  }

  async _submit() {
    if (this._state === STATE_READY) {
      const uploadForm = this.shadowRoot.querySelector('#upload-tree')
      const ext = uploadForm.file.name.split('.').pop().toLowerCase()
      await this._submitTree(ext, uploadForm.file)
    }
  }

  async _submitTree(ext, file) {
    this._state = STATE_PROGRESS
    const prog = this.renderRoot.querySelector('#progress-tree')
    prog.reset()
    prog.open = true

    const res = await apiPost(`/api/importers/${ext}/file`, file, false, false)
    if ('error' in res) {
      prog.setError()
      prog.errorMessage = this._(res.error)
      this._handleCompleted(STATE_ERROR)
    } else if ('task' in res) {
      prog.taskId = res.task?.id || ''
    } else {
      prog.setComplete()
      this._handleSuccess()
    }
  }

  _handleSuccess() {
    this._handleCompleted(STATE_DONE)
    fireEvent(this, 'db:changed', {})
  }

  _handleCompleted(state) {
    this._state = state
    const uploadForm = this.shadowRoot.querySelector('#upload-tree')
    uploadForm.reset()
    this._uploadHint = ''
  }

  _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('#upload-tree')
    if (!uploadForm.file?.name) {
      this._uploadHint = ''
      this._state = STATE_INITIAL
      return
    }

    const ext = uploadForm.file.name.split('.').pop().toLowerCase()
    if (!['gpkg', 'gramps', 'gw', 'def', 'vcf', 'csv', 'ged'].includes(ext)) {
      this._uploadHint = html`<p class="alert error">
        ${this._('Unsupported format')}
      </p>`
      this._state = STATE_INITIAL
      return
    }
    if (ext === 'gpkg') {
      this._uploadHint = html`<p class="alert error">
        ${this._(
          'The Gramps package format (.gpkg) is currently not supported.'
        )}
        ${this._(
          'Please upload a file in Gramps XML (.gramps) format without media files.'
        )}
      </p>`
      this._state = STATE_INITIAL
      return
    }
    if (ext !== 'gramps') {
      this._uploadHint = html`<p class="alert warn">
        ${this._(
          'If you intend to synchronize an existing Gramps database with Gramps Web, use the Gramps XML (.gramps) format instead.'
        )}
      </p>`
    } else {
      this._uploadHint = ''
    }
    this._state = STATE_READY
  }
}

window.customElements.define('grampsjs-import', GrampsjsImport)
