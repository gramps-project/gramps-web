import {html} from 'lit'

import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'
import {toDate} from '../date.js'
import {dateIsEmpty} from '../util.js'
import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'

export class GrampsjsPlaceNames extends GrampsjsEditableTable {
  static get properties() {
    return {
      profile: {type: Array},
    }
  }

  constructor() {
    super()
    this.objType = 'PlaceName'
    this._columns = ['Name', 'Date', '']
    this.dialogContent = ''
    this.edit = false
    this.profile = []
  }

  row(obj, i, arr) {
    const objProfile = this.profile?.[i]
    return html`
      <tr>
        <td>${obj.value}</td>
        <td>
          ${dateIsEmpty(obj.date)
            ? ''
            : objProfile?.date_str ?? toDate(obj.date?.dateval)}
        </td>
        <td>
          ${false // ${this.edit TODO: implement place name edit
            ? this._renderActionBtns(obj.ref, i === 0, i === arr.length - 1)
            : ''}
        </td>
      </tr>
    `
  }
}

window.customElements.define('grampsjs-place-names', GrampsjsPlaceNames)
