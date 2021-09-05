import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'

export class GrampsjsEvents extends GrampsjsEditableTable {
  static get properties () {
    return {
      profile: {type: Array}
    }
  }

  constructor () {
    super()
    this.profile = []
    this.objType = 'Event'
    this._columns = ['Date', 'Type', 'Description', 'Place', '']
  }

  row (obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${this.profile[i].date}</td>
        <td>${this.profile[i].type}
        ${!this.profile[i]?.role || [this._('Primary'), this._('Family')].includes(this.profile[i]?.role)
    ? ''
    : `(${this.profile[i]?.role})`} </td>
        <td>${obj.description}</td>
        <td>${this.profile[i].place}</td>
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

  _handleClick (grampsId) {
    fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath (grampsId) {
    return `event/${grampsId}`
  }
}

window.customElements.define('grampsjs-events', GrampsjsEvents)
