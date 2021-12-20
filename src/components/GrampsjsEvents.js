import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEventRef.js'
import './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

export class GrampsjsEvents extends GrampsjsEditableTable {
  static get properties () {
    return {
      profile: {type: Array},
      dialogContent: {type: String},
      useSummary: {type: Boolean},
      sorted: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.profile = []
    this.objType = 'Event'
    this._columns = ['Date', 'Type', 'Description', 'Place', '']
    this.dialogContent = ''
    this.useSummary = false
    this.sorted = false
  }

  row (obj, i, arr) {
    const j = this.data.indexOf(obj)
    const prof = this.profile[j]
    return html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${prof.date}</td>
        <td>${prof.type}
        ${!prof?.role || ['Primary', 'Family', this._('Primary'), this._('Family')].includes(prof?.role)
    ? ''
    : `(${prof?.role})`} </td>
        <td>${this.useSummary ? prof.summary : obj.description}</td>
        <td>${prof.place}</td>
        <td>${this.edit
    ? this._renderActionBtns(obj.handle, i === 0, i === arr.length - 1)
    : html`${obj?.media_list?.length > 0
      ? html`
        <mwc-icon class="inline">photo</mwc-icon>`
      : ''}
            ${obj?.note_list?.length > 0 > 0
    ? html`
        <mwc-icon class="inline">sticky_note_2</mwc-icon>`
    : ''}`}</td>

      </tr>
    `
  }

  sortData (dataCopy) {
    if (!this.sorted) {
      return dataCopy
    }
    return dataCopy.sort((a, b) => (a?.date?.sortval || 0) - (b?.date?.sortval || 0))
  }

  renderAfterTable () {
    return this.edit
      ? html`
      <mwc-icon-button
        class="edit large"
        icon="add_circle"
        @click="${this._handleAddClick}"
      ></mwc-icon-button>
      ${this.dialogContent}
    `
      : ''
  }

  _handleAddClick () {
    this.dialogContent = html`
    <grampsjs-form-eventref
      new
      @object:save="${this._handleEventRefSave}"
      @object:cancel="${this._handleEventRefCancel}"
      .strings="${this.strings}"
      objType="${this.objType}"
      dialogTitle = ${this._('Share an existing event')}
    >
    </grampsjs-form-eventref>
    `
  }

  _handleEventRefSave (e) {
    fireEvent(this, 'edit:action', {action: 'addEventRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEventRefCancel () {
    this.dialogContent = ''
  }

  _handleClick (grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath (grampsId) {
    return `event/${grampsId}`
  }
}

window.customElements.define('grampsjs-events', GrampsjsEvents)
