import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

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
          --md-text-button-label-text-color: var(
            --grampsjs-alert-error-font-color
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      summary: {type: Object},
    }
  }

  constructor() {
    super()
    this.summary = {}
  }

  show() {
    this.renderRoot.querySelector('md-dialog').show()
  }

  render() {
    const toAdd = this.summary?.to_add ?? {}
    const toUpdate = this.summary?.to_update ?? {}
    const toDelete = this.summary?.to_delete ?? {}
    const unchanged = this.summary?.unchanged ?? {}
    const types = Object.keys(namespaceLabels).filter(
      type =>
        (toAdd[type] || 0) + (toUpdate[type] || 0) + (toDelete[type] || 0) > 0
    )
    const totalDelete = types.reduce(
      (sum, type) => sum + (toDelete[type] || 0),
      0
    )
    return html`
      <md-dialog
        id="restore-confirm-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <div slot="headline">${this._('Confirm Restore from Backup')}</div>
        <form slot="content" id="form-id" method="dialog">
          ${totalDelete > 0
            ? html`<p class="alert error">
                ${this._(
                  'This will permanently delete %s existing objects that are not present in the backup.',
                  totalDelete
                )}
              </p>`
            : ''}
          ${types.length === 0
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
                    ${types.map(
                      type => html`
                        <tr>
                          <td>${this._(namespaceLabels[type])}</td>
                          <td>${toAdd[type] || 0}</td>
                          <td>${toUpdate[type] || 0}</td>
                          <td class="delete-col">${toDelete[type] || 0}</td>
                          <td>${unchanged[type] || 0}</td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
          <p class="small">
            ${this._(
              'This restores object data and media references only. Binary media files and tree metadata (default person, bookmarks, name groups) are not affected.'
            )}
          </p>
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

  _handleClose() {
    const {returnValue} = this.renderRoot.querySelector('md-dialog')
    if (returnValue === 'ok') {
      fireEvent(this, 'restore-confirmed', {})
    }
  }
}

window.customElements.define(
  'grampsjs-restore-backup-confirm-dialog',
  GrampsjsRestoreBackupConfirmDialog
)
