import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import {fireEvent} from '../util.js'

export class GrampsjsCitations extends GrampsjsEditableTable {
  constructor() {
    super()
    this.objType = 'Citation'
    this._columns = ['Page', 'Date']
  }

  // eslint-disable-next-line no-unused-vars
  row(obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${obj.page}</td>
        <td>${obj.date}</td>
      </tr>
    `
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }
}

window.customElements.define('grampsjs-citations', GrampsjsCitations)
