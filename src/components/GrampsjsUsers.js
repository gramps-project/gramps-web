import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {userRoles} from './GrampsjsFormUser.js'
import {fireEvent} from '../util.js'

import './GrampsjsTooltip.js'

export class GrampsjsUsers extends GrampsjsTableBase {
  static get properties() {
    return {
      dialogContent: {type: String},
      ismulti: {type: Boolean},
      _downloadUrl: {type: String},
      _userData: {type: Array},
    }
  }

  constructor() {
    super()
    this.dialogContent = ''
    this.ismulti = false
    this._downloadUrl = ''
    this._userData = []
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
          <th>${this._('Account Source')}</th>
          <th></th>
        </tr>
        ${this.data.map(
          (obj, index) => html`
            <tr>
              <td>${obj.name}</td>
              <td>${obj.full_name}</td>
              <td>${obj.email}</td>
              <td>${this._(userRoles[obj.role])}</td>
              <td>${obj.account_source || this._('Password')}</td>
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
                <mwc-icon-button
                  class="error"
                  icon="delete_forever"
                  @click="${e => this._handleDeleteClick(e, obj.name)}"
                  id="button-del-${index}"
                ></mwc-icon-button>
                <grampsjs-tooltip for="button-del-${index}">
                  ${this._('Delete user')}
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
          icon="group_add"
          id="button-import"
          @click="${this._handleImportClick}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="button-import">
          ${this._('Import user accounts')}
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

  _handleDeleteClick(e, username) {
    this.dialogContent = this._deleteUserDialog(username)
    this._openDialog()
  }

  _handleAddClick() {
    this.dialogContent = this._addUserDialog()
    this._openDialog()
  }

  _openDialog() {
    const dialog = this.shadowRoot.querySelector('md-dialog')
    if (dialog !== null) {
      dialog.show()
    }
  }

  _handleImportClick() {
    this._userData = []
    this.dialogContent = this._importUsersDialog()
    this._openDialog()
  }

  async _handleExportClick() {
    this._downloadUrl = ''
    const blob = new Blob([JSON.stringify(this.data)], {
      type: 'application/json',
    })
    this._downloadUrl = URL.createObjectURL(blob)
  }

  _importUsersDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Import user accounts')}</span>
        <div slot="content">
          <grampsjs-form-upload
            accept=".json"
            filename
            @formdata:changed="${this._handleUploadChanged}"
          ></grampsjs-form-upload>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleDialogCancel}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${this._userData.length === 0}"
            @click="${this._handleUpload}"
          >
            ${this._('Import')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  async _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    try {
      const data = await uploadForm.readAsJson()
      this._processUserData(data)
    } catch {
      uploadForm.reset()
      fireEvent(this, 'grampsjs:error', {
        message: this._('Error parsing JSON file'),
      })
      return
    }
    this.dialogContent = this._importUsersDialog()
  }

  _processUserData(data) {
    const processedData = data
      .map(user => ({
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      }))
      .filter(user => !!user.name)
    this._userData = processedData
  }

  async _handleUpload() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    fireEvent(this, 'user:added-multiple', this._userData)
    uploadForm.reset()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    uploadForm.reset()
    this.dialogContent = ''
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
    URL.revokeObjectURL(this._downloadUrl)
    this._downloadUrl = ''
  }

  _editUserDialog(username) {
    const [user] = this.data.filter(el => el.name === username)
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Edit user')} &ndash; ${username}</span>
        <div slot="content">
          <grampsjs-form-user
            .data="${user}"
            .appState="${this.appState}"
            ?ismulti="${this.ismulti}"
          ></grampsjs-form-user>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleSave}">
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _deleteUserDialog(username) {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <div slot="content">
          <div>
            ${this._('Do you really want to delete user "%s"?', username)}
          </div>
          <div>${this._('This action cannot be undone.')}</div>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button @click="${() => this._handleDelete(username)}">
            ${this._('_Delete')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _addUserDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Add a new user')}</span>
        <div slot="content">
          <grampsjs-form-user
            newUser
            .appState="${this.appState}"
            ?ismulti="${this.ismulti}"
          ></grampsjs-form-user>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleSave}">
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
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

  _handleDelete(username) {
    fireEvent(this, 'user:deleted', username)
    this.dialogContent = ''
  }

  updated(changed) {
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
  }
}

window.customElements.define('grampsjs-users', GrampsjsUsers)
