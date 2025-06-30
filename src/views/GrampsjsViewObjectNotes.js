import {html, css} from 'lit'

import {mdiLinkOff, mdiLinkPlus, mdiPlus} from '@mdi/js'

import '@material/web/button/text-button'
import '@material/web/iconbutton/icon-button.js'

import {GrampsjsViewObjectsDetail} from './GrampsjsViewObjectsDetail.js'
import '../components/GrampsjsNoteContent.js'
import '../components/GrampsjsFormNoteRef.js'
import '../components/GrampsjsFormNewNote.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTooltip.js'
import {fireEvent, makeHandle} from '../util.js'

const BASE_DIR = ''

export class GrampsjsViewObjectNotes extends GrampsjsViewObjectsDetail {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }

        div.note-content {
          padding-top: 1.2em;
          padding-bottom: 1.2em;
        }

        div.note-meta {
          margin-top: 1.2em;
          display: flex;
          justify-content: flex-end;
        }

        div.note-edit-meta {
          margin-bottom: 1.2em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      numberOfNotes: {type: Number},
    }
  }

  constructor() {
    super()
    this.numberOfNotes = 0
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
      this.appState.i18n.lang || 'en'
    }&profile=all&extend=all&formats=html&rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&format_options=${encodeURIComponent(JSON.stringify(options))}`
  }

  renderElements() {
    return html`${this._data.map(obj => this.renderNote(obj))} `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    const skeleton =
      '<p><span class="skeleton" style="width:100%;">&nbsp;</span></p>'
    const skeletonNotes = Array(this.numberOfNotes)
      .fill()
      .map(
        () => html` <div class="note-content">
          <grampsjs-note-content
            framed
            content="${skeleton}"
          ></grampsjs-note-content>
        </div>`
      )
    return html`${skeletonNotes}`
  }

  renderEdit() {
    return html`
      <div>
        <md-icon-button class="edit" @click="${this._handleShareClick}">
          <grampsjs-icon
            path="${mdiLinkPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <md-icon-button class="edit" @click="${this._handleAddClick}">
          <grampsjs-icon
            path="${mdiPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        ${this.dialogContent}
      </div>
    `
  }

  _handleAddClick() {
    this.dialogContent = html`
      <grampsjs-form-new-note
        @object:save="${this._handleNewNoteSave}"
        @object:cancel="${this._handleNoteCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Create and add a new note')}"
      >
      </grampsjs-form-new-note>
    `
  }

  _handleShareClick() {
    this.dialogContent = html`
      <grampsjs-form-noteref
        new
        @object:save="${this._handleNoteRefSave}"
        @object:cancel="${this._handleNoteCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Select an existing note')}
      >
      </grampsjs-form-noteref>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderNote(obj) {
    return html`
      <div class="note-content">
        <grampsjs-note-content
          framed
          grampsId="${obj.gramps_id}"
          content="${obj?.formatted?.html || obj?.text?.string}"
        >
          ${this.edit
            ? ''
            : html`<div class="note-meta">
                <md-text-button
                  outlined
                  @click="${() => this._handleButtonClick(obj.gramps_id)}"
                >
                  ${this._('Details')}
                </md-text-button>
              </div>`}
        </grampsjs-note-content>
      </div>
      <div class="note-edit-meta">
        ${this.edit
          ? html`
              <md-icon-button
                @click="${() => this._handleNoteRefDel(obj.handle)}"
                id="del-note-${obj.handle}"
              >
                <grampsjs-icon
                  path="${mdiLinkOff}"
                  class="edit"
                  color="var(--mdc-theme-secondary)"
                  icon="delete"
                ></grampsjs-icon>
              </md-icon-button>
              <grampsjs-tooltip
                for="del-note-${obj.handle}"
                content="${this._('Remove note')}"
              ></grampsjs-tooltip>
            `
          : ''}
      </div>
    `
  }

  _handleNoteRefDel(handle) {
    fireEvent(this, 'edit:action', {action: 'delNoteRef', handle})
  }

  _handleNewNoteSave(e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {
      action: 'newNote',
      data: {handle, ...e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNoteRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addNoteRef', ...e.detail})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNoteCancel() {
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
