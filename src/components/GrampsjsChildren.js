import {css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {fireEvent} from '../util.js'
import {renderPersonAvatar, renderPersonDates} from './personListUtils.js'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormChildRef.js'
import './GrampsjsFormNewChild.js'

import '@material/web/list/list-item.js'

export class GrampsjsChildren extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        md-list-item.highlight {
          opacity: 0.6;
          pointer-events: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      profile: {type: Array},
      highlightId: {type: String},
      extended: {type: Array},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.highlightId = ''
    this.extended = []
    this.hasShare = true
    this.hasReorder = true
    this.objType = 'ChildRef'
  }

  row(obj, i) {
    const p = this.profile[i] || {}
    const extPerson = this.extended.find(e => e.handle === obj.ref) || null

    return html`
      <md-list-item
        type="button"
        class="${classMap({
          selected: i === this._selectedIndex,
          highlight: p.gramps_id === this.highlightId,
        })}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(p.gramps_id)
          }
        }}"
      >
        ${p.name_given || ''} ${p.name_surname || ''} ${renderPersonDates(p)}
        ${renderPersonAvatar(extPerson, p.sex)}
      </md-list-item>
    `
  }

  _handleClick(grampsId) {
    if (!this.edit && grampsId) {
      fireEvent(this, 'nav', {path: `person/${grampsId}`})
    }
  }

  _handleDelete() {
    const obj = this.data[this._selectedIndex]
    if (obj) {
      fireEvent(this, 'edit:action', {action: 'delChildRef', handle: obj.ref})
    }
  }

  _handleUp() {
    const obj = this.data[this._selectedIndex]
    if (obj) {
      fireEvent(this, 'edit:action', {action: 'upChildRef', handle: obj.ref})
      this._updateSelectionAfterReorder(true)
    }
  }

  _handleDown() {
    const obj = this.data[this._selectedIndex]
    if (obj) {
      fireEvent(this, 'edit:action', {action: 'downChildRef', handle: obj.ref})
      this._updateSelectionAfterReorder(false)
    }
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-childref
        new
        @object:save="${this._handleChildRefSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Add existing child to family')}
      >
      </grampsjs-form-childref>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-child
        @object:save="${this._handleNewChildSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-child>
    `
  }

  _handleNewChildSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'newChild',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleChildRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addChildRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-children', GrampsjsChildren)
