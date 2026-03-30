import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiInformation} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditAttribute.js'
import './GrampsjsIcon.js'

import '@material/mwc-icon-button'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {fireEvent, linkUrls} from '../util.js'

export class GrampsjsAttributes extends GrampsjsEditableList {
  static get styles() {
    return [
      super.styles,
      css`
        md-list-item {
          cursor: default;
        }

        md-list.activatable md-list-item {
          cursor: pointer;
        }
      `,
    ]
  }

  static get properties() {
    return {
      attributeCategory: {type: String},
    }
  }

  constructor() {
    super()
    this.attributeCategory = ''
  }

  row(obj, i) {
    return html`
      <md-list-item
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${this.edit ? obj.value : linkUrls(obj.value, false)}
        <span slot="supporting-text">${this._(obj.type)}</span>
        <grampsjs-icon
          slot="start"
          path="${mdiInformation}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-attribute
        new
        attributeCategory="${this.attributeCategory}"
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
        attributeCategory="${this.attributeCategory}"
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
