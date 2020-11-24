import { LitElement, css } from 'lit-element';

import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsTableBase extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      table {
        font-size: 16px;
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
        padding: 12px 12px;
        border-bottom: 1px solid #e0e0e0;
        text-align: left;
        margin: 0;
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

