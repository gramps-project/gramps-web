import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-dialog'
import '@material/mwc-list/mwc-list-item'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {userRoles} from './GrampsjsFormUser.js'
import {fireEvent} from '../util.js'
import {apiGet} from '../api.js'

import './GrampsjsTooltip.js'

export class GrampsjsUsers extends GrampsjsTableBase {
  static get properties() {
    return {
      dialogContent: {type: String},
      _downloadUrl: {type: String},
    }
  }

  constructor() {
    super()
    this.dialogContent = ''
    this._downloadUrl = ''
  }

  render() {
    if (this.data.length === 0) {
      return html``
    }
    return html`
      ${this._renderButtons()}
      <table>
        <tr>
          <th>${this._('Username: ').replace(':', '')}</th>
          <th>${this._('Full Name')}</th>
          <th>${this._('E-mail')}</th>
          <th>${this._('Role')}</th>
          <th></th>
        </tr>
        ${this.data.map(
          (obj, index) => html`
            <tr>
              <td>${obj.name}</td>
              <td>${obj.full_name}</td>
              <td>${obj.email}</td>
              <td>${this._(userRoles[obj.role])}</td>
              <td>
                <mwc-icon-button
                  class="edit"
                  icon="edit"
                  @click="${e => this._handleEditClick(e, obj.name)}"
                  id="button-edit-${index}"
                ></mwc-icon-button>
                <grampsjs-tooltip for="button-edit-${index}">
                  ${this._('Edit user')}
                </grampsjs-tooltip>
              </td>
            </tr>
          `
        )}
      </table>
      ${this.dialogContent}
    `
  }

  _renderButtons() {
    return html`
      <p>
        <mwc-icon-button
          class="edit"
          icon="person_add"
          @click="${this._handleAddClick}"
          id="button-add"
        ></mwc-icon-button>
        <grampsjs-tooltip for="button-add">
          ${this._('Add a new user')}
        </grampsjs-tooltip>

        <mwc-icon-button
          class="edit"
          icon="file_download"
          id="button-export"
          @click="${this._handleExportClick}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="button-export">
          ${this._('Export user details')}
        </grampsjs-tooltip>
        <a
          download="grampsweb-export-users.json"
          href="${this._downloadUrl}"
          id="downloadanchor"
          >&nbsp;</a
        >
      </p>
    `
  }

  _handleEditClick(e, username) {
    this.dialogContent = this._editUserDialog(username)
    this._openDialog()
  }

  _handleAddClick() {
    this.dialogContent = this._addUserDialog()
    this._openDialog()
  }

  _openDialog() {
    const dialog = this.shadowRoot.querySelector('mwc-dialog')
    if (dialog !== null) {
      dialog.open = true
    }
  }

  _handleImportClick() {
    this.dialogContent = this._importUsersDialog()
    this._openDialog()
  }

  async _handleExportClick() {
    this._downloadUrl = ''
    const data = await apiGet('/api/users/')
    const blob = new Blob([JSON.stringify(data.data)], {
      type: 'application/json',
    })
    this._downloadUrl = URL.createObjectURL(blob)
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
    URL.revokeObjectURL(this._downloadUrl)
    this._downloadUrl = ''
  }

  _editUserDialog(username) {
    const [user] = this.data.filter(el => el.name === username)
    return html`
      <mwc-dialog open heading="${this._('Edit user')} &ndash; ${username}">
        <grampsjs-form-user
          .data="${user}"
          .strings="${this.strings}"
        ></grampsjs-form-user>
        <mwc-button
          slot="primaryAction"
          dialogAction="ok"
          @click="${this._handleSave}"
        >
          ${this._('_Save')}
        </mwc-button>
      </mwc-dialog>
    `
  }

  _addUserDialog() {
    return html`
      <mwc-dialog open heading="${this._('Add a new user')}">
        <grampsjs-form-user
          newUser
          .strings="${this.strings}"
        ></grampsjs-form-user>
        <mwc-button
          slot="primaryAction"
          dialogAction="ok"
          @click="${this._handleSave}"
        >
          ${this._('_Save')}
        </mwc-button>
      </mwc-dialog>
    `
  }

  _handleSave() {
    const form = this.shadowRoot.querySelector('grampsjs-form-user')
    if (form !== null) {
      const existingUser = this.data
        .map(user => user.name)
        .includes(form.data.name)
      fireEvent(this, existingUser ? 'user:updated' : 'user:added', form.data)
      this.dialogContent = ''
    }
  }

  updated(changed) {
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
  }
}

window.customElements.define('grampsjs-users', GrampsjsUsers)
