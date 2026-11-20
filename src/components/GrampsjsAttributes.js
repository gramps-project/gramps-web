import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiInformation} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditAttribute.js'
import './GrampsjsIcon.js'
import './GrampsjsRefDetails.js'

import {fireEvent, linkUrls} from '../util.js'
import {renderPrivacyIcon, rowPrivacy} from '../objectRender.js'

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
      // attributes of a secondary object shown without their own
      // citations and notes
      nested: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.attributeCategory = ''
    this.nested = false
    this.hasReorder = true
    this.listProp = 'attribute_list'
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'text'}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${this._rowContent(obj)}
        ${this.nested ? '' : this._renderRefCounts(obj, i)}
      </md-list-item>
    `
  }

  _rowContent(obj) {
    const value =
      obj.value.length > 200 ? `${obj.value.slice(0, 200)}…` : obj.value
    return html`
      ${this.edit ? value : linkUrls(value, false)}
      ${renderPrivacyIcon(rowPrivacy(obj), this.appState)}
      <span slot="supporting-text">${this._(obj.type)}</span>
      <grampsjs-icon
        slot="start"
        path="${mdiInformation}"
        color="var(--grampsjs-color-icon)"
      ></grampsjs-icon>
    `
  }

  _refDetailsContext(obj) {
    return {title: this._(obj.type), summary: this._rowContent(obj)}
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-attribute
        new
        ?nested="${this.nested}"
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
      private: !!attr.private,
      ...(!this.nested && 'citation_list' in attr
        ? {citation_list: attr.citation_list ?? []}
        : {}),
      ...(!this.nested && 'note_list' in attr
        ? {note_list: attr.note_list ?? []}
        : {}),
    }
    this.dialogContent = html`
      <grampsjs-form-edit-attribute
        ?nested="${this.nested}"
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

  // the cancel event stops here, so a dialog around the list stays open
  _handleAttrCancel(e) {
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-attributes', GrampsjsAttributes)
