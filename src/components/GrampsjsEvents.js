import {html} from 'lit'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {fireEvent, renderIcon, objectDetail} from '../util.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEventRef.js'
import './GrampsjsObjectForm.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

export class GrampsjsEvents extends GrampsjsEditableList {
  static get properties() {
    return {
      profile: {type: Array},
      dialogContent: {type: String},
      useSummary: {type: Boolean},
      sorted: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.objType = 'Event'
    this.useSummary = false
    this.sorted = false
    this.hasAdd = false
    this.hasShare = true
  }

  row(obj) {
    const j = this.data.indexOf(obj)
    const objProfile = {...obj, profile: this.profile[j]}
    return html`
      <mwc-list-item
        twoline
        graphic="avatar"
        @click="${() => this._handleClick(obj.gramps_id)}"
      >
        ${this._getPrimaryText(objProfile)}
        <span slot="secondary">${this._getSecondaryText(objProfile)}</span>
        ${renderIcon({object: obj, object_type: 'event'})}
      </mwc-list-item>
    `
  }

  _getPrimaryText(obj) {
    if (this.useSummary) {
      return obj.profile.summary
    }
    return html`
      ${obj.profile.type}
      ${!obj.profile?.role ||
      ['Primary', 'Family', this._('Primary'), this._('Family')].includes(
        obj.profile?.role
      )
        ? ''
        : `(${obj.profile?.role})`}
    `
  }

  _getSecondaryText(obj) {
    return html`
      ${objectDetail('event', obj, this.strings)}
      ${obj.description ? html` &ndash; ${obj.description}` : ''}
    `
  }

  // row(obj, i, arr) {
  //   const j = this.data.indexOf(obj)
  //   const prof = this.profile[j]
  //   return html`
  //     <tr @click=${() => this._handleClick(obj.gramps_id)}>
  //       <td>${prof.date}</td>
  //       <td>
  //         ${prof.type}
  //         ${!prof?.role ||
  //         ['Primary', 'Family', this._('Primary'), this._('Family')].includes(
  //           prof?.role
  //         )
  //           ? ''
  //           : `(${prof?.role})`}
  //       </td>
  //       <td>${this.useSummary ? prof.summary : obj.description}</td>
  //       <td>${prof.place}</td>
  //       <td>
  //         ${this.edit
  //           ? this._renderActionBtns(obj.handle, i === 0, i === arr.length - 1)
  //           : html`${obj?.media_list?.length > 0
  //               ? html` <mwc-icon class="inline">photo</mwc-icon>`
  //               : ''}
  //             ${obj?.note_list?.length > 0 > 0
  //               ? html` <mwc-icon class="inline">sticky_note_2</mwc-icon>`
  //               : ''}`}
  //       </td>
  //     </tr>
  //   `
  // }

  sortData(dataCopy) {
    if (!this.sorted) {
      return dataCopy
    }
    return dataCopy.sort(
      (a, b) => (a?.date?.sortval || 0) - (b?.date?.sortval || 0)
    )
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-eventref
        new
        @object:save="${this._handleEventRefSave}"
        @object:cancel="${this._handleEventRefCancel}"
        .strings="${this.strings}"
        objType="${this.objType}"
        dialogTitle=${this._('Share an existing event')}
      >
      </grampsjs-form-eventref>
    `
  }

  _handleEventRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addEventRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEventRefCancel() {
    this.dialogContent = ''
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delEvent',
      index: this._selectedIndex,
    })
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `event/${grampsId}`
  }
}

window.customElements.define('grampsjs-events', GrampsjsEvents)
