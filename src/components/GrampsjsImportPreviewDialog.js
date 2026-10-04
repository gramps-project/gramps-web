import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {importedObjectTypes} from './GrampsjsImportCounts.js'
import './GrampsjsImportExportReport.js'

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
      `,
    ]
  }

  static get properties() {
    return {
      counts: {type: Object},
      messages: {type: Array},
    }
  }

  constructor() {
    super()
    this.counts = {}
    this.messages = []
  }

  show() {
    this.renderRoot.querySelector('md-dialog').show()
  }

  render() {
    const hasObjects = importedObjectTypes(this.counts).length > 0
    return html`
      <md-dialog
        id="import-preview-dialog"
        @cancel="${e => e.preventDefault()}"
        @close=${this._handleClose}
      >
        <div slot="headline">${this._('Confirm Import')}</div>
        <form slot="content" id="form-id" method="dialog">
          ${hasObjects
            ? html`
                <p>
                  ${this._(
                    'This file contains the following objects, which will be added to your tree:'
                  )}
                </p>
                <grampsjs-import-counts
                  .appState="${this.appState}"
                  .counts="${this.counts}"
                ></grampsjs-import-counts>
              `
            : html`<p>${this._('No objects found in this file.')}</p>`}
          <grampsjs-import-export-report
            .appState="${this.appState}"
            .messages="${this.messages}"
            heading="${this._('Import messages')}"
          ></grampsjs-import-export-report>
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
