import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {live} from 'lit/directives/live.js'
import {mdiPencil, mdiPencilOff} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'

import '@material/mwc-button'
import '@material/mwc-icon'
import '@material/mwc-select'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

import './GrampsjsEditor.js'
import './GrampsJsImage.js'
import './GrampsjsGallery.js'
import './GrampsjsTags.js'
import './GrampsjsTooltip.js'
import './GrampsjsNoteContent.js'
import './GrampsjsConnectedNote.js'
import './GrampsjsBreadcrumbs.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {debounce, fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'

export class GrampsjsTask extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #btn-details {
          margin-top: 2em;
        }

        h2#title {
          display: block;
          border-radius: 5px;
          padding: 5px 10px;
          margin-left: -10px;
        }

        h2.editable:hover,
        mwc-select:hover {
          background-color: rgba(2, 119, 189, 0.2);
        }

        .dropdowns {
          margin-top: 48px;
          --mdc-select-outlined-disabled-border-color: rgba(0, 0, 0, 0.38);
          --mdc-select-disabled-ink-color: rgba(0, 0, 0, 0.87);
          --mdc-select-disabled-dropdown-icon-color: #fff;
        }

        .dropdowns mwc-select {
          margin-right: 12px;
          margin-bottom: 18px;
        }

        h3 {
          margin-top: 2em;
        }

        .controls {
          margin: 0.7em 0;
        }

        .muted {
          opacity: 0.4;
        }
      `,
    ]
  }

  static get properties() {
    return {
      source: {type: Object},
      note: {type: Object},
      dialogContent: {type: String},
      _editingNote: {type: Boolean},
      _editingGallery: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.source = {}
    this.note = {}
    this.dialogContent = ''
    this._editingNote = false
    this._editingGallery = false
  }

  get canEdit() {
    return this.appState.permissions.canEdit
  }

  render() {
    if (Object.keys(this.source).length === 0) {
      return html``
    }
    return html`
      <grampsjs-breadcrumbs
        .data="${this.source}"
        .appState="${this.appState}"
        objectsName="Tasks"
        objectIcon="checklist"
        hideBookmark
        hideLock
      ></grampsjs-breadcrumbs>
      <h2
        id="title"
        class="${classMap({editable: this.canEdit})}"
        contenteditable="${this.canEdit}"
        @input="${debounce(() => this._handleEditTitle(), 500)}"
        .innerText="${live(this.source.title)}"
      >
        &nbsp;
      </h2>

      <p class="dropdowns">
        <mwc-select
          outlined
          ?disabled="${!this.canEdit}"
          label="${this._('Status')}"
          id="select-status"
          @change="${this._handleStatusChange}"
        >
          ${['Open', 'In Progress', 'Blocked', 'Done'].map(
            status => html`
              <mwc-list-item
                value="${status}"
                ?selected="${this._status === status}"
                >${this._(status)}</mwc-list-item
              >
            `
          )}
        </mwc-select>
        <mwc-select
          outlined
          ?disabled="${!this.canEdit}"
          label="${this._('Priority')}"
          id="select-priority"
          @change="${this._handlePrioChange}"
        >
          <mwc-list-item value="1" ?selected="${this._priority < 5}"
            >${this._('High')}</mwc-list-item
          >
          <mwc-list-item value="5" ?selected="${this._priority === '5'}"
            >${this._('Medium')}</mwc-list-item
          >
          <mwc-list-item value="9" ?selected="${this._priority > 5}"
            >${this._('Low')}</mwc-list-item
          >
        </mwc-select>
      </p>

      <h3>${this._('Description')}</h3>
      <p>
        ${this.source?.note_list?.length > 0
          ? html` ${this._editingNote
              ? html`
                  <grampsjs-editor
                    .data=${this.source.extended.notes[0].text}
                    .appState="${this.appState}"
                  ></grampsjs-editor>
                `
              : html`
                  <grampsjs-connected-note handle="${this.source.note_list[0]}">
                  </grampsjs-connected-note>
                `}`
          : html`${this._editingNote
              ? html`<grampsjs-editor
                  .appState="${this.appState}"
                ></grampsjs-editor>`
              : html`<span class="muted">${this._('None')}</span>`}`}
        ${this.canEdit
          ? html`
              <div class="controls">
                ${this._editingNote
                  ? html`
                      <mwc-icon-button
                        class="edit"
                        id="btn-save-note"
                        icon="save"
                        @click="${this._handleSaveNote}"
                      ></mwc-icon-button>
                      <grampsjs-tooltip for="btn-save-note"
                        >${this._('_Save')}</grampsjs-tooltip
                      >
                      <mwc-icon-button
                        class="edit"
                        id="btn-cancel-note"
                        icon="clear"
                        @click="${this._handleCancelNote}"
                      ></mwc-icon-button>
                      <grampsjs-tooltip for="btn-cancel-note"
                        >${this._('Cancel')}</grampsjs-tooltip
                      >
                    `
                  : html`
                      <mwc-icon-button
                        id="btn-edit-note"
                        class="edit"
                        icon="edit"
                        @click="${this._handleEditNote}"
                      ></mwc-icon-button>
                      <grampsjs-tooltip for="btn-edit-note"
                        >${this._('Edit Note')}</grampsjs-tooltip
                      >
                    `}
              </div>
            `
          : ''}
      </p>
      <h3>${this._('Attachments')}</h3>
      ${this.source?.media_list?.length === 0 && !this._editingGallery
        ? html`<p><span class="muted">${this._('None')}</span></p>`
        : html`
            <grampsjs-gallery
              ?edit="${this._editingGallery}"
              .appState="${this.appState}"
              .media=${this.source?.extended?.media}
              .mediaRef=${this.source?.media_list}
            ></grampsjs-gallery>
          `}
      ${this.canEdit
        ? html`
            <div class="controls">
              <mwc-icon-button
                id="btn-edit-gallery"
                class="edit"
                @click="${this._handleEditGallery}"
              >
                ${this._editingGallery
                  ? renderIconSvg(mdiPencilOff, 'var(--mdc-theme-secondary)')
                  : renderIconSvg(mdiPencil, 'var(--mdc-theme-secondary)')}
              </mwc-icon-button>
              <grampsjs-tooltip for="btn-edit-gallery"
                >${this._('Edit')}</grampsjs-tooltip
              >
            </div>
          `
        : ''}

      <h3>${this._('Tags')}</h3>
      <grampsjs-tags
        .data="${this.source?.extended?.tags}"
        .hideTags="${['ToDo']}"
        ?edit="${this.canEdit}"
        .appState="${this.appState}"
        @tag:new="${this._handleNewTag}"
      ></grampsjs-tags>

      ${this.dialogContent}
    `
  }

  get _status() {
    return this.source.attribute_list.filter(att => att.type === 'Status')[0]
      ?.value
  }

  get _priority() {
    return this.source.attribute_list.filter(att => att.type === 'Priority')[0]
      ?.value
  }

  _handleEditGallery() {
    this._editingGallery = !this._editingGallery
  }

  _handleEditNote() {
    this._editingNote = true
  }

  _handleSaveNote() {
    const editor = this.renderRoot.querySelector('grampsjs-editor')
    const text = editor.data
    const type = {_class: 'NoteType', string: 'To Do'}
    if (this.source.note_list.length > 0) {
      const note = this.source.extended.notes[0]
      const data = {...note, text, type}
      fireEvent(this, 'task:update-note-text', data)
    } else {
      const data = {text, type}
      if (text.string.trim() !== '') {
        fireEvent(this, 'task:add-note-text', data)
      }
    }
    this._editingNote = false
  }

  _handleCancelNote() {
    this._editingNote = false
  }

  _handleStatusChange(e) {
    const status = `${e.target.value}`
    if (status === this._status) {
      return
    }
    const data = {
      type: 'Status',
      value: `${e.target.value}`,
    }
    if (this._status === undefined) {
      fireEvent(this, 'edit:action', {action: 'addAttribute', data})
    } else {
      const index = this.source.attribute_list.findIndex(
        att => att.type === 'Status'
      )
      fireEvent(this, 'edit:action', {action: 'updateAttribute', data, index})
    }
  }

  _handlePrioChange(e) {
    const prio = `${e.target.value}`
    if (prio === this._priority) {
      return
    }
    const data = {
      type: 'Priority',
      value: `${e.target.value}`,
    }
    if (this._priority === undefined) {
      fireEvent(this, 'edit:action', {action: 'addAttribute', data})
    } else {
      const index = this.source.attribute_list.findIndex(
        att => att.type === 'Priority'
      )
      fireEvent(this, 'edit:action', {action: 'updateAttribute', data, index})
    }
  }

  _handleEditTitle() {
    const element = this.renderRoot.getElementById('title')
    const title = element.textContent
      .replace(/(\r\n|\n|\r)/gm, '') // remove line breaks
      .trim()
    element.blur()
    fireEvent(this, 'edit:action', {action: 'updateProp', data: {title}})
  }

  _clickDetails(grampsId) {
    fireEvent(this, 'nav', {path: `source/${grampsId}`})
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleNewTag() {
    this.dialogContent = html`
      <grampsjs-form-new-tag
        .appState="${this.appState}"
        .data="${this.source.tag_list}"
        @object:save="${this._handleSaveTag}"
        @object:cancel="${this._handleCancelDialog}"
      >
      </grampsjs-form-new-tag>
    `
  }

  _handleSaveTag(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {tag_list: e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-task', GrampsjsTask)
