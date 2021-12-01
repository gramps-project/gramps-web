import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

export class GrampsjsPlaces extends GrampsjsEditableTable {
  static get properties () {
    return {
      profile: {type: Array},
      dialogContent: {type: String}
    }
  }

  constructor () {
    super()
    this.profile = []
    this.objType = 'Place'
    this._columns = ['Name', 'Type', 'Date', '']
    this.dialogContent = ''
  }

  row (obj, i, arr) {
    const prof = this.profile[i]
    return html`
      <tr @click=${() => this._handleClick(prof.gramps_id)}>
        <td>${prof.name}</td>
        <td>${prof.type}</td>
        <td>${prof.date || ''}</td>
        <td></td>
      </tr>
    `
  }

  // renderAfterTable () {
  //   return this.edit
  //     ? html`
  //     <mwc-icon-button
  //       class="edit large"
  //       icon="add_circle"
  //       @click="${this._handleAddClick}"
  //     ></mwc-icon-button>
  //     ${this.dialogContent}
  //   `
  //     : ''
  // }

  // _handleAddClick () {
  //   this.dialogContent = html`
  //   <grampsjs-form-placeref
  //     new
  //     @object:save="${this._handlePlaceRefSave}"
  //     @object:cancel="${this._handlePlaceRefCancel}"
  //     .strings="${this.strings}"
  //     objType="${this.objType}"
  //     dialogTitle = ${this._('Share an existing place')}
  //   >
  //   </grampsjs-form-placeref>
  //   `
  // }

  // _handlePlaceRefSave (e) {
  //   firePlace(this, 'edit:action', {action: 'addPlaceRef', data: e.detail.data})
  //   e.prplaceDefault()
  //   e.stopPropagation()
  //   this.dialogContent = ''
  // }

  // _handlePlaceRefCancel () {
  //   this.dialogContent = ''
  // }

  _handleClick (grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath (grampsId) {
    return `place/${grampsId}`
  }
}

window.customElements.define('grampsjs-places', GrampsjsPlaces)
