import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiAccount} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditAssociation.js'
import './GrampsjsIcon.js'

import {personDisplayName, fireEvent} from '../util.js'
import {renderPrivacyIcon, rowPrivacy} from '../objectRender.js'

import '@material/web/list/list-item.js'

export class GrampsjsAssociations extends GrampsjsEditableList {
  static get properties() {
    return {
      extended: {type: Array},
    }
  }

  constructor() {
    super()
    this.hasReorder = true
    this.listProp = 'person_ref_list'
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'link'}"
        href="${this.edit
          ? ''
          : `/${this._getItemPath(this.extended[i]?.gramps_id)}`}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
        >${personDisplayName(this.extended[i])}
        ${renderPrivacyIcon(rowPrivacy(this.extended[i], obj), this.appState)}
        <span slot="supporting-text">${this._(obj.rel)}</span>
        <grampsjs-icon
          slot="start"
          path="${mdiAccount}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `person/${grampsId}`
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-association
        new
        @object:save="${this._handleAssocSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-association>
    `
  }

  _handleEdit() {
    const data = this.data[this._selectedIndex]
    const person = this.extended[this._selectedIndex]
    this.dialogContent = html`
      <grampsjs-form-edit-association
        @object:save="${this._handleAssocSaveEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${data}"
        .person="${person}"
      >
      </grampsjs-form-edit-association>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delAssociation',
      index: this._selectedIndex,
    })
  }

  _handleAssocSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addAssociation',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleAssocSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateAssociation',
      data: e.detail.data,
      index: this._selectedIndex,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-associations', GrampsjsAssociations)
