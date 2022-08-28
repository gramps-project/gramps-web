import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import {fireEvent} from '../util.js'

export class GrampsjsPlaceChildren extends GrampsjsEditableTable {
  constructor () {
    super()
    this.objType = 'Place'
    this._columns = ['Name', 'Type']
  }

  // eslint-disable-next-line no-unused-vars
  row (obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${obj.name}</td>
        <td>${obj.type}</td>
      </tr>
    `
  }

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

window.customElements.define('grampsjs-place-children', GrampsjsPlaceChildren)
