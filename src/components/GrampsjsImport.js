import {css, html, LitElement} from 'lit'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent} from '../util.js'
import {awaitTaskResponse, showUploadProgress} from '../taskResponse.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'
import './GrampsjsImportPreviewDialog.js'
import './GrampsjsImportCounts.js'
import './GrampsjsImportExportReport.js'
import './GrampsjsHelpButton.js'
import './GrampsjsDocButton.js'
import './GrampsjsHomePerson.js'

const fileExtension = file => file.name.split('.').pop().toLowerCase()

export class GrampsjsImport extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hidden {
          display: none;
        }

        /* error messages from the backend can span several lines */
        .alert.error.multiline {
          white-space: pre-line;
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
      _importError: {type: String},
      _askHomePerson: {type: Boolean},
    }
  }

  constructor() {
    super()
    // The selected file, if it can be imported.
    this._file = null
    this._busy = false
    this._uploadHint = ''
    this._importResult = null
    this._importError = ''
    // Whether no home person was set when the import finished
    this._askHomePerson = false
    // Token of the running preview and import. Selecting another file
    // replaces it, so a run whose task never reports back blocks nothing;
    // the replaced run stops at its next step.
    this._op = null
  }

  render() {
    return html`
      <h3>
        ${this._('Import Family Tree')}
        <grampsjs-help-button
          path="administration/import/"
          .appState="${this.appState}"
        ></grampsjs-help-button>
      </h3>

      <p>
        ${this._(
          'Supported formats: %s',
          'Gramps XML (.gramps), GEDCOM (.ged), GeneWeb (.gw), Pro-Gen (.def), vCard (.vcf), CSV (.csv)'
        )}
      </p>

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
      ${this._importError
        ? html`<p class="alert error multiline">${this._importError}</p>`
        : ''}
      ${this._renderImportResult()}
      <grampsjs-import-preview-dialog
        .appState="${this.appState}"
      ></grampsjs-import-preview-dialog>
    `
  }

  _renderZipHint() {
    return html`<div class="alert error">
      ${this._('ZIP archives cannot be imported.')}
      ${this._(
        'If it contains a GEDCOM (.ged) file, unzip it and upload that file.'
      )}
      <grampsjs-doc-button
        path="administration/import/"
        label="${this._('How to fix this')}"
        .appState="${this.appState}"
      ></grampsjs-doc-button>
    </div>`
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
        ${this._renderNextSteps()}
        <grampsjs-import-export-report
          .appState="${this.appState}"
          .messages="${this._importResult.messages}"
          heading="${this._('Problems found during the import')}"
          collapsed
        ></grampsjs-import-export-report>
      </div>
    `
  }

  // Without a home person, the family tree chart has no one to start from,
  // so after importing people the user is asked to choose one.
  _renderNextSteps() {
    if (!this._importResult?.people || !this._askHomePerson) {
      return ''
    }
    return html`<grampsjs-home-person
      .appState="${this.appState}"
      .homePersonGrampsId="${this.appState.settings?.homePerson ?? ''}"
    ></grampsjs-home-person>`
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
    this._importError = ''

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
    this._askHomePerson = !this.appState.settings?.homePerson
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
      {
        isJson: false,
        dbChanged: false,
        // the page shows the import's progress and outcome itself
        saving: false,
        onUploadProgress: fraction => {
          if (this._op === op) {
            showUploadProgress(this.appState, prog, fraction)
          }
        },
      }
    )
    if (this._op !== op) {
      return null
    }
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: dryRun ? 'Preview Import' : 'Import',
      taskName: 'importFile',
    })
    // a replaced run still reports its outcome, but not its error
    if (outcome.error !== undefined && this._op === op) {
      const error = outcome.error || this._('Import failed')
      prog.errorMessage = error
      this._importError = error
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
    this._importError = ''
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
    // a GEDZip file (.gdz) is a ZIP archive, too
    if (ext === 'zip' || ext === 'gdz') {
      this._uploadHint = this._renderZipHint()
      return
    }
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
    this._uploadHint = ''
    this._file = uploadForm.file
  }
}

window.customElements.define('grampsjs-import', GrampsjsImport)
