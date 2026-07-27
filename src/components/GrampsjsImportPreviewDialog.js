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

class GrampsjsImportPreviewDialog extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        /* md-dialog's own :host rule caps max-height at 560px, which forces
           scrolling even on tall screens once the object-type table has
           several rows. Target it by id so this wins on specificity. No
           min-height here (unlike the restore dialog) — an imported file's
           object count varies widely, including near-empty files, so the
           dialog should size to its actual content rather than reserve a
           fixed height that looks empty for short messages. */
        md-dialog#import-preview-dialog {
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
      `,
    ]
  }

  static get properties() {
    return {
      counts: {type: Object},
    }
  }

  constructor() {
    super()
    this.counts = {}
  }

  show() {
    this.renderRoot.querySelector('md-dialog').show()
  }

  render() {
    const counts = this.counts ?? {}
    const types = Object.keys(namespaceLabels).filter(
      type => (counts[type] || 0) > 0
    )
    return html`
      <md-dialog
        id="import-preview-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <div slot="headline">${this._('Confirm Import')}</div>
        <form slot="content" id="form-id" method="dialog">
          ${types.length === 0
            ? html`<p>${this._('No objects found in this file.')}</p>`
            : html`
                <p>
                  ${this._(
                    'This file contains the following objects, which will be added to your tree:'
                  )}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>${this._('Object Type')}</th>
                      <th>${this._('Count')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${types.map(
                      type => html`
                        <tr>
                          <td>${this._(namespaceLabels[type])}</td>
                          <td>${counts[type] || 0}</td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
        </form>
        <div slot="actions">
          <md-text-button form="form-id" value="cancel"
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button form="form-id" value="ok"
            >${this._('Import')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  _handleClose() {
    const {returnValue} = this.renderRoot.querySelector('md-dialog')
    if (returnValue === 'ok') {
      fireEvent(this, 'import-confirmed', {})
    }
  }
}

window.customElements.define(
  'grampsjs-import-preview-dialog',
  GrampsjsImportPreviewDialog
)
