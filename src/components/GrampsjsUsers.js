import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-dialog'
import '@material/mwc-list/mwc-list-item'

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
    const dialog = this.shadowRoot.querySelector('mwc-dialog')
    if (dialog !== null) {
      dialog.open = true
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
      <mwc-dialog
        scrimClickAction=""
        escapeKeyAction=""
        open
        heading="${this._('Import user accounts')}"
      >
        <grampsjs-form-upload
          accept=".json"
          filename
          @formdata:changed="${this._handleUploadChanged}"
        ></grampsjs-form-upload>

        <mwc-button
          slot="primaryAction"
          dialogAction="ok"
          ?disabled="${this._userData.length === 0}"
          @click="${this._handleUpload}"
        >
          ${this._('Import')}
        </mwc-button>
        <mwc-button
          slot="secondaryAction"
          dialogAction="cancel"
          @click="${this._handleDialogCancel}"
        >
          ${this._('Cancel')}
        </mwc-button>
      </mwc-dialog>
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
  }

  _handleDialogCancel() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    uploadForm.reset()
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
    URL.revokeObjectURL(this._downloadUrl)
    this._downloadUrl = ''
  }

  _editUserDialog(username) {
    const [user] = this.data.filter(el => el.name === username)
    return html`
      <mwc-dialog
        scrimClickAction=""
        escapeKeyAction=""
        open
        heading="${this._('Edit user')} &ndash; ${username}"
      >
        <grampsjs-form-user
          .data="${user}"
          .appState="${this.appState}"
          ?ismulti="${this.ismulti}"
        ></grampsjs-form-user>
        <mwc-button
          slot="primaryAction"
          dialogAction="ok"
          @click="${this._handleSave}"
        >
          ${this._('_Save')}
        </mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="cancel">
          ${this._('Cancel')}
        </mwc-button>
      </mwc-dialog>
    `
  }

  _deleteUserDialog(username) {
    return html`
      <mwc-dialog scrimClickAction="" escapeKeyAction="" open>
        <div>
          ${this._('Do you really want to delete user "%s"?', username)}
        </div>
        <div>${this._('This action cannot be undone.')}</div>
        <mwc-button
          slot="primaryAction"
          dialogAction="delete"
          @click="${() => this._handleDelete(username)}"
        >
          ${this._('_Delete')}
        </mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="cancel">
          ${this._('Cancel')}
        </mwc-button>
      </mwc-dialog>
    `
  }

  _addUserDialog() {
    return html`
      <mwc-dialog
        scrimClickAction=""
        escapeKeyAction=""
        open
        heading="${this._('Add a new user')}"
      >
        <grampsjs-form-user
          newUser
          .appState="${this.appState}"
          ?ismulti="${this.ismulti}"
        ></grampsjs-form-user>
        <mwc-button
          slot="primaryAction"
          dialogAction="ok"
          @click="${this._handleSave}"
        >
          ${this._('_Save')}
        </mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="cancel">
          ${this._('Cancel')}
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

  _handleDelete(username) {
    fireEvent(this, 'user:deleted', username)
  }

  updated(changed) {
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
  }
}

window.customElements.define('grampsjs-users', GrampsjsUsers)
