import {html} from 'lit'

import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

import {fireEvent} from '../util.js'
import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormEditPlaceName.js'

export class GrampsjsPlaceNames extends GrampsjsEditableTable {
  static get properties() {
    return {
      profile: {type: Array},
    }
  }

  constructor() {
    super()
    this.objType = 'PlaceName'
    this._columns = ['Name', 'Date', '']
    this.dialogContent = ''
    this.edit = false
    this.profile = []
  }

  row(obj, i) {
    return html`
      <tr>
        <td @click="${() => this.edit && this._handleEditClick(obj)}">
          ${obj.value}
        </td>
        <td @click="${() => this.edit && this._handleEditClick(obj)}">
          ${this.profile[i].date_str ?? ''}
        </td>
        <td>${this.edit ? this._renderActionBtns(i, true) : ''}</td>
      </tr>
    `
  }

  renderAfterTable() {
    return html`
      ${this.edit
        ? html`
            <mwc-icon-button
              class="edit large"
              icon="add_circle"
              @click="${this._handleAdd}"
            ></mwc-icon-button>
          `
        : ''}
      ${this.dialogContent}
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-placename
        new
        @object:save="${this._handlePlaceNameAdd}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .strings="${this.strings}"
        ?showDateInput=${true}
      >
      </grampsjs-form-edit-placename>
    `
  }

  _handleEditClick(obj) {
    this.dialogContent = html`
      <grampsjs-form-edit-placename
        @object:save="${e => this._handlePlaceNameUpdate(e, obj)}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .strings="${this.strings}"
        .data="${obj}"
        ?showDateInput=${true}
      >
      </grampsjs-form-edit-placename>
    `
  }

  _handlePlaceNameAdd(e) {
    fireEvent(this, 'edit:action', {
      action: 'addPlaceName',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handlePlaceNameUpdate(e, originalObj) {
    const updatedData = {...originalObj, ...e.detail.data}
    fireEvent(this, 'edit:action', {
      action: 'updatePlaceName',
      data: updatedData,
      index: this.data.indexOf(originalObj),
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _renderActionBtns(index) {
    return html`
      <mwc-icon-button
        class="edit"
        icon="delete"
        @click="${e => this._handleActionClick(e, 'delPlaceName', index)}"
      ></mwc-icon-button>
    `
  }

  _handleActionClick(e, action, index) {
    fireEvent(this, 'edit:action', {action, index})
    e.preventDefault()
    e.stopPropagation()
  }
}

window.customElements.define('grampsjs-place-names', GrampsjsPlaceNames)
