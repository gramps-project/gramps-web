import {html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'

import {mdiPencil} from '@mdi/js'

import {objectIconPath} from '../util.js'
import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsIcon.js'
import './GrampsjsNoteContent.js'
import './GrampsjsEditor.js'
import './GrampsjsFormEditType.js'

export class GrampsjsNote extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._objectsName = 'Notes'
    this._objectEndpoint = 'notes'
    this._objectIcon = objectIconPath.note
  }

  renderProfile() {
    return html`
      <h2>
        ${this._(this.data?.type || 'Note')}
        ${this.edit
          ? html`
              <md-icon-button
                class="edit"
                aria-label="${this._('Edit')}"
                @click="${this._handleEditType}"
              >
                <grampsjs-icon
                  path="${mdiPencil}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
            `
          : ''}
      </h2>

      ${this.edit
        ? html` <grampsjs-editor
            id="note-text-editor"
            .initialData=${this.data.text}
            .appState="${this.appState}"
          ></grampsjs-editor>`
        : html` <grampsjs-note-content
            grampsId="${this.data.gramps_id}"
            content="${this.data?.formatted?.html ||
            this.data?.text?.string ||
            'Error loading note'}"
          ></grampsjs-note-content>`}
    `
  }

  _handleEditType() {
    this.dialogContent = html`
      <grampsjs-form-edit-type
        formId="note-type"
        typeName="note_types"
        @object:save="${this._handleSaveType}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${{type: this.data?.type || ''}}
        prop="value"
      >
      </grampsjs-form-edit-type>
    `
  }
}

window.customElements.define('grampsjs-note', GrampsjsNote)
