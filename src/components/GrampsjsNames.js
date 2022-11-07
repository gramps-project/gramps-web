import {css, html, LitElement} from 'lit'

import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEditName.js'
import './GrampsjsObjectForm.js'
import './GrampsjsName.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsNames extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .clear {
          clear: left;
        }
      `,
    ]
  }

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
  }

  render() {
    return html`
      ${this.edit ? this._renderAddBtn() : ''}
      ${this.data.map(
        (obj, i) => html`
          <div class="name">
            <grampsjs-name .strings="${this.strings}" .data="${obj}">
            </grampsjs-name>
            <div class="clear">
              ${this.edit ? this._renderActionBtns(i) : ''}
            </div>
          </div>
        `
      )}
      ${this.dialogContent}
    `
  }

  _renderAddBtn() {
    return html`
      <mwc-icon-button
        class="edit"
        icon="add"
        @click="${this._handleAddClick}"
      ></mwc-icon-button>
    `
  }

  _renderActionBtns(i) {
    return html`
      <mwc-icon-button
        class="edit"
        icon="edit"
        @click="${() => this._handleEditClick(i)}"
      ></mwc-icon-button>
    `
  }

  _handleAddClick() {
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

  _handleEditClick(handle) {
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

  _handleNameAdd(e) {
    fireEvent(this, 'edit:action', {action: 'addName', data: e.detail.data})
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
