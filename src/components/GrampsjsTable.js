import {css, html, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler, fireEvent} from '../util.js'

export class GrampsjsTable extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        table {
          width: 100%;
          border-collapse: collapse;
          font-weight: 300;
        }

        thead {
          display: none;
        }

        tbody tr {
          display: grid;
          gap: 1em;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          padding: 10px 0;
        }

        tbody tr:last-child {
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        tbody td {
          text-align: left;
          display: block;
          padding: 10px;
          border: none;
          position: relative;
          font-size: 16px;
        }

        tbody td::before {
          content: attr(data-label);
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.5);
          font-weight: 400;
        }

        table.linked tbody tr:hover {
          background-color: #f0f0f0;
          cursor: pointer;
        }

        /* Wide table */

        table.wide thead {
          display: table-header-group;
        }

        table.wide thead th {
          text-align: left;
          padding: 20px 20px;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.5);
          font-weight: 400;
        }

        table.wide tbody tr {
          display: table-row;
          gap: 0;
          padding: 0;
        }

        table.wide tbody td {
          display: table-cell;
          box-shadow: none;
          background: none;
          padding: 14px 20px;
          border: none;
          font-size: 15px;
        }

        table.wide tbody td::before {
          content: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      columns: {type: Array},
      data: {type: Array},
      narrow: {type: Boolean},
      breakPoint: {type: Number},
      loading: {type: Boolean},
      linked: {type: Boolean},
      _containerWidth: {type: Number},
    }
  }

  constructor() {
    super()
    this.columns = ['name', 'age', 'occupation', 'city', 'country']
    this.data = []
    this.loading = false
    this.narrow = false
    this.breakPoint = 600
    this.linked = false
    this._containerWidth = -1
  }

  render() {
    if (this.data.length === 0) {
      return html`<div class="table-container"></div>`
    }
    return html`
      <div class="table-container">
        <table
          class="${classMap({
            wide: this._containerWidth > this.breakPoint && !this.narrow,
            linked: this.linked,
          })}"
        >
          <thead>
            <tr>
              ${this.columns.map(column => html`<th>${this._(column)}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${this.data.map(
              (row, rowNumber) => html`
                <tr
                  @click="${() => this._handleRowClick(rowNumber)}"
                  @keydown="${clickKeyHandler}"
                >
                  ${row.map(
                    (cell, index) => html`
                      <td data-label="${this.columns[index]}">
                        ${this.loading
                          ? html`<span class="skeleton"
                              ><span style="visibility: hidden;"
                                >${cell}</span
                              ></span
                            >`
                          : cell}
                      </td>
                    `
                  )}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `
  }

  _handleRowClick(rowNumber) {
    fireEvent(this, 'table:row-click', {rowNumber})
  }

  firstUpdated() {
    const container = this.renderRoot.querySelector('.table-container')
    this.handleResize()
    new ResizeObserver(() => this.handleResize()).observe(container)
  }

  handleResize() {
    const container = this.renderRoot.querySelector('.table-container')
    if (container) {
      this._containerWidth = container.offsetWidth
    }
  }
}

window.customElements.define('grampsjs-table', GrampsjsTable)
