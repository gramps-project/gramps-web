import { LitElement, css } from 'lit-element';

import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsTableBase extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      table {
        font-size: 18px;
        margin-top: 20px;
      }

      th {
        font-size: 16px;
        color: #666;
        font-weight: 400;
      }

      th, td {
        padding: 8px 12px;
        border-bottom: 1px solid #e0e0e0;
        text-align: left;
      }
      `
    ];
  }

  static get properties() {
    return {
      data: { type: Array },
      strings : {type: Object}
    };
  }

  constructor() {
    super();
    this.data = [];
    this.strings = {};
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }
}

