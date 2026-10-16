import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/checkbox/checkbox'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {getPermissions} from '../api.js'
import {formatBackupDate} from '../backups.js'
import './GrampsjsImportCounts.js'

// The parts of a backup that can be restored, with the permissions each one
// needs.
const PARTS = [
  {
    key: 'data',
    label: 'Data',
    permissions: ['ImportFile', 'BatchDeleteObjects'],
  },
  {
    key: 'tree_settings',
    label: 'Tree settings',
    permissions: ['EditTree'],
  },
  {
    key: 'users',
    label: 'Users',
    permissions: ['AddUser'],
  },
]

/**
 * Dialog choosing the parts of a backup to restore. For a stored backup, it
 * also shows what the backup contains.
 */
class GrampsjsBackupRestoreDialog extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-dialog#backup-restore-dialog {
          max-height: min(640px, calc(100% - 48px));
          max-width: min(640px, calc(100% - 48px));
        }

        dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.4em 1.5em;
          margin: 0 0 1em;
        }

        dt {
          font-weight: 500;
        }

        dd {
          margin: 0;
        }

        h4 {
          font-size: 1em;
          font-weight: 500;
          margin: 1.5em 0 0.75em;
        }

        label.part {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 12px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      manifest: {type: Object},
      _selected: {type: Object},
    }
  }

  constructor() {
    super()
    this.manifest = null
    this._selected = {}
    this._resolve = null
  }

  // Shows the dialog for a backup with the given manifest (null for an
  // uploaded file) and resolves with the selected parts, as
  // {data, tree_settings, users} flags, or with null if cancelled.
  confirm(manifest) {
    this._resolve?.(null)
    this.manifest = manifest
    this._selected = Object.fromEntries(
      PARTS.map(part => [part.key, this._isAllowed(part)])
    )
    this.renderRoot.querySelector('md-dialog').show()
    return new Promise(resolve => {
      this._resolve = resolve
    })
  }

  render() {
    const anySelected = Object.values(this._selected).some(Boolean)
    return html`
      <md-dialog
        id="backup-restore-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <div slot="headline">${this._('Restore from Backup')}</div>
        <form slot="content" id="form-id" method="dialog">
          ${this._renderManifest()}
          <h4>${this._('Restore')}</h4>
          ${PARTS.map(part => this._renderPart(part))}
        </form>
        <div slot="actions">
          <md-text-button form="form-id" value="cancel"
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button form="form-id" value="ok" ?disabled="${!anySelected}"
            >${this._('Preview')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  _renderManifest() {
    if (!this.manifest) {
      return ''
    }
    const lang = this.appState?.i18n?.lang
    return html`
      <dl>
        <dt>${this._('Created')}</dt>
        <dd>${formatBackupDate(this.manifest.created, lang)}</dd>
        <dt>${this._('Family Tree')}</dt>
        <dd>${this.manifest.tree?.name ?? ''}</dd>
        <dt>${this._('Version')}</dt>
        <dd>Gramps Web API ${this.manifest.versions?.gramps_webapi ?? ''}</dd>
      </dl>
      <grampsjs-import-counts
        .appState="${this.appState}"
        .counts="${this.manifest.object_counts ?? {}}"
      ></grampsjs-import-counts>
    `
  }

  _renderPart(part) {
    return html`
      <label class="part">
        <md-checkbox
          touch-target="wrapper"
          ?disabled="${!this._isAllowed(part)}"
          .checked="${this._selected[part.key] ?? false}"
          @change="${e => {
            this._selected = {...this._selected, [part.key]: e.target.checked}
          }}"
        ></md-checkbox>
        <span>${this._(part.label)}</span>
      </label>
    `
  }

  _isAllowed(part) {
    const permissions = getPermissions()
    return part.permissions.every(perm => permissions.includes(perm))
  }

  _handleClose() {
    const {returnValue} = this.renderRoot.querySelector('md-dialog')
    this._resolve?.(returnValue === 'ok' ? {...this._selected} : null)
    this._resolve = null
  }
}

window.customElements.define(
  'grampsjs-backup-restore-dialog',
  GrampsjsBackupRestoreDialog
)
