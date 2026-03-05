/*
Form for adding a new person to family tree
*/

import {html} from 'lit'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import './GrampsjsFormNewPerson.js'

class GrampsjsAddPersonToTree extends GrampsjsObjectForm {
  constructor() {
    super()
    this.data = {}
    console.log('data GrampsjsAddPersonToTree', this.data)
  }

  _handleAddNewParent() {
    this.dialogContent = html`
      <grampsjs-form-new-person
        @object:save="${this._handleSave}"
        @object:cancel="${this._handleCancel}"
      ></grampsjs-form-new-person>
    `
  }

  renderForm() {
    return html`
      <mwc-icon-button
        class="edit add-person"
        icon="plus"
        @click="${() => this._handleAddNewParent()}"
        >Add Father</mwc-icon-button
      >
    `
  }
}

window.customElements.define(
  'grampsjs-add-person-to-tree',
  GrampsjsAddPersonToTree
)
