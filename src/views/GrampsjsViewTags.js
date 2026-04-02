/*
View for managing tags: create, edit (name, color), delete
Only accessible to users with edit permission
*/

import {html, css} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/button/filled-button'
import '@material/web/fab/fab'
import '@material/web/iconbutton/icon-button'
import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js'
import {mdiPencil, mdiDelete, mdiPlus} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsFormString.js'
import {makeHandle, fireEvent} from '../util.js'
import {colorToCss, colorForPicker} from '../color.js'

export class GrampsjsViewTags extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 20px;
        }

        th {
          padding: 12px 20px;
          font-size: 13px;
          color: var(--grampsjs-body-font-color-60);
          font-weight: 400;
          text-align: left;
          border-bottom: 1px solid var(--grampsjs-body-font-color-10);
        }

        td {
          padding: 8px 20px;
          border-bottom: 1px solid var(--grampsjs-body-font-color-10);
          vertical-align: middle;
        }

        .tag-chip {
          display: inline-block;
          border-radius: var(--md-sys-shape-corner-small, 8px);
          padding: 4px 12px;
          font-size: 14px;
          border: 1px solid var(--tag-color);
          color: var(--tag-color);
          background-color: var(--tag-color-bg);
        }

        .actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
          align-items: center;
        }

        .color-swatch {
          width: 16px;
          height: 16px;
          border-radius: var(--md-sys-shape-corner-extra-small, 4px);
          flex-shrink: 0;
        }

        md-icon-button {
          --md-icon-button-icon-size: 20px;
          --md-icon-button-state-layer-height: 36px;
          --md-icon-button-state-layer-width: 36px;
        }

        md-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }

        .dialog-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .dialog-row grampsjs-form-string {
          flex: 1;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _tags: {type: Array},
      _dialogMode: {type: String},
      _editingTag: {type: Object},
      _editName: {type: String},
      _editColor: {type: String},
      _saving: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._tags = []
    this._dialogMode = null
    this._editingTag = null
    this._editName = ''
    this._editColor = '#1f77b4'
    this._saving = false
  }

  renderContent() {
    return html`
      <h2>${this._('Organize Tags')}</h2>
      <table>
        <thead>
          <tr>
            <th>${this._('Tags')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this._tags.map(
            tag => html`
              <tr>
                <td>
                  <span
                    class="tag-chip"
                    style="
                      --tag-color: ${colorToCss(tag.color, 0.9)};
                      --tag-color-bg: ${colorToCss(tag.color, 0.12)};
                    "
                    >${tag.name}</span
                  >
                </td>
                <td>
                  <div class="actions">
                    <md-icon-button @click="${() => this._openEdit(tag)}">
                      <grampsjs-icon
                        path="${mdiPencil}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>
                    <div
                      class="color-swatch"
                      style="background-color:${colorToCss(tag.color, 0.9)}"
                    ></div>
                    <md-icon-button @click="${() => this._openDelete(tag)}">
                      <grampsjs-icon
                        path="${mdiDelete}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>
                  </div>
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>

      <md-fab variant="secondary" @click="${this._openCreate}">
        <grampsjs-icon
          slot="icon"
          .path="${mdiPlus}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>

      ${this._renderEditDialog()} ${this._renderDeleteDialog()}
    `
  }

  _renderEditDialog() {
    const isCreate = this._dialogMode === 'create'
    const isEdit = this._dialogMode === 'edit'
    if (!isCreate && !isEdit) return ''
    return html`
      <md-dialog ?open="${true}" @closed="${this._handleDialogClosed}">
        <span slot="headline">
          ${isCreate ? this._('Add Tag') : this._('Edit Tag')}
        </span>
        <div slot="content">
          <div class="dialog-row">
            <grampsjs-form-string
              fullwidth
              label="${this._('Tag Name:').replace(':', '')}"
              value="${this._editName}"
              @formdata:changed="${this._handleNameChange}"
              .appState="${this.appState}"
            ></grampsjs-form-string>
            <wa-color-picker
              format="hex"
              value="${this._editColor}"
              swatches="#1f77b4;#ff7f0e;#2ca02c;#d62728;#9467bd;#8c564b;#e377c2;#7f7f7f;#bcbd22;#17becf"
              @change="${this._handleColorChange}"
            ></wa-color-picker>
          </div>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._closeDialog}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${!this._editName || this._saving}"
            @click="${this._handleSave}"
          >
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _renderDeleteDialog() {
    if (this._dialogMode !== 'delete') return ''
    return html`
      <md-dialog ?open="${true}" @closed="${this._handleDialogClosed}">
        <span slot="headline">${this._('Delete Tag')}</span>
        <div slot="content">${this._('Delete this object?')}</div>
        <div slot="actions">
          <md-text-button @click="${this._closeDialog}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${this._saving}"
            @click="${this._handleDelete}"
          >
            ${this._('Delete')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _openCreate() {
    this._editName = ''
    this._editColor = '#1f77b4'
    this._editingTag = null
    this._dialogMode = 'create'
  }

  _openEdit(tag) {
    this._editingTag = tag
    this._editName = tag.name
    this._editColor = colorForPicker(tag.color)
    this._dialogMode = 'edit'
  }

  _openDelete(tag) {
    this._editingTag = tag
    this._dialogMode = 'delete'
  }

  _closeDialog() {
    this._dialogMode = null
    this._editingTag = null
  }

  _handleDialogClosed() {
    this._dialogMode = null
    this._editingTag = null
  }

  _handleNameChange(e) {
    this._editName = e.detail.data
  }

  _handleColorChange(e) {
    this._editColor = e.target.value
  }

  async _handleSave() {
    if (this._saving || !this._editName) return
    this._saving = true
    try {
      if (this._dialogMode === 'create') {
        const obj = {
          _class: 'Tag',
          handle: makeHandle(),
          name: this._editName,
          color: this._editColor,
        }
        await this.appState.apiPost('/api/tags/', obj)
      } else if (this._dialogMode === 'edit' && this._editingTag) {
        const obj = {
          ...this._editingTag,
          name: this._editName,
          color: this._editColor,
        }
        await this.appState.apiPut(`/api/tags/${this._editingTag.handle}`, obj)
      }
      fireEvent(this, 'db:changed')
      this._closeDialog()
      this._fetchData()
    } finally {
      this._saving = false
    }
  }

  async _handleDelete() {
    if (this._saving || !this._editingTag) return
    this._saving = true
    try {
      await this.appState.apiDelete(`/api/tags/${this._editingTag.handle}`)
      fireEvent(this, 'db:changed')
      this._closeDialog()
      this._fetchData()
    } finally {
      this._saving = false
    }
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchData()
  }

  async _fetchData() {
    this.loading = true
    const data = await this.appState.apiGet(
      `/api/tags/?locale=${this.appState.i18n.lang || 'en'}&pagesize=500`
    )
    if ('data' in data) {
      this.error = false
      this._tags = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
    this.loading = false
  }
}

window.customElements.define('grampsjs-view-tags', GrampsjsViewTags)
