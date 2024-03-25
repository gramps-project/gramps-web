import {html} from 'lit'

import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEditName.js'
import './GrampsjsObjectForm.js'
import './GrampsjsName.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'

export class GrampsjsNames extends GrampsjsEditableList {
  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      dialogContent: {type: String},
      dialogTitle: {type: String},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.dialogContent = ''
    this.dialogTitle = ''
    this.hasEdit = true
  }

  row(obj) {
    return html` ${!obj
      ? ''
      : html`
          <mwc-list-item style="height: auto">
            <grampsjs-name
              .strings="${this.strings}"
              .data="${obj}"
            ></grampsjs-name>
          </mwc-list-item>
        `}`
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-name
        id="name"
        @object:save="${this._handleNameAdd}"
        @object:cancel="${this._handleNameCancel}"
        .strings="${this.strings}"
      >
      </grampsjs-form-edit-name>
    `
  }

  _handleDelete() {
    const handle = this._selectedIndex
    this.dialogContent = html`
      <mwc-dialog
        open
        @closed="${e => this._handleDialog(handle, e)}"
        heading="${this._('Are you sure?')}"
      >
        <div>${this._('This action cannot be undone.')}</div>
        <mwc-button slot="primaryAction" dialogAction="confirm">
          ${this._('Yes')}
        </mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="cancel">
          ${this._('Cancel')}
        </mwc-button>
      </mwc-dialog>
    `
  }

  _handleEdit() {
    const handle = this._selectedIndex
    this.dialogContent = html`
      <grampsjs-form-edit-name
        id="name"
        @object:save="${e => this._handleNameSave(handle, e)}"
        @object:cancel="${this._handleNameCancel}"
        .strings="${this.strings}"
        .data="${this.data[handle]}"
      >
      </grampsjs-form-edit-name>
    `
  }

  _handleDialog(handle, e) {
    if (e.detail.action === 'confirm') {
      this._handleNameDelete(handle, e)
    } else if (e.detail.action === 'cancel') {
      this._handleNameCancel()
    }
  }

  _handleNameAdd(e) {
    fireEvent(this, 'edit:action', {action: 'addName', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNameDelete(handle, e) {
    fireEvent(this, 'edit:action', {
      action: 'delName',
      data: {index: handle},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNameSave(handle, e) {
    fireEvent(this, 'edit:action', {
      action: 'updateName',
      data: {index: handle, name: e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNameCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-names', GrampsjsNames)
