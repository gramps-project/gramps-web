import {css, html, LitElement} from 'lit'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent} from '../util.js'
import {awaitTaskResponse, showUploadProgress} from '../taskResponse.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'
import './GrampsjsHelpButton.js'

export class GrampsjsImportMedia extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .not-found {
          max-height: 20em;
          overflow: auto;
          margin: 0.5em 0 0 0;
          padding: 0;
          list-style: none;
          line-height: 1.6em;
        }

        .path {
          color: var(--grampsjs-body-font-color-60);
          overflow-wrap: anywhere;
        }

        summary {
          cursor: pointer;
          user-select: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _file: {type: Object},
      _busy: {type: Boolean},
      _result: {type: Object},
      _error: {type: String},
    }
  }

  constructor() {
    super()
    // The selected ZIP archive
    this._file = null
    this._busy = false
    // The outcome of the last upload: counts of media objects, see
    // _renderResult
    this._result = null
    this._error = ''
  }

  // Whether the tree has no media objects for the files in an archive to be
  // matched to. Unknown counts don't block the upload.
  get _noMediaObjects() {
    const counts = this.appState?.dbInfo?.object_counts
    return Boolean(counts) && !counts.media
  }

  render() {
    const noMediaObjects = this._noMediaObjects
    return html`
      <h3>
        ${this._('Import Media Files')}
        <grampsjs-help-button
          path="administration/import-media/"
          .appState="${this.appState}"
        ></grampsjs-help-button>
      </h3>
      <p>
        ${this._('Upload a ZIP archive with files for existing media objects.')}
      </p>
      ${noMediaObjects
        ? html`<p>
            ${this._(
              'Import a family tree file first. The files in the ZIP archive are matched to its media objects.'
            )}
          </p>`
        : ''}

      <p>
        <grampsjs-form-upload
          outlined
          ?disabled=${noMediaObjects || this._busy}
          accept="application/zip"
          id="upload-media"
          .appState="${this.appState}"
          filename
          @formdata:changed="${this._handleUploadChanged}"
        ></grampsjs-form-upload>
      </p>
      <p class="button-row">
        <md-filled-button
          type="submit"
          @click="${this._submit}"
          ?disabled=${noMediaObjects || !this._file || this._busy}
          >${this._('Import')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="progress-media"
          taskName="importMedia"
          size="20"
          hideAfter="0"
          pollInterval="0.2"
          .appState="${this.appState}"
          @task:complete="${this._handleOtherTaskComplete}"
        ></grampsjs-task-progress-indicator>
      </p>
      ${this._error ? html`<p class="alert error">${this._error}</p>` : ''}
      ${this._renderResult()}
    `
  }

  // Backends that send `not_found`, the media objects the archive had no file
  // for, count media objects: `missing` had no file before the upload,
  // `uploaded` have one now and `failures` could not be stored. Older ones
  // count distinct files, which can't be put in relation to media objects.
  _renderResult() {
    if (!this._result) {
      return ''
    }
    const {missing = 0, failures = 0} = this._result
    return html`
      <div class="card">
        ${'not_found' in this._result && missing
          ? this._renderMatches()
          : html`<p>${this._('The import has completed.')}</p>`}
        ${failures
          ? html`<p class="alert error">
              ${this._('%s files could not be stored.', failures)}
            </p>`
          : ''}
      </div>
    `
  }

  _renderMatches() {
    const {missing, uploaded = 0, failures = 0} = this._result
    const notFound = this._result.not_found
    const nNotFound = missing - uploaded - failures
    return html`
      <p>
        ${this._(
          'Files were found for %s of %s media objects without a file.',
          uploaded,
          missing
        )}
      </p>
      ${nNotFound > 0
        ? html`<details>
            <summary>
              ${this._(
                'The archive has no file for %s media objects.',
                nNotFound
              )}
            </summary>
            <ul class="not-found">
              ${notFound.map(
                obj => html`<li>
                  <a href="/media/${obj.gramps_id}">${obj.gramps_id}</a>
                  <span class="path">${obj.path}</span>
                </li>`
              )}
            </ul>
          </details>`
        : ''}
    `
  }

  async _submit() {
    const file = this._file
    if (!file || this._busy) {
      return
    }
    this._busy = true
    this._result = null
    this._error = ''
    const prog = this.renderRoot.querySelector('#progress-media')
    prog.reset()
    prog.open = true
    const res = await this.appState.apiPost(
      '/api/media/archive/upload/zip',
      file,
      {
        isJson: false,
        dbChanged: false,
        // the page shows the import's progress and outcome itself
        saving: false,
        onUploadProgress: fraction =>
          showUploadProgress(this.appState, prog, fraction),
      }
    )
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: 'Import Media Files',
      taskName: 'importMedia',
    })
    if (outcome.error !== undefined) {
      this._error = outcome.error || this._('Import failed')
      prog.errorMessage = this._error
    } else {
      this._result = outcome.data ?? null
      fireEvent(this, 'media:uploaded')
    }
    this._busy = false
    this._file = null
    this.renderRoot.querySelector('#upload-media').reset()
  }

  // The indicator also shows media imports this component did not start,
  // e.g. after a reload. Their files are stored once they complete.
  _handleOtherTaskComplete() {
    if (!this._busy) {
      fireEvent(this, 'media:uploaded')
    }
  }

  _handleUploadChanged() {
    const uploadForm = this.renderRoot.querySelector('#upload-media')
    this._error = ''
    this._result = null
    this._file = uploadForm.file?.name ? uploadForm.file : null
  }
}

window.customElements.define('grampsjs-import-media', GrampsjsImportMedia)
