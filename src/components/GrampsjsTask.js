import {html, css, LitElement} from 'lit'
import {
  mdiClose,
  mdiContentSave,
  mdiFormatListChecks,
  mdiPencil,
  mdiPencilOff,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/select/outlined-select.js'
import '@material/web/select/select-option.js'

import './GrampsjsEditableTitle.js'
import './GrampsjsEditor.js'
import './GrampsjsIcon.js'
import './GrampsjsImg.js'
import './GrampsjsGallery.js'
import './GrampsjsTags.js'
import './GrampsjsTooltip.js'
import './GrampsjsNoteContent.js'
import './GrampsjsConnectedNote.js'
import './GrampsjsBreadcrumbs.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsTask extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #btn-details {
          margin-top: 2em;
        }

        .dropdowns {
          margin-top: 48px;
          --md-outlined-select-text-field-disabled-outline-color: var(
            --grampsjs-body-font-color-38
          );
          --md-outlined-select-text-field-disabled-outline-opacity: 1;
          --md-outlined-select-text-field-disabled-input-text-color: var(
            --grampsjs-body-font-color-87
          );
          --md-outlined-select-text-field-disabled-input-text-opacity: 1;
          --md-outlined-select-text-field-disabled-label-text-color: var(
            --grampsjs-body-font-color-87
          );
          --md-outlined-select-text-field-disabled-label-text-opacity: 1;
          --md-outlined-select-text-field-disabled-trailing-icon-color: var(
            --grampsjs-color-shade-255
          );
          --md-outlined-select-text-field-disabled-trailing-icon-opacity: 1;
        }

        .dropdowns md-outlined-select {
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
      saveNote: {attribute: false},
      _editingNote: {type: Boolean},
      _savingNote: {type: Boolean},
      _editingGallery: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.source = {}
    this.note = {}
    this.dialogContent = ''
    // Saves the note data; resolves to whether the save succeeded
    this.saveNote = async () => false
    this._editingNote = false
    this._savingNote = false
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
        .objectIcon="${mdiFormatListChecks}"
        hideBookmark
        hideLock
      ></grampsjs-breadcrumbs>
      <h2>
        <grampsjs-editable-title
          .value="${this.source.title}"
          prop="title"
          required
          ?editable="${this.canEdit}"
          .appState="${this.appState}"
        ></grampsjs-editable-title>
      </h2>

      <p class="dropdowns">
        <md-outlined-select
          ?disabled="${!this.canEdit}"
          label="${this._('Status')}"
          id="select-status"
          @change="${this._handleStatusChange}"
        >
          ${['Open', 'In Progress', 'Blocked', 'Done'].map(
            status => html`
              <md-select-option
                value="${status}"
                ?selected="${this._status === status}"
              >
                <div slot="headline">${this._(status)}</div>
              </md-select-option>
            `
          )}
        </md-outlined-select>
        <md-outlined-select
          ?disabled="${!this.canEdit}"
          label="${this._('Priority')}"
          id="select-priority"
          @change="${this._handlePrioChange}"
        >
          <md-select-option value="1" ?selected="${this._priority < 5}">
            <span slot="headline">${this._('High')}</span>
          </md-select-option>
          <md-select-option value="5" ?selected="${this._priority === '5'}">
            <span slot="headline">${this._('Medium')}</span>
          </md-select-option>
          <md-select-option value="9" ?selected="${this._priority > 5}">
            <span slot="headline">${this._('Low')}</span>
          </md-select-option>
        </md-outlined-select>
      </p>

      <h3>${this._('Description')}</h3>
      <p>
        ${this.source?.note_list?.length > 0
          ? html` ${this._editingNote
              ? html`
                  <grampsjs-editor
                    id="task-note-editor"
                    .initialData=${this.source.extended.notes[0].text}
                    .appState="${this.appState}"
                  ></grampsjs-editor>
                `
              : html`
                  <grampsjs-connected-note
                    handle="${this.source.note_list[0]}"
                    .appState="${this.appState}"
                  ></grampsjs-connected-note>
                `}`
          : html`${this._editingNote
              ? html`<grampsjs-editor
                  id="task-note-editor"
                  .appState="${this.appState}"
                ></grampsjs-editor>`
              : html`<span class="muted">${this._('None')}</span>`}`}
        ${this.canEdit
          ? html`
              <div class="controls">
                ${this._editingNote
                  ? html`
                      <md-icon-button
                        class="edit"
                        id="btn-save-note"
                        ?disabled="${this._savingNote}"
                        aria-label="${this._('_Save')}"
                        @click="${this._handleSaveNote}"
                      >
                        <grampsjs-icon
                          path="${mdiContentSave}"
                          color="var(--mdc-theme-secondary)"
                        ></grampsjs-icon>
                      </md-icon-button>
                      <grampsjs-tooltip for="btn-save-note"
                        >${this._('_Save')}</grampsjs-tooltip
                      >
                      <md-icon-button
                        class="edit"
                        id="btn-cancel-note"
                        ?disabled="${this._savingNote}"
                        aria-label="${this._('Cancel')}"
                        @click="${this._handleCancelNote}"
                      >
                        <grampsjs-icon
                          path="${mdiClose}"
                          color="var(--mdc-theme-secondary)"
                        ></grampsjs-icon>
                      </md-icon-button>
                      <grampsjs-tooltip for="btn-cancel-note"
                        >${this._('Cancel')}</grampsjs-tooltip
                      >
                    `
                  : html`
                      <md-icon-button
                        id="btn-edit-note"
                        class="edit"
                        aria-label="${this._('Edit Note')}"
                        @click="${this._handleEditNote}"
                      >
                        <grampsjs-icon
                          path="${mdiPencil}"
                          color="var(--mdc-theme-secondary)"
                        ></grampsjs-icon>
                      </md-icon-button>
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
              <md-icon-button
                id="btn-edit-gallery"
                class="edit"
                aria-label="${this._('Edit')}"
                @click="${this._handleEditGallery}"
              >
                <grampsjs-icon
                  path="${this._editingGallery ? mdiPencilOff : mdiPencil}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
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

  // The editor stays open until the save succeeded and the task is reloaded
  async _handleSaveNote() {
    const editor = this.renderRoot.querySelector('grampsjs-editor')
    const text = editor.data
    const type = 'To Do'
    let data = null
    if (this.source.note_list.length > 0) {
      data = {...this.source.extended.notes[0], text, type}
    } else if (text.string.trim() !== '') {
      data = {text, type}
    }
    if (data !== null) {
      this._savingNote = true
      const saved = await this.saveNote(data)
      this._savingNote = false
      // Keep editing if the save failed or the text changed in the meantime
      if (!saved || editor.data !== text) {
        return
      }
    }
    editor.discardDraft()
    this._editingNote = false
  }

  _handleCancelNote() {
    this.renderRoot.querySelector('grampsjs-editor').discardDraft()
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
        dialogTitle="${this._('Add Tag')}"
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
