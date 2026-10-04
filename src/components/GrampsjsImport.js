import {css, html, LitElement} from 'lit'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent} from '../util.js'
import {awaitTaskResponse} from '../taskResponse.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'
import './GrampsjsImportPreviewDialog.js'
import './GrampsjsImportCounts.js'
import './GrampsjsImportExportReport.js'

const fileExtension = file => file.name.split('.').pop().toLowerCase()

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
      _file: {type: Object},
      _busy: {type: Boolean},
      _uploadHint: {type: String},
      _importResult: {type: Object},
    }
  }

  constructor() {
    super()
    // The selected file, if it can be imported.
    this._file = null
    this._busy = false
    this._uploadHint = ''
    this._importResult = null
    // Token of the running preview and import. Selecting another file
    // replaces it, so a run whose task never reports back blocks nothing;
    // the replaced run stops at its next step.
    this._op = null
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
          ?disabled=${!this._file || this._busy}
          >${this._('Import')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="progress-tree"
          taskName="importFile"
          size="20"
          hideAfter="0"
          .appState="${this.appState}"
          @task:complete="${this._handleOtherTaskComplete}"
        ></grampsjs-task-progress-indicator>
      </p>
      ${this._renderImportResult()}
      <grampsjs-import-preview-dialog
        .appState="${this.appState}"
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

  // Previews the selected file, asks for confirmation and imports it.
  async _submit() {
    const file = this._file
    if (!file || this._busy) {
      return
    }
    const op = {}
    this._op = op
    this._busy = true
    this._importResult = null

    const preview = await this._post(op, file, true)
    if (this._op !== op) {
      return
    }
    if (preview.error !== undefined) {
      this._finish()
      return
    }
    this.renderRoot.querySelector('#progress-tree').open = false
    const confirmed = await this.renderRoot
      .querySelector('grampsjs-import-preview-dialog')
      .confirm(preview.data)
    if (this._op !== op) {
      return
    }
    if (!confirmed) {
      this._op = null
      this._busy = false
      return
    }

    const imported = await this._post(op, file, false)
    if (imported?.data) {
      fireEvent(this, 'db:changed', {})
    }
    if (this._op !== op) {
      return
    }
    this._importResult = imported.data ?? null
    this._finish()
  }

  // Posts the file to the importer and resolves with its outcome ({data} or
  // {error}). If the run was replaced before the response arrived, resolves
  // with null and leaves the indicator to the new run.
  async _post(op, file, dryRun) {
    const prog = this.renderRoot.querySelector('#progress-tree')
    prog.reset()
    prog.open = true
    const query = dryRun ? '?dry_run=true' : ''
    const res = await this.appState.apiPost(
      `/api/importers/${fileExtension(file)}/file${query}`,
      file,
      {isJson: false, dbChanged: false}
    )
    if (this._op !== op) {
      return null
    }
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: dryRun ? 'Preview Import' : 'Import',
      taskName: 'importFile',
    })
    if (outcome.error !== undefined) {
      prog.errorMessage = this._(outcome.error)
    }
    return outcome
  }

  _finish() {
    this._op = null
    this._busy = false
    this._file = null
    this._uploadHint = ''
    this.renderRoot.querySelector('#upload-tree').reset()
  }

  // The indicator also shows import tasks this component did not start, e.g.
  // after a reload. Whether such a task was a preview is unknown, so its
  // result is not shown; refreshing is harmless either way. Completions of a
  // running preview or import are handled by _submit.
  _handleOtherTaskComplete() {
    if (!this._busy) {
      fireEvent(this, 'db:changed', {})
    }
  }

  _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('#upload-tree')
    this._op = null
    this._busy = false
    this._file = null
    this._importResult = null
    const prog = this.renderRoot.querySelector('#progress-tree')
    prog.reset()
    prog.open = false
    if (!uploadForm.file?.name) {
      this._uploadHint = ''
      return
    }

    const ext = fileExtension(uploadForm.file)
    if (!['gpkg', 'gramps', 'gw', 'def', 'vcf', 'csv', 'ged'].includes(ext)) {
      this._uploadHint = html`<p class="alert error">
        ${this._('Unsupported format')}
      </p>`
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
    this._file = uploadForm.file
  }
}

window.customElements.define('grampsjs-import', GrampsjsImport)
