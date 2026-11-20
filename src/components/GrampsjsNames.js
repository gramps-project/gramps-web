import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import {
  fireEvent,
  objectIconPath,
  personDisplayName,
  typeString,
} from '../util.js'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditName.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsIcon.js'
import './GrampsjsName.js'
import './GrampsjsObjectForm.js'
import './GrampsjsRefDetails.js'

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
    this.hasReorder = true
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'text'}"
        style="height: auto"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        <grampsjs-name
          .appState="${this.appState}"
          .data="${obj}"
        ></grampsjs-name>
        ${this._renderRefCounts(obj, i)}
      </md-list-item>
    `
  }

  _refDetailsContext(obj) {
    return {
      title: this._('Name'),
      summary: html`
        ${personDisplayName({primary_name: obj})}
        <span slot="supporting-text">${this._(typeString(obj.type))}</span>
        <grampsjs-icon
          slot="start"
          path="${objectIconPath.person}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      `,
    }
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-name
        id="name"
        @object:save="${this._handleNameAdd}"
        @object:cancel="${this._handleNameCancel}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-name>
    `
  }

  _handleDelete() {
    const handle = this._selectedIndex
    this.dialogContent = html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Are you sure?')}</span>
        <div slot="content">${this._('This action cannot be undone.')}</div>
        <div slot="actions">
          <md-text-button @click="${() => this._handleNameCancel()}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button
            @click="${() =>
              this._handleNameDelete(handle, new Event('confirm'))}"
          >
            ${this._('Yes')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _handleMove(from, to) {
    fireEvent(this, 'edit:action', {action: 'moveName', handle: from, to})
  }

  _handleEdit() {
    const handle = this._selectedIndex
    this.dialogContent = html`
      <grampsjs-form-edit-name
        id="name"
        @object:save="${e => this._handleNameSave(handle, e)}"
        @object:cancel="${this._handleNameCancel}"
        ?primary="${handle === 0}"
        .appState="${this.appState}"
        .data="${this.data[handle]}"
      >
      </grampsjs-form-edit-name>
    `
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
