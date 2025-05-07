import {html, css} from 'lit'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditAttribute.js'

import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

import {fireEvent, linkUrls} from '../util.js'

export class GrampsjsAttributes extends GrampsjsEditableList {
  static get styles() {
    return [
      super.styles,
      css`
        mwc-list-item {
          cursor: default;
        }

        mwc-list-item[hasMeta] {
          cursor: pointer;
        }
      `,
    ]
  }

  static get properties() {
    return {
      source: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.source = false
  }

  row(obj) {
    return html`
      <mwc-list-item twoline graphic="avatar" ?hasMeta="${this.edit}">
        ${this.edit ? obj.value : linkUrls(obj.value, false)}
        <span slot="secondary">${this._(obj.type)}</span>
        <mwc-icon slot="graphic">info</mwc-icon>
      </mwc-list-item>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-attribute
        ?source="${this.source}"
        new
        @object:save="${this._handleAttrSave}"
        @object:cancel="${this._handleAttrCancel}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-attribute>
    `
  }

  _handleEdit() {
    const attr = this.data[this._selectedIndex]
    const data = {
      type: attr.type || '',
      value: attr.value || '',
    }
    this.dialogContent = html`
      <grampsjs-form-edit-attribute
        ?source="${this.source}"
        @object:save="${this._handleAttrSaveEdit}"
        @object:cancel="${this._handleAttrCancel}"
        .appState="${this.appState}"
        .data="${data}"
      >
      </grampsjs-form-edit-attribute>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delAttr',
      index: this._selectedIndex,
    })
  }

  _handleAttrSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addAttribute',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleAttrSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateAttribute',
      data: e.detail.data,
      index: this._selectedIndex,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleAttrCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-attributes', GrampsjsAttributes)
