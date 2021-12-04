import {css, html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEventRef.js'
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
    this._columns = ['', 'Title', 'Given name', 'Surname', 'Suffix', '']
  }

  row (obj, i, arr) {
    return html`
      <tr>
        <th><span>${i === 0 ? this._('Primary') : ''}</span></th>
        <td>${obj.title}</td>
        <td>${obj.first_name}</td>
        <td>${obj.surname_list.map(surname => html` ${surname.prefix} ${surname.surname}`)}</td>
        <td>${obj.suffix}</td>
        <td>${this.edit
    ? this._renderActionBtns(obj.handle, i === 0, i === arr.length - 1)
    : ''}</td>

      </tr>
    `
  }

  // renderAfterTable () {
  //   return this.edit
  //     ? html`
  //     <mwc-icon-button
  //       class="edit large"
  //       icon="add_circle"
  //       @click="${this._handleAddClick}"
  //     ></mwc-icon-button>
  //     ${this.dialogContent}
  //   `
  //     : ''
  // }

  // _handleAddClick () {
  //   this.dialogContent = html`
  //   <grampsjs-form-eventref
  //     new
  //     @object:save="${this._handleEventRefSave}"
  //     @object:cancel="${this._handleEventRefCancel}"
  //     .strings="${this.strings}"
  //     objType="${this.objType}"
  //     dialogTitle = ${this._('Share an existing event')}
  //   >
  //   </grampsjs-form-eventref>
  //   `
  // }

  // _handleEventRefSave (e) {
  //   fireEvent(this, 'edit:action', {action: 'addEventRef', data: e.detail.data})
  //   e.preventDefault()
  //   e.stopPropagation()
  //   this.dialogContent = ''
  // }

  // _handleEventRefCancel () {
  //   this.dialogContent = ''
  // }
}

window.customElements.define('grampsjs-names', GrampsjsNames)
