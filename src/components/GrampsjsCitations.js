import {html} from 'lit'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {fireEvent, renderIcon} from '../util.js'

import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

export class GrampsjsCitations extends GrampsjsEditableList {
  constructor() {
    super()
    this.objType = 'Citation'
  }

  row(obj) {
    return html`
      <mwc-list-item
        twoline
        graphic="avatar"
        @click="${() => this._handleClick(obj.gramps_id)}"
      >
        ${obj.page || this._('Citation')}
        <span slot="secondary"> ${obj.gramps_id} </span>
        ${renderIcon({object: obj, object_type: 'citation'})}
      </mwc-list-item>
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
