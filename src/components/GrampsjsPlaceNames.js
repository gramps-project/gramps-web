import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiSignRealEstate} from '@mdi/js'

import {fireEvent} from '../util.js'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditPlaceName.js'
import './GrampsjsIcon.js'

export class GrampsjsPlaceNames extends GrampsjsEditableList {
  static get properties() {
    return {
      profile: {type: Array},
    }
  }

  constructor() {
    super()
    this.objType = 'PlaceName'
    this.hasEdit = true
    this.profile = []
  }

  row(obj, i) {
    const dateStr = this.profile[i]?.date_str ?? ''
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
        ${obj.value}
        ${dateStr ? html`<span slot="supporting-text">${dateStr}</span>` : ''}
        <grampsjs-icon
          slot="start"
          path="${mdiSignRealEstate}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-placename
        new
        @object:save="${this._handlePlaceNameAdd}"
        @object:cancel="${this._handleCancel}"
        .appState="${this.appState}"
        ?showDateInput=${true}
      >
      </grampsjs-form-edit-placename>
    `
  }

  _handleEdit() {
    const index = this._selectedIndex
    const obj = this.data[index]
    this.dialogContent = html`
      <grampsjs-form-edit-placename
        @object:save="${e => this._handlePlaceNameUpdate(e, index, obj)}"
        @object:cancel="${this._handleCancel}"
        .appState="${this.appState}"
        .data="${obj}"
        ?showDateInput=${true}
      >
      </grampsjs-form-edit-placename>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delPlaceName',
      index: this._selectedIndex,
    })
    this._selectedIndex = -1
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

  _handlePlaceNameUpdate(e, index, originalObj) {
    const updatedData = {...originalObj, ...e.detail.data}
    fireEvent(this, 'edit:action', {
      action: 'updatePlaceName',
      data: updatedData,
      index,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-place-names', GrampsjsPlaceNames)
