import {LitElement, css} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsTableBase extends GrampsjsAppStateMixin(LitElement) {
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

        th,
        td {
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
          color: var(--grampsjs-body-font-color-25);
          font-size: 16px;
        }

        td mwc-icon-button {
          --mdc-icon-size: 20px;
          --mdc-icon-button-size: 36px;
          margin: -2px 0px;
        }

        @media (max-width: 768px) {
          table {
            font-size: 14px;
          }

          th {
            font-size: 12px;
          }

          th,
          td {
            padding: 10px 8px;
          }

          td mwc-icon.inline {
            font-size: 15px;
          }

          td mwc-icon-button {
            --mdc-icon-size: 18px;
            --mdc-icon-button-size: 33px;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = []
  }
}
