import {css, html, LitElement} from 'lit'
import '@material/web/button/outlined-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/text-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button.js'
import {
  mdiAlertOutline,
  mdiBackupRestore,
  mdiDatabaseExport,
  mdiDelete,
  mdiDownload,
} from '@mdi/js'

import {sharedStyles, buttonColorStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'
import './GrampsjsFormUpload.js'
import './GrampsjsTaskProgressIndicator.js'
import './GrampsjsBackupRestoreDialog.js'
import './GrampsjsRestoreBackupConfirmDialog.js'
import './GrampsjsRelogin.js'
import './GrampsjsTimedelta.js'
import './GrampsjsTable.js'
import './GrampsjsTooltip.js'
import {getExporterDownloadUrl} from '../api.js'
import {fireEvent, formatBytes, formatRateLimit} from '../util.js'
import {awaitTaskResponse} from '../taskResponse.js'
import {
  backupFileType,
  backupRestoreUrl,
  backupTimestamp,
  formatBackupCount,
  formatBackupDate,
  xmlRestoreUrl,
} from '../backups.js'

/**
 * Stored backups of the tree: creating, downloading and deleting them, and
 * restoring the tree from a stored backup or an uploaded file, either a
 * backup archive or Gramps XML. Backends without backup support only restore
 * from Gramps XML.
 */
export class GrampsjsBackups extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      buttonColorStyles,
      css`
        h3 {
          font-size: 1.1em;
          font-weight: 500;
          margin: 2em 0 0.5em;
        }

        .small {
          font-size: 14px;
          color: var(--grampsjs-body-font-color-60);
        }

        .restore-result > :first-child {
          margin-top: 0;
        }

        .restore-result > :last-child {
          margin-bottom: 0;
        }

        .danger-button {
          --grampsjs-button-color: var(--grampsjs-alert-error-font-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      username: {type: String},
      _backups: {type: Array},
      _loading: {type: Boolean},
      _loadError: {type: String},
      _creating: {type: Boolean},
      _restoring: {type: Boolean},
      _file: {type: Object},
      _uploadHint: {},
      _restoreResult: {type: Object},
      _deleteTarget: {type: Object},
    }
  }

  constructor() {
    super()
    this.username = ''
    this._backups = []
    this._loading = false
    this._loadError = ''
    this._creating = false
    this._restoring = false
    // The selected file, if it can be restored, and its backupFileType.
    this._file = null
    this._fileType = ''
    this._uploadHint = ''
    this._restoreResult = null
    this._deleteTarget = null
    // Non-reactive: whether the list was requested, and the step to retry
    // after a successful relogin.
    this._requested = false
    this._pendingAction = null
  }

  // Whether the backend supports backup archives. It reports
  // `server.backups` (false without a backup directory) only if it does.
  get _archivesSupported() {
    return 'backups' in (this.appState?.dbInfo?.server ?? {})
  }

  // Whether backups can be stored on the server and managed by the user.
  get _storedEnabled() {
    return (
      this.appState?.dbInfo?.server?.backups === true &&
      Boolean(this.appState?.permissions?.canManageBackups)
    )
  }

  render() {
    return html`
      ${this._archivesSupported
        ? html`<p>
            ${this._(
              'A backup contains the family tree data including private records, the tree settings and the users of the tree. Media files are not included.'
            )}
          </p>`
        : ''}
      ${this._storedEnabled ? this._renderStored() : ''}
      ${this._archivesSupported && !this.appState.dbInfo.server.backups
        ? html`<p class="alert warn">
            ${this._('Storing backups is not configured on this server.')}
          </p>`
        : ''}

      <h3>${this._('Restore from Backup')}</h3>
      ${this._archivesSupported
        ? ''
        : html`<p>
            ${this._(
              'Reset the tree to match an uploaded Gramps XML backup, adding, updating, and deleting objects as needed. This is a destructive replace, not a merge.'
            )}
          </p>`}
      <p>
        <grampsjs-form-upload
          id="upload-backup"
          accept="${this._archivesSupported ? '.tar,.gramps' : '.gramps'}"
          filename
          outlined
          .appState="${this.appState}"
          @formdata:changed="${this._handleUploadChanged}"
        ></grampsjs-form-upload>
      </p>
      <p class="small">
        ${this._archivesSupported
          ? 'Gramps Web (.tar), Gramps XML (.gramps)'
          : 'Gramps XML (.gramps)'}
      </p>
      ${this._uploadHint || ''}
      <p>
        <md-outlined-button
          class="danger-button"
          ?disabled="${!this._file || this._restoring}"
          @click="${() => this._startRestore(null)}"
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiBackupRestore}"
            color="currentColor"
          ></grampsjs-icon>
          ${this._('Restore')}
        </md-outlined-button>
      </p>

      <p class="button-row">
        <grampsjs-task-progress-indicator
          id="progress-restore"
          taskName="restoreBackup"
          size="20"
          .appState="${this.appState}"
          @task:complete="${this._handleOtherRestoreComplete}"
        ></grampsjs-task-progress-indicator>
      </p>
      ${this._renderRestoreResult()}

      <grampsjs-backup-restore-dialog
        .appState="${this.appState}"
      ></grampsjs-backup-restore-dialog>
      <grampsjs-restore-backup-confirm-dialog
        .appState="${this.appState}"
      ></grampsjs-restore-backup-confirm-dialog>
      <grampsjs-relogin
        .appState="${this.appState}"
        username="${this.username}"
        @relogin="${this._handleRelogin}"
      ></grampsjs-relogin>
      ${this._renderDeleteDialog()}
      <a
        id="backup-download"
        aria-hidden="true"
        href="#"
        style="display:none"
        download
      ></a>
    `
  }

  _renderStored() {
    const server = this.appState.dbInfo.server
    return html`
      <p class="button-row">
        <md-outlined-button
          ?disabled="${this._creating}"
          @click="${this._createBackup}"
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiDatabaseExport}"
            color="currentColor"
          ></grampsjs-icon>
          ${this._('Make Backup...')}
        </md-outlined-button>
        <grampsjs-task-progress-indicator
          id="progress-create"
          taskName="createBackup"
          size="20"
          .appState="${this.appState}"
          @task:complete="${this._handleOtherCreateComplete}"
        ></grampsjs-task-progress-indicator>
      </p>
      ${server.backup_keep
        ? html`<p class="small">
            ${this._(
              'The newest %s backups are kept, older ones are deleted automatically.',
              server.backup_keep
            )}
          </p>`
        : ''}
      ${this._renderList()}
    `
  }

  _renderList() {
    if (this._loadError) {
      return html`<p class="alert error">${this._loadError}</p>`
    }
    if (this._loading && !this._backups.length) {
      return html`<p>
        <span class="skeleton" style="width:12em;">&nbsp;</span>
      </p>`
    }
    if (!this._backups.length) {
      return ''
    }
    const lang = this.appState.i18n?.lang
    const columns = [
      {name: 'Date', format: backup => this._renderDate(backup)},
      {name: 'People'},
      {name: 'Size'},
      {name: '', format: backup => this._renderActions(backup)},
    ]
    const data = this._backups.map(backup => [
      backup,
      formatBackupCount(backup.manifest?.object_counts?.people, lang),
      formatBytes(backup.size ?? 0),
      backup,
    ])
    return html`
      <grampsjs-table
        .appState="${this.appState}"
        .columns="${columns}"
        .data="${data}"
      ></grampsjs-table>
    `
  }

  _renderDate(backup) {
    const timestamp = backupTimestamp(backup.manifest?.created)
    // rendered inside grampsjs-table, which this component's styles don't
    // reach, hence the inline styles
    return html`<span style="display:inline-flex;align-items:center;gap:6px;">
      ${timestamp === null
        ? backup.manifest?.created ?? ''
        : html`<grampsjs-timedelta
            timestamp="${timestamp}"
            locale="${this.appState.i18n?.lang}"
          ></grampsjs-timedelta>`}
      ${backup.restorable
        ? ''
        : html`<span style="display:inline-flex;"
            ><grampsjs-icon
              path="${mdiAlertOutline}"
              color="var(--grampsjs-alert-warn-font-color)"
              height="18"
              width="18"
            ></grampsjs-icon
            ><grampsjs-tooltip
              .appState="${this.appState}"
              content="${this._(
                'This backup was made with a newer version and cannot be restored on this server.'
              )}"
            ></grampsjs-tooltip
          ></span>`}
    </span>`
  }

  _renderActions(backup) {
    return html`<div
      style="display:flex;gap:4px;justify-content:flex-end;align-items:center;"
    >
      <md-icon-button
        aria-label="${this._('Download')}"
        title="${this._('Download')}"
        @click="${() => this._download(backup)}"
      >
        <grampsjs-icon
          path="${mdiDownload}"
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>
      <md-icon-button
        aria-label="${this._('Restore')}"
        title="${this._('Restore')}"
        ?disabled="${!backup.restorable || this._restoring}"
        @click="${() => this._startRestore(backup)}"
      >
        <grampsjs-icon
          path="${mdiBackupRestore}"
          color="var(--grampsjs-alert-error-font-color)"
        ></grampsjs-icon>
      </md-icon-button>
      <md-icon-button
        aria-label="${this._('Delete')}"
        title="${this._('Delete')}"
        @click="${() => {
          this._deleteTarget = backup
        }}"
      >
        <grampsjs-icon
          path="${mdiDelete}"
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>
    </div>`
  }

  _renderDeleteDialog() {
    if (!this._deleteTarget) {
      return ''
    }
    return html`
      <md-dialog
        open
        @closed="${() => {
          this._deleteTarget = null
        }}"
      >
        <span slot="headline">
          ${this._(
            'Delete %s?',
            formatBackupDate(
              this._deleteTarget.manifest?.created,
              this.appState.i18n?.lang
            )
          )}
        </span>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this._deleteTarget = null
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._deleteBackup}">
            ${this._('Delete')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  // Shows what needs attention after a restore: the added users, who have
  // to reset their password, and media objects whose files are missing.
  _renderRestoreResult() {
    const added = this._restoreResult?.users?.added ?? []
    const missingMedia = this._restoreResult?.missing_media ?? []
    if (!added.length && !missingMedia.length) {
      return ''
    }
    return html`
      <div class="card restore-result">
        ${added.length
          ? html`<p>${this._('Users')}: ${added.join(', ')}</p>
              <p>
                ${this._(
                  'Added users get a random password, so they can sign in after resetting it.'
                )}
              </p>`
          : ''}
        ${missingMedia.length
          ? html`<p class="alert warn">
              ${this._(
                'The files of %s media objects in the backup are missing on this server.',
                missingMedia.length
              )}
              ${missingMedia.join(', ')}
            </p>`
          : ''}
      </div>
    `
  }

  async _fetchBackups() {
    this._requested = true
    this._loading = true
    const res = await this.appState.apiGet('/api/backups/')
    this._loading = false
    if ('error' in res) {
      this._loadError = res.error
      return
    }
    this._loadError = ''
    this._backups = res.data ?? []
  }

  async _createBackup() {
    if (this._creating) {
      return
    }
    this._creating = true
    const prog = this.renderRoot.querySelector('#progress-create')
    prog.reset()
    prog.open = true
    let res = await this.appState.apiPost('/api/backups/', null, {
      dbChanged: false,
    })
    // The backend limits backups per tree (RATE_LIMIT_BACKUP).
    if (res.errorDetail?.status === 429) {
      const limit = formatRateLimit(
        this.appState.dbInfo?.server?.rate_limit_backup,
        this.appState.i18n?.lang
      )
      const message = this._('Too many requests. Please try again later.')
      res = {
        error: limit ? `${message} ${this._('Limit')}: ${limit}` : message,
      }
    }
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: 'Make Backup...',
      taskName: 'createBackup',
    })
    if (outcome.error !== undefined) {
      prog.errorMessage = this._(outcome.error)
    }
    this._creating = false
    this._fetchBackups()
  }

  // The indicator also shows backups this component did not start, e.g.
  // after a reload.
  _handleOtherCreateComplete() {
    if (!this._creating) {
      this._fetchBackups()
    }
  }

  async _download(backup) {
    // the download URL carries the access token, so it must be valid
    await this.appState.refreshTokenIfNeeded()
    const anchor = this.renderRoot.querySelector('#backup-download')
    anchor.href = getExporterDownloadUrl(
      `/api/backups/${encodeURIComponent(backup.id)}`
    )
    anchor.click()
  }

  async _deleteBackup() {
    const backup = this._deleteTarget
    this._deleteTarget = null
    if (!backup) {
      return
    }
    const res = await this.appState.apiDelete(
      `/api/backups/${encodeURIComponent(backup.id)}`,
      {dbChanged: false}
    )
    if ('error' in res) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
    }
    this._fetchBackups()
  }

  _handleUploadChanged() {
    const uploadForm = this.renderRoot.querySelector('#upload-backup')
    const file = uploadForm?.file
    this._file = null
    this._fileType = ''
    this._restoreResult = null
    if (!file?.name) {
      this._uploadHint = ''
      return
    }
    const type = backupFileType(file.name)
    if (!type || (type === 'archive' && !this._archivesSupported)) {
      this._uploadHint = html`<p class="alert error">
        ${this._('Unsupported format')}
      </p>`
      return
    }
    this._uploadHint = ''
    this._file = file
    this._fileType = type
  }

  // Restores from a stored backup, or from the selected file if `backup` is
  // null: asks which parts to restore (a Gramps XML file only has the data),
  // previews the restore and applies it once confirmed.
  async _startRestore(backup) {
    if (this._restoring) {
      return
    }
    const file = backup ? null : this._file
    if (!backup && !file) {
      return
    }
    const xml = !backup && this._fileType === 'xml'
    const parts = xml
      ? {data: true}
      : await this.renderRoot
          .querySelector('grampsjs-backup-restore-dialog')
          .confirm(backup?.manifest ?? null)
    if (!parts) {
      return
    }
    this._restoreResult = null
    this._runRestore({backupId: backup?.id ?? '', file, xml}, parts, true)
  }

  async _runRestore(source, parts, dryRun) {
    const retry = () => this._runRestore(source, parts, dryRun)
    if (!this.appState.auth.isTokenFresh()) {
      this._relogin(retry)
      return
    }
    this._restoring = true
    const prog = this.renderRoot.querySelector('#progress-restore')
    prog.reset()
    prog.open = true
    const res = await this.appState.apiPost(
      source.xml
        ? xmlRestoreUrl(dryRun)
        : backupRestoreUrl(source.backupId, parts, dryRun),
      source.file,
      {isJson: !source.file, dbChanged: false, requireFresh: true}
    )
    // the token can lose its freshness by a refresh after the check above
    if (res.errorDetail?.status === 401) {
      prog.reset()
      prog.open = false
      this._restoring = false
      this._relogin(retry)
      return
    }
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: dryRun ? 'Preview Restore from Backup' : 'Restore from Backup',
      taskName: 'restoreBackup',
    })
    if (outcome.error !== undefined) {
      prog.errorMessage = this._(outcome.error)
      this._restoring = false
      return
    }
    // a Gramps XML restore results in the data summary alone
    const result = source.xml ? {data: outcome.data ?? {}} : outcome.data
    if (dryRun) {
      prog.open = false
      const confirmed = await this.renderRoot
        .querySelector('grampsjs-restore-backup-confirm-dialog')
        .confirm(result)
      this._restoring = false
      if (confirmed) {
        this._runRestore(source, parts, false)
      }
      return
    }
    this._restoring = false
    this._restoreResult = result ?? {}
    if (!source.backupId) {
      this.renderRoot.querySelector('#upload-backup')?.reset()
      this._file = null
      this._fileType = ''
    }
    this._handleRestored(this._restoreResult)
  }

  // The indicator also shows restores this component did not start, e.g.
  // after a reload. Whether such a task was a preview is unknown, so the
  // tree data and settings are reloaded either way.
  _handleOtherRestoreComplete() {
    if (!this._restoring) {
      this._handleRestored({data: {}, tree_settings: {changed: true}})
    }
  }

  _handleRestored(result) {
    if (result.data || result.users?.added?.length) {
      fireEvent(this, 'db:changed', {})
    }
    if (result.tree_settings?.changed) {
      this._reloadTreeConfig()
    }
  }

  async _reloadTreeConfig() {
    const res = await this.appState.apiGet('/api/trees/-/config')
    if ('data' in res) {
      this.appState.cacheTreeConfig(res.data)
    }
  }

  _relogin(action) {
    this._pendingAction = action
    this.renderRoot.querySelector('grampsjs-relogin').show()
  }

  _handleRelogin() {
    const action = this._pendingAction
    this._pendingAction = null
    action?.()
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('appState') && this._storedEnabled && !this._requested) {
      this._fetchBackups()
    }
  }
}

window.customElements.define('grampsjs-backups', GrampsjsBackups)
