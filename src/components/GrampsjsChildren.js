import {html} from 'lit'

import '@material/mwc-button'
import '@material/mwc-icon-button'
import {mdiGenderFemale, mdiGenderMale} from '@mdi/js'
import {renderIcon} from '../icons.js'
import {fireEvent} from '../util.js'
import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormChildRef.js'
import './GrampsjsFormNewChild.js'

function genderIcon(gender) {
  if (gender === 'M') {
    return renderIcon(mdiGenderMale, 'var(--color-boy)')
  }
  if (gender === 'F') {
    return renderIcon(mdiGenderFemale, 'var(--color-girl)')
  }
  return ''
}

export class GrampsjsChildren extends GrampsjsEditableTable {
  static get properties() {
    return {
      profile: {type: Array},
      highlightId: {type: String},
      dialogContent: {type: String},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.highlightId = ''
    this._columns = ['', 'Given name', 'Birth', 'Death', 'Age at death', '']
    this.objType = 'ChildRef'
  }

  row(obj, i, arr) {
    return html`
      <tr
        @click=${() => this._handleClick(this.profile[i].gramps_id)}
        class="${obj.gramps_id === this.highlightId ? 'highlight' : ''}"
      >
        <td>${genderIcon(this.profile[i]?.sex)}</td>
        <td>${this.profile[i]?.name_given || ''}</td>
        <td>${this.profile[i]?.birth?.date || ' '}</td>
        <td>${this.profile[i]?.death?.date || ''}</td>
        <td>${this.profile[i]?.death?.age || ''}</td>
        <td>
          ${this.edit
            ? this._renderActionBtns(obj.ref, i === 0, i === arr.length - 1)
            : ''}
        </td>
      </tr>
    `
  }

  renderAfterTable() {
    return this.edit
      ? html`
          <mwc-icon-button
            class="edit"
            icon="add_link"
            @click="${this._handleShare}"
          ></mwc-icon-button>
          <mwc-icon-button
            class="edit"
            icon="add"
            @click="${this._handleAdd}"
          ></mwc-icon-button>
          ${this.dialogContent}
        `
      : ''
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

  _handleClick(grampsId) {
    if (!this.edit && grampsId !== this.grampsId) {
      this.dispatchEvent(
        new CustomEvent('nav', {
          bubbles: true,
          composed: true,
          detail: {path: this._getItemPath(grampsId)},
        })
      )
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `person/${grampsId}`
  }
}

window.customElements.define('grampsjs-children', GrampsjsChildren)
