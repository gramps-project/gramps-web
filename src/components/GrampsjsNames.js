import {css, html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEditName.js'
import './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

export class GrampsjsNames extends GrampsjsEditableTable {
  static get styles () {
    return [
      super.styles,
      css`
      tr:hover td {
        background-color: #ffffff;
        cursor: auto;
      }
    `]
  }

  constructor () {
    super()
    this.objType = 'Name'
    this._columns = ['', 'Title', 'Given name', 'Surname', 'Suffix', 'Call name', 'Nickname', '']
  }

  row (obj, i, arr) {
    return html`
      <tr>
        <th><span>${i === 0 ? this._('Primary') : ''}</span></th>
        <td>${obj.title}</td>
        <td>${obj.first_name}</td>
        <td>${obj.surname_list.map(surname => html` ${surname.prefix} ${surname.surname}`)}</td>
        <td>${obj.suffix}</td>
        <td>${obj.call}</td>
        <td>${obj.nick}</td>
        <td>${this.edit
    ? this._renderActionBtns(i, i === 0, i === arr.length - 1, false, false)
    : ''}</td>

      </tr>
    `
  }

  renderAfterTable () {
    return this.edit
      ? html`
      <mwc-icon-button
        class="edit large"
        icon="add_circle"
        @click="${this._handleAddClick}"
      ></mwc-icon-button>
      ${this.dialogContent}
    `
      : ''
  }

  _handleAddClick () {
    this.dialogContent = html`
    <grampsjs-form-edit-name
      id="name"
      @object:save="${this._handleNameSave}"
      @object:cancel="${this._handleNameCancel}"
      .strings="${this.strings}"
    >
    </grampsjs-form-edit-name>
    `
  }

  _handleNameSave (e) {
    fireEvent(this, 'edit:action', {action: 'addName', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNameCancel () {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-names', GrampsjsNames)
