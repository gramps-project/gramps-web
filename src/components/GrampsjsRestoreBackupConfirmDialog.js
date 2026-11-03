import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'

import {sharedStyles, buttonColorStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const namespaceLabels = {
  people: 'People',
  families: 'Families',
  events: 'Events',
  places: 'Places',
  citations: 'Citations',
  sources: 'Sources',
  repositories: 'Repositories',
  media: 'Media Objects',
  notes: 'Notes',
  tags: 'Tags',
}

class GrampsjsRestoreBackupConfirmDialog extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      buttonColorStyles,
      css`
        /* md-dialog's own :host rule caps max-height at 560px, which forces
           scrolling even on tall screens once the object-type table has
           several rows. Target it by id so this wins on specificity, and
           raise min-height to match so the dialog reserves that space
           upfront instead of growing/scrolling as the table renders. */
        md-dialog#restore-confirm-dialog {
          min-height: min(640px, calc(100% - 48px));
          max-height: min(640px, calc(100% - 48px));
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }

        th,
        td {
          text-align: right;
          padding: 0.3em 0.6em;
        }

        th:first-child,
        td:first-child {
          text-align: left;
        }

        td.delete-col {
          color: var(--grampsjs-alert-error-font-color);
        }

        p.alert.error {
          position: sticky;
          top: 0;
          z-index: 1;
          /* The shared .alert.error background is translucent (mixed with
             transparent) so it reads as a subtle tint over the page. That
             breaks once it needs to stay opaque while pinned during scroll,
             so mix with the dialog surface color instead here. */
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-error) 20%,
            var(--md-sys-color-surface)
          );
        }

        .danger-button {
          --grampsjs-button-color: var(--grampsjs-alert-error-font-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      summary: {type: Object},
      treeSettings: {type: Object},
      users: {type: Object},
      missingMedia: {type: Array},
    }
  }

  constructor() {
    super()
    // Each part of the preview is shown only if set: the data changeset
    // summary, the tree settings result ({changed}), the users result
    // ({added, skipped}) and the Gramps IDs of media with missing files.
    this.summary = null
    this.treeSettings = null
    this.users = null
    this.missingMedia = null
    this._resolve = null
  }

  // Shows the dry run result of a restore and resolves with whether the user
  // confirmed it.
  confirm(result) {
    this._resolve?.(false)
    this.summary = result?.data ?? null
    this.treeSettings = result?.tree_settings ?? null
    this.users = result?.users ?? null
    this.missingMedia = result?.missing_media ?? null
    this.renderRoot.querySelector('md-dialog').show()
    return new Promise(resolve => {
      this._resolve = resolve
    })
  }

  render() {
    return html`
      <md-dialog
        id="restore-confirm-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <div slot="headline">${this._('Confirm Restore from Backup')}</div>
        <form slot="content" id="form-id" method="dialog">
          ${this._renderContent()}
        </form>
        <div slot="actions">
          <md-text-button form="form-id" value="cancel"
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button form="form-id" value="ok" class="danger-button"
            >${this._('Restore')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  // Rows of the changes table: the object types whose data changes, then the
  // tree settings and the users if selected. The users row lists the names
  // in a tooltip on each count.
  _rows() {
    const toAdd = this.summary?.to_add ?? {}
    const toUpdate = this.summary?.to_update ?? {}
    const toDelete = this.summary?.to_delete ?? {}
    const unchanged = this.summary?.unchanged ?? {}
    const rows = Object.keys(namespaceLabels)
      .filter(
        type =>
          (toAdd[type] || 0) + (toUpdate[type] || 0) + (toDelete[type] || 0) > 0
      )
      .map(type => ({
        label: namespaceLabels[type],
        add: toAdd[type] || 0,
        update: toUpdate[type] || 0,
        delete: toDelete[type] || 0,
        unchanged: unchanged[type] || 0,
      }))
    if (this.treeSettings) {
      const changed = Boolean(this.treeSettings.changed)
      rows.push({
        label: 'Tree settings',
        add: 0,
        update: changed ? 1 : 0,
        delete: 0,
        unchanged: changed ? 0 : 1,
      })
    }
    if (this.users) {
      const added = this.users.added ?? []
      const skipped = this.users.skipped ?? []
      rows.push({
        label: 'Users',
        add: added.length,
        addTitle: added.join(', '),
        update: 0,
        delete: 0,
        unchanged: skipped.length,
        unchangedTitle: skipped.join(', '),
      })
    }
    return rows
  }

  _renderContent() {
    const rows = this._rows()
    // the note on what a data restore leaves alone only fits a restore of
    // the data alone
    const dataOnlyChanged = rows.length > 0 && !this.treeSettings && !this.users
    const totalChanges = rows.reduce(
      (sum, row) => sum + row.add + row.update + row.delete,
      0
    )
    const totalDelete = rows.reduce((sum, row) => sum + row.delete, 0)
    return html`
      ${totalDelete > 0
        ? html`<p class="alert error">
            ${this._(
              'This will permanently delete %s existing objects that are not present in the backup.',
              totalDelete
            )}
          </p>`
        : ''}
      ${totalChanges === 0
        ? html`<p>${this._('No changes detected.')}</p>`
        : html`
            <table>
              <thead>
                <tr>
                  <th>${this._('Object Type')}</th>
                  <th>${this._('Add')}</th>
                  <th>${this._('Update')}</th>
                  <th>${this._('Delete')}</th>
                  <th>${this._('Unchanged')}</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(
                  row => html`
                    <tr>
                      <td>${this._(row.label)}</td>
                      <td title="${row.addTitle ?? ''}">${row.add}</td>
                      <td>${row.update}</td>
                      <td class="delete-col">${row.delete}</td>
                      <td title="${row.unchangedTitle ?? ''}">
                        ${row.unchanged}
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
            ${this.users?.added?.length
              ? html`<p class="small">
                  ${this._(
                    'Added users get a random password, so they can sign in after resetting it.'
                  )}
                </p>`
              : ''}
            ${dataOnlyChanged
              ? html`<p class="small">
                  ${this._(
                    'This restores object data and media references only. Binary media files and tree metadata (default person, bookmarks, name groups) are not affected.'
                  )}
                </p>`
              : ''}
          `}
      ${this.missingMedia?.length
        ? html`<p class="alert warn">
            ${this._(
              'The files of %s media objects in the backup are missing on this server.',
              this.missingMedia.length
            )}
          </p>`
        : ''}
    `
  }

  _handleClose() {
    const {returnValue} = this.renderRoot.querySelector('md-dialog')
    this._resolve?.(returnValue === 'ok')
    this._resolve = null
  }
}

window.customElements.define(
  'grampsjs-restore-backup-confirm-dialog',
  GrampsjsRestoreBackupConfirmDialog
)
