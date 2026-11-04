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

export class GrampsjsViewObjectNotes extends GrampsjsViewObjectsDetail {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }

        div.note-content {
          padding-top: 1.6em;
          padding-bottom: 1.6em;
        }

        div.note-meta {
          margin-top: 0.4em;
          display: flex;
          justify-content: flex-start;
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
      objType: {type: String},
    }
  }

  constructor() {
    super()
    this.numberOfNotes = 0
    this.objType = ''
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    if (this.handles.length === 0) {
      return ''
    }
    const options = {
      link_format: `/{obj_class}/{gramps_id}`,
    }
    return `/api/notes/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&extend=all&formats=html&handles=${this.handles.join(
      ','
    )}&format_options=${encodeURIComponent(JSON.stringify(options))}`
  }

  renderElements() {
    return html`${this._data.map((obj, i) => this.renderNote(obj, i))} `
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
        objType="${this.objType}"
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
  renderNote(obj, i) {
    return html`
      <div class="note-content">
        <grampsjs-note-content
          framed
          grampsId="${obj.gramps_id}"
          content="${obj?.formatted?.html || obj?.text?.string || ''}"
        ></grampsjs-note-content>
      </div>
      ${this.edit || !obj.gramps_id
        ? ''
        : html`<div class="note-meta">
            <md-text-button href="/note/${obj.gramps_id}">
              ${this._('Details')}
            </md-text-button>
          </div>`}
      <div class="note-edit-meta">
        ${this.edit
          ? html`
              <md-icon-button
                @click="${() => this._handleNoteRefDel(i)}"
                id="del-note-${i}"
              >
                <grampsjs-icon
                  path="${mdiLinkOff}"
                  class="edit"
                  color="var(--mdc-theme-secondary)"
                  icon="delete"
                ></grampsjs-icon>
              </md-icon-button>
              <grampsjs-tooltip
                for="del-note-${i}"
                content="${this._('Remove note')}"
              ></grampsjs-tooltip>
            `
          : ''}
      </div>
    `
  }

  _handleNoteRefDel(index) {
    fireEvent(this, 'edit:action', {action: 'delNoteRef', index})
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
}

window.customElements.define(
  'grampsjs-view-object-notes',
  GrampsjsViewObjectNotes
)
