import {LitElement, css} from 'lit-element'

import {sharedStyles} from '../SharedStyles.js'


export class GrampsjsTableBase extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      table {
        font-size: 15px;
        margin-top: 20px;
        border-collapse: collapse;
        border-spacing: 0;
      }

      th {
        font-size: 14px;
        color: #666;
        font-weight: 400;
      }

      th, td {
        padding: 14px 20px;
        border-bottom: 1px solid #e0e0e0;
        text-align: left;
        margin: 0;
      }

      table.linked tr:hover td {
        background-color: #f0f0f0;
        cursor: pointer;
      }

      table.linked tr.highlight td {
        font-weight: 400;
      }

      table.linked tr.highlight:hover td {
        background-color: white;
        cursor: auto;
      }

      td mwc-icon.inline {
        color: rgba(0, 0, 0, 0.25);
        font-size: 16px;
      }

      `
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      strings: {type: Object}
    }
  }

  constructor() {
    super()
    this.data = []
    this.strings = {}
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }
}

