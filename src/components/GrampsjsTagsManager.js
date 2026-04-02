import {html, css} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/button/filled-button'
import '@material/web/iconbutton/icon-button.js'
import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js'
import {mdiPencil, mdiDelete} from '@mdi/js'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import './GrampsjsIcon.js'
import './GrampsjsFormString.js'
import {fireEvent} from '../util.js'
import {colorToCss, colorForPicker} from '../color.js'

export class GrampsjsTagsManager extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
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

        md-icon-button {
          --md-icon-button-icon-size: 20px;
          --md-icon-button-state-layer-height: 36px;
          --md-icon-button-state-layer-width: 36px;
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
      _dialogMode: {type: String},
      _editingTag: {type: Object},
      _editName: {type: String},
      _editColor: {type: String},
    }
  }

  constructor() {
    super()
    this._dialogMode = null
    this._editingTag = null
    this._editName = ''
    this._editColor = '#1f77b4'
  }

  render() {
    return html`
      ${this.data.length
        ? html`
            <table style="width: 100%">
              <thead>
                <tr>
                  <th>${this._('Tags')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${this.data.map(
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
                          <md-icon-button
                            aria-label="${this._('Edit')}"
                            @click="${() => this._openEdit(tag)}"
                          >
                            <grampsjs-icon
                              path="${mdiPencil}"
                              color="var(--mdc-theme-secondary)"
                            ></grampsjs-icon>
                          </md-icon-button>
                          <md-icon-button
                            aria-label="${this._('Delete')}"
                            @click="${() => this._openDelete(tag)}"
                          >
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
          `
        : ''}
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
            ?disabled="${!this._editName}"
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
          <md-filled-button @click="${this._handleDelete}">
            ${this._('Delete')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  openCreate() {
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

  _handleSave() {
    if (!this._editName) return
    if (this._dialogMode === 'create') {
      fireEvent(this, 'tag:save', {
        tag: {_class: 'Tag', name: this._editName, color: this._editColor},
        isNew: true,
      })
    } else if (this._dialogMode === 'edit' && this._editingTag) {
      fireEvent(this, 'tag:save', {
        tag: {
          ...this._editingTag,
          name: this._editName,
          color: this._editColor,
        },
        isNew: false,
      })
    }
    this._closeDialog()
  }

  _handleDelete() {
    if (!this._editingTag) return
    fireEvent(this, 'tag:delete', {handle: this._editingTag.handle})
    this._closeDialog()
  }
}

window.customElements.define('grampsjs-tags-manager', GrampsjsTagsManager)
