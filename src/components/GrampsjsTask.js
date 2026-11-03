import {html, css, LitElement, nothing} from 'lit'
import {mdiCheck, mdiClose, mdiContentSave, mdiDelete, mdiPencil} from '@mdi/js'
import {
  PRIORITY_ICONS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  priorityLabel,
  statusIcon,
  taskAttribute,
  taskNote,
} from '../taskConstants.js'
import {sharedStyles} from '../SharedStyles.js'

import '@material/web/button/text-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/select/outlined-select.js'
import '@material/web/select/select-option.js'

import './GrampsjsEditableTitle.js'
import './GrampsjsEditor.js'
import './GrampsjsFormNewTag.js'
import './GrampsjsIcon.js'
import './GrampsjsImg.js'
import './GrampsjsGallery.js'
import './GrampsjsTags.js'
import './GrampsjsTooltip.js'
import './GrampsjsNoteContent.js'
import './GrampsjsConnectedNote.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, objectIconPath} from '../util.js'

// A task, edited in place by editors. Empty sections are hidden from
// viewers; editors see their headings with the button that fills them.
export class GrampsjsTask extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .page-actions {
          display: flex;
          gap: 4px;
          margin-top: -8px;
        }

        .dropdowns {
          margin-top: 36px;
        }

        .dropdowns md-outlined-select {
          margin-right: 12px;
          margin-bottom: 18px;
        }

        .properties {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 32px;
          margin-top: 16px;
        }

        .property {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .property .label {
          color: var(--grampsjs-body-font-color-60);
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2em;
          margin-bottom: 12px;
        }

        .section-heading h3 {
          margin: 0;
        }

        .controls {
          margin: 0.7em 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      source: {type: Object},
      saveNote: {attribute: false},
      _editingNote: {type: Boolean},
      _savingNote: {type: Boolean},
      _editingGallery: {type: Boolean},
      _showDeleteDialog: {type: Boolean},
      _dialogContent: {type: String},
    }
  }

  constructor() {
    super()
    this.source = {}
    // Saves the note data; resolves to whether the save succeeded
    this.saveNote = async () => false
    this._editingNote = false
    this._savingNote = false
    this._editingGallery = false
    this._showDeleteDialog = false
    this._dialogContent = ''
  }

  get canEdit() {
    return this.appState.permissions.canEdit
  }

  render() {
    if (Object.keys(this.source).length === 0) {
      return html``
    }
    return html`
      <h2>
        <grampsjs-editable-title
          .value="${this.source.title}"
          prop="title"
          required
          ?editable="${this.canEdit}"
          .appState="${this.appState}"
        ></grampsjs-editable-title>
      </h2>
      ${this.canEdit ? this._renderPageActions() : ''}
      ${this.canEdit ? this._renderDropdowns() : this._renderProperties()}
      ${this._renderDescription()} ${this._renderAttachments()}
      ${this._renderTags()} ${this._renderDeleteDialog()} ${this._dialogContent}
    `
  }

  _renderPageActions() {
    return html`
      <div class="page-actions">
        <md-icon-button
          id="btn-source"
          href="/source/${this.source.gramps_id}"
          aria-label="${this._('Edit Source')}"
        >
          <grampsjs-icon
            path="${objectIconPath.source}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="btn-source" .appState="${this.appState}"
          >${this._('Edit Source')}</grampsjs-tooltip
        >
        <md-icon-button
          id="btn-delete"
          aria-label="${this._('_Delete')}"
          @click="${() => {
            this._showDeleteDialog = true
          }}"
        >
          <grampsjs-icon
            path="${mdiDelete}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="btn-delete" .appState="${this.appState}"
          >${this._('_Delete')}</grampsjs-tooltip
        >
      </div>
    `
  }

  _renderDeleteDialog() {
    if (!this._showDeleteDialog) {
      return ''
    }
    const close = () => {
      this._showDeleteDialog = false
    }
    return html`
      <md-dialog open @cancel="${close}" @close="${close}">
        <div slot="content">${this._('Delete this object?')}</div>
        <div slot="actions">
          <md-text-button @click="${close}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button
            @click="${() => {
              close()
              fireEvent(this, 'task:delete')
            }}"
          >
            ${this._('_Delete')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  // a task can have a status outside TASK_STATUSES, e.g. from Gramps
  // desktop, which the select shows as well
  _renderDropdowns() {
    const status = this._status
    const statuses =
      status && !TASK_STATUSES.includes(status)
        ? [...TASK_STATUSES, status]
        : TASK_STATUSES
    const priority = priorityLabel(this._priority)
    return html`
      <p class="dropdowns">
        <md-outlined-select
          label="${this._('Status')}"
          id="select-status"
          @change="${this._handleStatusChange}"
        >
          ${status
            ? this._renderIcon(
                statusIcon(status, {solid: true}),
                'leading-icon'
              )
            : ''}
          ${statuses.map(
            value => html`
              <md-select-option
                value="${value}"
                ?selected="${status === value}"
              >
                ${this._renderIcon(statusIcon(value, {solid: true}), 'start')}
                <div slot="headline">${this._(value)}</div>
              </md-select-option>
            `
          )}
        </md-outlined-select>
        <md-outlined-select
          label="${this._('Priority')}"
          id="select-priority"
          @change="${this._handlePrioChange}"
        >
          ${priority
            ? this._renderIcon(PRIORITY_ICONS[priority], 'leading-icon')
            : ''}
          ${TASK_PRIORITIES.map(
            ({label, value}) => html`
              <md-select-option
                value="${value}"
                ?selected="${priority === label}"
              >
                ${this._renderIcon(PRIORITY_ICONS[label], 'start')}
                <div slot="headline">${this._(label)}</div>
              </md-select-option>
            `
          )}
        </md-outlined-select>
      </p>
    `
  }

  // status and priority as text, for viewers
  _renderProperties() {
    const status = this._status
    const priority = priorityLabel(this._priority)
    return html`
      <div class="properties">
        ${status
          ? html`<span class="property">
              <span class="label">${this._('Status')}</span>
              ${this._renderIcon(statusIcon(status, {solid: true}))}
              ${this._(status)}
            </span>`
          : ''}
        ${priority
          ? html`<span class="property">
              <span class="label">${this._('Priority')}</span>
              ${this._renderIcon(PRIORITY_ICONS[priority])} ${this._(priority)}
            </span>`
          : ''}
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderIcon(icon, slot) {
    return html`<grampsjs-icon
      slot="${slot ?? nothing}"
      path="${icon.path}"
      color="${icon.color ?? nothing}"
      height="20"
      width="20"
    ></grampsjs-icon>`
  }

  // the heading of a section, with the button that starts editing it
  _renderHeading(label, id, editing, onEdit) {
    return html`
      <div class="section-heading">
        <h3>${label}</h3>
        ${this.canEdit && !editing
          ? html`
              <md-icon-button
                id="${id}"
                class="edit"
                aria-label="${this._('Edit')}"
                @click="${onEdit}"
              >
                <grampsjs-icon
                  path="${mdiPencil}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
              <grampsjs-tooltip for="${id}" .appState="${this.appState}"
                >${this._('Edit')}</grampsjs-tooltip
              >
            `
          : ''}
      </div>
    `
  }

  _renderDescription() {
    const note = taskNote(this.source)
    if (!note && !this.canEdit) {
      return ''
    }
    return html`
      ${this._renderHeading(
        this._('Description'),
        'btn-edit-note',
        this._editingNote,
        this._handleEditNote
      )}
      ${this._editingNote
        ? html`
            <grampsjs-editor
              id="task-note-editor"
              .initialData=${note?.text ?? {
                _class: 'StyledText',
                string: '',
                tags: [],
              }}
              .appState="${this.appState}"
            ></grampsjs-editor>
            <div class="controls">
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
              <grampsjs-tooltip for="btn-save-note" .appState="${this.appState}"
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
              <grampsjs-tooltip
                for="btn-cancel-note"
                .appState="${this.appState}"
                >${this._('Cancel')}</grampsjs-tooltip
              >
            </div>
          `
        : ''}
      ${note && !this._editingNote
        ? html`<grampsjs-connected-note
            handle="${note.handle}"
            .appState="${this.appState}"
          ></grampsjs-connected-note>`
        : ''}
    `
  }

  // media are added and removed right away, so editing ends with Done
  _renderAttachments() {
    const hasMedia = this.source?.media_list?.length > 0
    if (!hasMedia && !this.canEdit) {
      return ''
    }
    return html`
      ${this._renderHeading(
        this._('Attachments'),
        'btn-edit-gallery',
        this._editingGallery,
        this._handleEditGallery
      )}
      ${hasMedia || this._editingGallery
        ? html`
            <grampsjs-gallery
              ?edit="${this._editingGallery}"
              .appState="${this.appState}"
              .media=${this.source?.extended?.media}
              .mediaRef=${this.source?.media_list}
            ></grampsjs-gallery>
          `
        : ''}
      ${this._editingGallery
        ? html`
            <div class="controls">
              <md-icon-button
                id="btn-done-gallery"
                class="edit"
                aria-label="${this._('Done')}"
                @click="${this._handleEditGallery}"
              >
                <grampsjs-icon
                  path="${mdiCheck}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
              <grampsjs-tooltip
                for="btn-done-gallery"
                .appState="${this.appState}"
                >${this._('Done')}</grampsjs-tooltip
              >
            </div>
          `
        : ''}
    `
  }

  _renderTags() {
    const tags = (this.source?.extended?.tags ?? []).filter(
      tag => tag.name !== 'ToDo'
    )
    if (tags.length === 0 && !this.canEdit) {
      return ''
    }
    return html`
      <div class="section-heading"><h3>${this._('Tags')}</h3></div>
      <grampsjs-tags
        .data="${this.source?.extended?.tags}"
        .hideTags="${['ToDo']}"
        noHeading
        ?edit="${this.canEdit}"
        .appState="${this.appState}"
        @tag:new="${this._handleNewTag}"
      ></grampsjs-tags>
    `
  }

  get _status() {
    return taskAttribute(this.source, 'Status')
  }

  get _priority() {
    return taskAttribute(this.source, 'Priority')
  }

  _handleEditGallery() {
    this._editingGallery = !this._editingGallery
  }

  _handleEditNote() {
    this._editingNote = true
  }

  // The editor stays open until the save succeeded and the task is reloaded.
  // An existing note keeps its type; a new one is a To Do note with the tags
  // of the task, like the note of a new task.
  async _handleSaveNote() {
    const editor = this.renderRoot.querySelector('grampsjs-editor')
    const text = editor.data
    const note = taskNote(this.source)
    let data = null
    if (note) {
      data = {...note, text}
    } else if (text.string.trim() !== '') {
      data = {text, type: 'To Do', tag_list: this.source.tag_list ?? []}
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
    this._setAttribute('Status', `${e.target.value}`)
  }

  _handlePrioChange(e) {
    this._setAttribute('Priority', `${e.target.value}`)
  }

  _setAttribute(type, value) {
    const index = this.source.attribute_list.findIndex(att => att.type === type)
    if (this.source.attribute_list[index]?.value === value) {
      return
    }
    const data = {type, value}
    if (index === -1) {
      fireEvent(this, 'edit:action', {action: 'addAttribute', data})
    } else {
      fireEvent(this, 'edit:action', {action: 'updateAttribute', data, index})
    }
  }

  _handleCancelDialog() {
    this._dialogContent = ''
  }

  _handleNewTag() {
    this._dialogContent = html`
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
    this._dialogContent = ''
  }
}

window.customElements.define('grampsjs-task', GrampsjsTask)
