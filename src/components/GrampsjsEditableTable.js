/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import {css, html} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'

export class GrampsjsEditableTable extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
        tr:hover td {
          background-color: var(--grampsjs-color-shade-240);
          cursor: pointer;
        }
      `,
    ]
  }

  static get properties() {
    return {
      edit: {type: Boolean},
      objType: {type: String},
      dialogContent: {type: String},
      dialogTitle: {type: String},
      _columns: {type: Array},
    }
  }

  constructor() {
    super()
    this.edit = false
    this.objType = ''
    this.dialogContent = ''
    this.dialogTitle = ''
    this._columns = []
  }

  render() {
    return html`
      ${Object.keys(this.data).length === 0
        ? ''
        : html`
            <table>
              <tr>
                ${this._columns.map(
                  column => html` <th>${this._(column)}</th> `
                )}
              </tr>
              ${this.sortData([...this.data]).map((obj, i, arr) =>
                this.row(obj, i, arr)
              )}
            </table>
          `}
      ${this.renderAfterTable()}
    `
  }

  // function to sort the data, if necessary
  sortData(dataCopy) {
    return dataCopy
  }

  renderAfterTable() {
    return ''
  }

  row(obj, i, arr) {
    return ''
  }

  _renderActionBtns(handle, first, last, edit = false, deleteFirst = true) {
    return html`
      ${first && !deleteFirst
        ? ''
        : html`
            <mwc-icon-button
              class="edit"
              icon="delete"
              @click="${e =>
                this._handleActionClick(e, `del${this.objType}`, handle)}"
            ></mwc-icon-button>
          `}
      ${first
        ? ''
        : html`
            <mwc-icon-button
              class="edit"
              icon="arrow_upward"
              @click="${e =>
                this._handleActionClick(e, `up${this.objType}`, handle)}"
            ></mwc-icon-button>
          `}
      ${last
        ? ''
        : html`
            <mwc-icon-button
              class="edit"
              icon="arrow_downward"
              @click="${e =>
                this._handleActionClick(e, `down${this.objType}`, handle)}"
            ></mwc-icon-button>
          `}
      ${edit
        ? html`
            <mwc-icon-button
              class="edit"
              icon="edit"
              @click="${this._handleEditClick(handle)}"
            ></mwc-icon-button>
          `
        : ''}
    `
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
