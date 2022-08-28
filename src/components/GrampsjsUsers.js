import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-dialog'
import '@material/mwc-list/mwc-list-item'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {userRoles} from './GrampsjsFormUser.js'
import {fireEvent} from '../util.js'

export class GrampsjsUsers extends GrampsjsTableBase {
  static get properties () {
    return {
      dialogContent: {type: String}
    }
  }

  constructor () {
    super()
    this.dialogContent = ''
  }

  render () {
    if (this.data.length === 0) {
      return html``
    }
    return html`
    <table>
      <tr>
       <th>${this._('Username: ').replace(':', '')}</th>
       <th>${this._('Full Name')}</th>
       <th>${this._('E-mail')}</th>
       <th>${this._('Role')}</th>
       <th></th>
      </tr>
    ${this.data.map((obj) => html`
      <tr>
        <td>${obj.name}</td>
        <td>${obj.full_name}</td>
        <td>${obj.email}</td>
        <td>${userRoles[obj.role]}</td>
        <td>
          <mwc-icon-button
            class="edit"
            icon="edit"
            @click="${(e) => this._handleEditClick(e, obj.name)}"
          ></mwc-icon-button>
        </td>

      </tr>
    `)}
    </table>

    <mwc-icon-button
      class="edit"
      icon="add_circle"
      @click="${this._handleAddClick}"
    ></mwc-icon-button>

    ${this.dialogContent}
    `
  }

  _handleEditClick (e, username) {
    this.dialogContent = this._editUserDialog(username)
    this._openDialog()
  }

  _handleAddClick () {
    this.dialogContent = this._addUserDialog()
    this._openDialog()
  }

  _openDialog () {
    const dialog = this.shadowRoot.querySelector('mwc-dialog')
    if (dialog !== null) {
      dialog.open = true
    }
  }

  _editUserDialog (username) {
    const [user] = this.data.filter(el => el.name === username)
    return html`
    <mwc-dialog open>
      <grampsjs-form-user
        .data="${user}"
      ></grampsjs-form-user>
      <mwc-button slot="primaryAction" dialogAction="ok" @click="${this._handleSave}">
        ${this._('_Save')}
      </mwc-button>
    </mwc-dialog>
    `
  }

  _addUserDialog () {
    return html`
    <mwc-dialog open>
      <grampsjs-form-user
        newUser
      ></grampsjs-form-user>
      <mwc-button slot="primaryAction" dialogAction="ok" @click="${this._handleSave}">
        ${this._('_Save')}
      </mwc-button>
    </mwc-dialog>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderDialog () {
    return html`
    `
  }

  _handleSave () {
    const form = this.shadowRoot.querySelector('grampsjs-form-user')
    if (form !== null) {
      const existingUser = this.data.map(user => user.name).includes(form.data.name)
      fireEvent(this, existingUser ? 'user:updated' : 'user:added', form.data)
      this.dialogContent = ''
    }
  }
}

window.customElements.define('grampsjs-users', GrampsjsUsers)
