import {html, css} from 'lit'

import '@material/mwc-icon-button'

import {GrampsjsViewObjectsDetail} from './GrampsjsViewObjectsDetail.js'
import '../components/GrampsjsNoteContent.js'
import '../components/GrampsjsFormNoteRef.js'
import {fireEvent} from '../util.js'

const BASE_DIR = ''

export class GrampsjsViewObjectNotes extends GrampsjsViewObjectsDetail {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }

        mwc-button {
          margin-top: 1em;
          margin-bottom: 2em;
        }
      `,
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    if (this.grampsIds.length === 0) {
      return ''
    }
    const rules = {
      function: 'or',
      rules: this.grampsIds.map(grampsId => ({
        name: 'HasIdOf',
        values: [grampsId],
      })),
    }
    const options = {
      link_format: `${BASE_DIR}/{obj_class}/{gramps_id}`,
    }
    return `/api/notes/?locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all&extend=all&formats=html&rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&format_options=${encodeURIComponent(JSON.stringify(options))}`
  }

  renderElements() {
    return html` ${this._data.map(obj => this.renderNote(obj))} `
  }

  renderEdit() {
    return html`
      <div>
        <mwc-icon-button
          class="edit large"
          icon="add_circle"
          @click="${this._handleAddClick}"
        ></mwc-icon-button>
        ${this.dialogContent}
      </div>
    `
  }

  _handleAddClick() {
    this.dialogContent = html`
      <grampsjs-form-noteref
        new
        @object:save="${this._handleNoteRefSave}"
        @object:cancel="${this._handleNoteRefCancel}"
        .strings="${this.strings}"
        objType="${this.objType}"
        dialogTitle=${this._('Select an existing note')}
      >
      </grampsjs-form-noteref>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderNote(obj) {
    return html`
      <grampsjs-note-content
        framed
        grampsId="${obj.gramps_id}"
        content="${obj?.formatted?.html || obj?.text?.string}"
      ></grampsjs-note-content>

      ${this.edit
        ? html`
            <mwc-icon-button
              class="edit"
              icon="delete"
              @click="${() => this._handleNoteRefDel(obj.handle)}"
            ></mwc-icon-button>
          `
        : html`<mwc-button
            outlined
            label="${this._('Details')}"
            @click="${() => this._handleButtonClick(obj.gramps_id)}"
          >
          </mwc-button>`}
    `
  }

  _handleNoteRefDel(handle) {
    fireEvent(this, 'edit:action', {action: 'delNoteRef', handle})
  }

  _handleNoteRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addNoteRef', ...e.detail})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNoteRefCancel() {
    this.dialogContent = ''
  }

  _handleButtonClick(grampsId) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {
          path: `note/${grampsId}`,
        },
      })
    )
  }
}

window.customElements.define(
  'grampsjs-view-object-notes',
  GrampsjsViewObjectNotes
)
