import {css, html, LitElement} from 'lit'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent, getTaskResult} from '../util.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'
import './GrampsjsImportPreviewDialog.js'
import './GrampsjsImportCounts.js'
import './GrampsjsImportExportReport.js'

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
      _previewMessages: {type: Array},
      _importResult: {type: Object},
    }
  }

  constructor() {
    super()
    this._state = 0
    this._uploadHint = ''
    this._previewCounts = {}
    this._previewMessages = []
    this._importResult = null
    // Task ids this component started, mapped to 'preview' or 'import'. The
    // preview (dry_run) and the real import are the same Celery task
    // (import_file), and #progress-tree also reconnects to import_file tasks
    // it did not start, e.g. after a reload. Only a task's id says which
    // operation it is.
    this._ownTasks = new Map()
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
      <p class="button-row">
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
          size="20"
          hideAfter="0"
          .appState="${this.appState}"
          @task:complete="${this._handleTaskComplete}"
          @task:error="${this._handleTaskError}"
        ></grampsjs-task-progress-indicator>
      </p>
      ${this._renderImportResult()}
      <grampsjs-import-preview-dialog
        .appState="${this.appState}"
        .counts="${this._previewCounts}"
        .messages="${this._previewMessages}"
        @import-confirmed="${this._handleImportConfirmed}"
      ></grampsjs-import-preview-dialog>
    `
  }

  _renderImportResult() {
    if (!this._importResult) {
      return ''
    }
    return html`
      <div class="card">
        <p>${this._('The import has completed.')}</p>
        <grampsjs-import-counts
          .appState="${this.appState}"
          .counts="${this._importResult}"
        ></grampsjs-import-counts>
        <grampsjs-import-export-report
          .appState="${this.appState}"
          .messages="${this._importResult.messages}"
          heading="${this._('Import messages')}"
        ></grampsjs-import-export-report>
      </div>
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
    this._importResult = null
    const prog = this.renderRoot.querySelector('#progress-tree')
    prog.reset()
    prog.open = true

    const res = await this.appState.apiPost(
      `/api/importers/${ext}/file?dry_run=true`,
      file,
      {isJson: false, dbChanged: false}
    )
    if ('error' in res) {
      prog.setError()
      prog.errorMessage = this._(res.error)
      this._handleCompleted(STATE_ERROR)
      return
    }
    if ('task' in res) {
      const taskId = res.task?.id || ''
      if (taskId) {
        this._ownTasks.set(taskId, 'preview')
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

  _showPreview(result) {
    this._state = STATE_READY
    this._previewCounts = result || {}
    this._previewMessages = result?.messages || []
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
      if (taskId) {
        this._ownTasks.set(taskId, 'import')
        this.appState.registerTask(taskId, 'Import', {taskName: 'importFile'})
      }
      prog.taskId = taskId
    } else {
      prog.setComplete()
      this._handleSuccess(res.data)
    }
  }

  _handleTaskComplete(e) {
    const {status} = e.detail
    const kind = this._ownTasks.get(status.id)
    this._ownTasks.delete(status.id)
    if (kind === 'preview') {
      this._showPreview(getTaskResult(status))
    } else if (kind === 'import') {
      this._handleSuccess(getTaskResult(status))
    } else {
      // A reconnected task could be a preview or an import, so the result
      // is not shown. Refreshing is harmless either way.
      fireEvent(this, 'db:changed', {})
    }
  }

  _handleTaskError(e) {
    const {status} = e.detail
    if (this._ownTasks.delete(status.id)) {
      this._handleCompleted(STATE_ERROR)
    }
  }

  _handleSuccess(result) {
    this._handleCompleted(STATE_DONE)
    this._importResult = result || {}
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
    this._importResult = null
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
