import {css, html} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'

export class GrampsjsEditableTable extends GrampsjsTableBase {
  static get styles () {
    return [
      super.styles,
      css`
      tr:hover td {
        background-color: #f0f0f0;
        cursor: pointer;
      }
    `]
  }

  static get properties () {
    return {
      edit: {type: Boolean},
      objType: {type: String},
      _columns: {type: Array}
    }
  }

  constructor () {
    super()
    this.edit = false
    this.objType = ''
    this._columns = []
  }

  render () {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
    <table>
      <tr>
      ${this._columns.map(column => html`
        <th>${this._(column)}</th>
      `)}
      </tr>
    ${this.data.map((obj, i, arr) => this.row(obj, i, arr))}
    </table>
    `
  }

  row (obj, i, arr) {
    return ''
  }

  _renderActionBtns (handle, first, last) {
    return html`
    <mwc-icon-button
      class="edit"
      icon="delete"
      @click="${(e) => this._handleActionClick(e, `del${this.objType}`, handle)}"
    ></mwc-icon-button>
    ${first
    ? ''
    : html`
    <mwc-icon-button
      class="edit"
      icon="arrow_upward"
      @click="${(e) => this._handleActionClick(e, `up${this.objType}`, handle)}"
    ></mwc-icon-button>
  `}
  ${last
    ? ''
    : html`
    <mwc-icon-button
      class="edit"
      icon="arrow_downward"
      @click="${(e) => this._handleActionClick(e, `down${this.objType}`, handle)}"
    ></mwc-icon-button>
    `}
    `
  }

  _handleActionClick (e, action, handle) {
    fireEvent(this, 'edit:action', {action: action, handle: handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
