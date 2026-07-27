import {css, html, LitElement} from 'lit'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent} from '../util.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'
import './GrampsjsImportPreviewDialog.js'

const STATE_ERROR = -1
const STATE_INITIAL = 0
const STATE_READY = 1
const STATE_PREVIEWING = 2
const STATE_PROGRESS = 3
const STATE_DONE = 4

export class GrampsjsImport extends GrampsjsAppStateMixin(LitElement) {
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
      _previewCounts: {type: Object},
    }
  }

  constructor() {
    super()
    this._state = 0
    this._uploadHint = ''
    this._previewCounts = {}
    // Non-reactive: whether the in-flight #progress-tree task is the
    // dry_run preview or the real import — both use the same Celery task
    // (import_file), so a single shared indicator/taskName is used for
    // both, and this flag decides which handler its completion routes to.
    this._previewPending = false
  }

  render() {
    return html`
      <h3>${this._('Import Family Tree')}</h3>

      <p>
        <grampsjs-form-upload
          outlined
          id="upload-tree"
          .appState="${this.appState}"
          filename
          @formdata:changed="${this._handleUploadChanged}"
        ></grampsjs-form-upload>
      </p>
      ${this._uploadHint ? html`${this._uploadHint}` : ''}
      <p>
        <md-filled-button
          type="submit"
          @click="${this._submit}"
          ?disabled=${this._state !== STATE_READY}
          >${this._('Import')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="progress-tree"
          taskName="importFile"
          ?open="${this._state !== STATE_INITIAL &&
          this._state !== STATE_READY}"
          class="button"
          size="20"
          hideAfter="0"
          .appState="${this.appState}"
          @task:complete="${this._handleTaskComplete}"
          @task:error="${this._handleTaskError}"
        ></grampsjs-task-progress-indicator>
      </p>
      <grampsjs-import-preview-dialog
        .appState="${this.appState}"
        .counts="${this._previewCounts}"
        @import-confirmed="${this._handleImportConfirmed}"
      ></grampsjs-import-preview-dialog>
    `
  }

  async _submit() {
    if (this._state === STATE_READY) {
      const uploadForm = this.shadowRoot.querySelector('#upload-tree')
      const ext = uploadForm.file.name.split('.').pop().toLowerCase()
      await this._submitPreview(ext, uploadForm.file)
    }
  }

  async _submitPreview(ext, file) {
    this._state = STATE_PREVIEWING
    this._previewPending = true
    const prog = this.renderRoot.querySelector('#progress-tree')
    prog.reset()
    prog.open = true

    const res = await this.appState.apiPost(
      `/api/importers/${ext}/file?dry_run=true`,
      file,
      {isJson: false, dbChanged: false}
    )
    if ('error' in res) {
      this._previewPending = false
      prog.setError()
      prog.errorMessage = this._(res.error)
      this._handleCompleted(STATE_ERROR)
      return
    }
    if ('task' in res) {
      const taskId = res.task?.id || ''
      if (taskId) {
        this.appState.registerTask(taskId, 'Preview Import', {
          taskName: 'importFile',
        })
      }
      prog.taskId = taskId
      return
    }
    prog.open = false
    this._state = STATE_READY
    // A plain 200 response is wrapped as {data, total_count, etag} by
    // apiPutPostDelete (only the 202/task shape returns the body as-is).
    this._showPreview(res.data)
  }

  _showPreview(counts) {
    this._previewPending = false
    this._state = STATE_READY
    this._previewCounts = counts || {}
    this.renderRoot.querySelector('grampsjs-import-preview-dialog').show()
  }

  async _handleImportConfirmed() {
    const uploadForm = this.shadowRoot.querySelector('#upload-tree')
    if (!uploadForm.file) return
    const ext = uploadForm.file.name.split('.').pop().toLowerCase()
    await this._submitTree(ext, uploadForm.file)
  }

  async _submitTree(ext, file) {
    this._state = STATE_PROGRESS
    this._previewPending = false
    const prog = this.renderRoot.querySelector('#progress-tree')
    prog.reset()
    prog.open = true

    const res = await this.appState.apiPost(
      `/api/importers/${ext}/file`,
      file,
      {isJson: false, dbChanged: false}
    )
    if ('error' in res) {
      prog.setError()
      prog.errorMessage = this._(res.error)
      this._handleCompleted(STATE_ERROR)
    } else if ('task' in res) {
      const taskId = res.task?.id || ''
      prog.taskId = taskId
      if (taskId) {
        this.appState.registerTask(taskId, 'Import', {taskName: 'importFile'})
      }
    } else {
      prog.setComplete()
      this._handleSuccess()
    }
  }

  // Both the preview (dry_run) and the real import run as the same Celery
  // task (import_file) and share the #progress-tree indicator/taskName, so
  // this dispatches its completion to whichever is actually in flight.
  _handleTaskComplete(e) {
    if (this._previewPending) {
      const counts = JSON.parse(e.detail?.status?.result || '{}')
      this._showPreview(counts)
    } else {
      this._handleSuccess()
    }
  }

  _handleTaskError() {
    this._previewPending = false
    this._handleCompleted(STATE_ERROR)
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
