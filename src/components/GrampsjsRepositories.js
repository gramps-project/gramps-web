import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'

export class GrampsjsRepositories extends GrampsjsEditableTable {
  static get properties () {
    return {
      extended: {type: Array}
    }
  }

  constructor () {
    super()
    this.extended = []
    this.objType = 'Event'
    this._columns = ['Title', 'Call Number', 'Media Type', '']
    this.dialogContent = ''
  }

  row (obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(this.extended[i].gramps_id)}>
        <td>${this.extended[i].name}</td>
        <td>${obj.call_number}</td>
        <td>${obj.media_type}</td>
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
  //   <grampsjs-form-eventref
  //     new
  //     @object:save="${this._handleEventRefSave}"
  //     @object:cancel="${this._handleEventRefCancel}"
  //     .strings="${this.strings}"
  //     objType="${this.objType}"
  //     dialogTitle = ${this._('Share an existing event')}
  //   >
  //   </grampsjs-form-eventref>
  //   `
  // }

  // _handleEventRefSave (e) {
  //   fireEvent(this, 'edit:action', {action: 'addEventRef', data: e.detail.data})
  //   e.preventDefault()
  //   e.stopPropagation()
  //   this.dialogContent = ''
  // }

  // _handleEventRefCancel () {
  //   this.dialogContent = ''
  // }

  _handleClick (grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath (grampsId) {
    return `repository/${grampsId}`
  }
}

window.customElements.define('grampsjs-repositories', GrampsjsRepositories)
