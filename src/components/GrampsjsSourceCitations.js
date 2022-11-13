import {html} from 'lit'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {fireEvent, renderIcon, makeHandle} from '../util.js'
import './GrampsjsFormCitation.js'
import './GrampsjsFormNewCitation.js'

import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

export class GrampsjsSourceCitations extends GrampsjsEditableList {
  constructor() {
    super()
    this.objType = 'Citation'
  }

  row(obj) {
    return html`
      <mwc-list-item
        twoline
        graphic="avatar"
        ?hasMeta="${this.edit}"
        @click="${() => this._handleClick(obj.gramps_id)}"
      >
        ${obj?.profile?.source?.title || this._('Source')}
        <span slot="secondary"> ${obj.page || obj.gramps_id} </span>
        ${renderIcon({object: obj, object_type: 'citation'})}
      </mwc-list-item>
    `
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
    return `citation/${grampsId}`
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-citation
        new
        @object:save="${this._handleCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .strings="${this.strings}"
        dialogTitle=${this._('New Citation')}
      >
      </grampsjs-form-new-citation>
    `
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-citation
        new
        @object:save="${this._handleShareCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .strings="${this.strings}"
        dialogTitle=${this._('Select an existing citation')}
      >
      </grampsjs-form-citation>
    `
  }

  _handleCitSave(e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {
      action: 'newCitation',
      data: {handle, ...e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleShareCitSave(e) {
    fireEvent(this, 'edit:action', {action: 'addCitation', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDelete(e) {
    fireEvent(this, 'edit:action', {
      action: 'delCitation',
      index: this._selectedIndex,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  _handleCitCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define(
  'grampsjs-source-citations',
  GrampsjsSourceCitations
)
