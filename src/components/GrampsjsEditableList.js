/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import {css, html, LitElement} from 'lit'

import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

export class GrampsjsEditableList extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-list,
        mwc-list > * {
          --mdc-ripple-color: tranparent;
        }

        mwc-list > * {
          transition: background-color 0.1s, color 0.1s;
        }

        mwc-list[activatable] [selected] {
          background-color: rgba(2, 119, 189, 0.5);
        }

        mwc-list[activatable] [mwc-list-item]:not([selected]):hover,
        mwc-list[activatable] [mwc-list-item]:not([selected]):focus {
          background-color: rgba(2, 119, 189, 0.1);
        }

        mwc-list[activatable] [mwc-list-item]:not([selected]):active {
          background-color: rgba(2, 119, 189, 0.2);
        }

        mwc-list[activatable] [mwc-list-item][selected]:hover,
        mwc-list[activatable] [mwc-list-item][selected]:focus {
          background-color: rgba(2, 119, 189, 0.4);
        }

        mwc-list[activatable] [mwc-list-item][selected]:active {
          background-color: rgba(2, 119, 189, 0.3);
        }

        mwc-icon-button {
          --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.25);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      objType: {type: String},
      dialogContent: {type: String},
      dialogTitle: {type: String},
      _selectedIndex: {type: Number},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.objType = ''
    this.dialogContent = ''
    this.dialogTitle = ''
    this._selectedIndex = -1
  }

  render() {
    return html`
      ${Object.keys(this.data).length === 0 && !this.edit
        ? ''
        : html`
            ${this.edit ? this._renderActionBtns() : ''}
            <mwc-list
              ?activatable="${this.edit}"
              @action="${this._handleSelected}"
            >
              ${this.sortData([...this.data]).map((obj, i, arr) =>
                this.row(obj, i, arr)
              )}
            </mwc-list>
          `}
      ${this.dialogContent}
    `
  }

  _handleSelected(e) {
    this._selectedIndex = e.detail.index
  }

  // function to sort the data, if necessary
  sortData(dataCopy) {
    return dataCopy
  }

  row(obj, i, arr) {
    return ''
  }

  _renderActionBtns() {
    return html`
      <mwc-icon-button
        class="edit"
        icon="add"
        @click="${this._handleAdd}"
      ></mwc-icon-button>
      <mwc-icon-button
        ?disabled="${this._selectedIndex === -1}"
        class="edit"
        icon="edit"
        @click="${this._handleEdit}"
      ></mwc-icon-button>
      <mwc-icon-button
        ?disabled="${this._selectedIndex === -1}"
        class="edit"
        icon="delete"
        @click="${this._handleDelete}"
      ></mwc-icon-button>
    `
  }

  updated(changed) {
    if (changed.has('edit')) {
      this._selectedIndex = -1
      this.dialogContent = ''
    }
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
