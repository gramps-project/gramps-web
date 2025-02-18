import {css, html, LitElement} from 'lit'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import {mdiSort, mdiSortAscending, mdiSortDescending} from '@mdi/js'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler, fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'

export class GrampsjsTable extends GrampsjsAppStateMixin(LitElement) {
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

        th {
          --md-icon-button-icon-size: 18px;
        }

        th md-icon-button {
          position: relative;
          top: 3px;
          margin-left: 0.5em;
          display: inline-block;
        }
      `,
    ]
  }

  static get properties() {
    return {
      columns: {type: Array},
      units: {type: Array},
      data: {type: Array},
      narrow: {type: Boolean},
      breakPoint: {type: Number},
      loading: {type: Boolean},
      linked: {type: Boolean},
      sortable: {type: Boolean},
      sort: {type: Number},
      descending: {type: Boolean},
      _containerWidth: {type: Number},
    }
  }

  constructor() {
    super()
    this.columns = []
    this.units = []
    this.data = []
    this.loading = false
    this.narrow = false
    this.breakPoint = 600
    this.linked = false
    this.sortable = false
    this.sort = -1
    this.descending = false
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
              ${this.columns.map(
                (column, columnIndex) => html`<th>
                  ${this._(column.name)}
                  ${this.sortable ? this._renderSortBtn(columnIndex) : ''}
                </th>`
              )}
            </tr>
          </thead>
          <tbody>
            ${this._sortedData().map(
              (row, rowNumber) => html`
                <tr
                  @click="${() => this._handleRowClick(rowNumber)}"
                  @keydown="${clickKeyHandler}"
                >
                  ${row.map(
                    (value, index) => html`
                      <td data-label="${this.columns[index].name}">
                        ${this.loading
                          ? html`<span class="skeleton"
                              ><span style="visibility: hidden;"
                                >${this._formatValue(
                                  this.columns[index],
                                  value
                                )}</span
                              ></span
                            >`
                          : this._formatValue(this.columns[index], value)}
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

  // eslint-disable-next-line class-methods-use-this
  _formatValue(column, value) {
    let returnValue = value
    if (column.format) {
      returnValue = column.format(value)
    }
    if (column.unit) {
      returnValue = `${returnValue} ${column.unit}`
    }
    return returnValue
  }

  _renderSortBtn(columnIndex) {
    const isCurrent = this.sort === columnIndex
    const isAscending = !this.descending
    return html`
      <span>
        <md-icon-button
          @click="${() => this._toggleSort(columnIndex)}"
          id="btn-sort-${columnIndex}"
        >
          <md-icon>${this._renderSortIcon(isCurrent, isAscending)}</md-icon>
        </md-icon-button>
        <grampsjs-tooltip
          for="btn-sort-${columnIndex}"
          .strings="${this.strings}"
          >${this._('Sort')}</grampsjs-tooltip
        >
      </span>
    `
  }

  _toggleSort(columnIndex) {
    if (this.sort === columnIndex) {
      this.descending = !this.descending
    } else {
      this.sort = columnIndex
      this.descending = false
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSortIcon(isCurrent, isAscending) {
    if (isCurrent) {
      if (isAscending) {
        return renderIconSvg(mdiSortAscending, 'rgba(0, 0, 0, 0.6)')
      }
      return renderIconSvg(mdiSortDescending, 'rgba(0, 0, 0, 0.6)')
    }
    return renderIconSvg(mdiSort, 'rgba(0, 0, 0, 0.2)')
  }

  _sortedData() {
    if (this.sortable && this.sort >= 0) {
      const sortFunc = this.descending
        ? (a, b) => (a[this.sort] < b[this.sort] ? 1 : -1)
        : (a, b) => (a[this.sort] > b[this.sort] ? 1 : -1)
      return [...this.data].sort(sortFunc)
    }
    return this.data
  }

  _sortedDataIndices() {
    if (this.sortable && this.sort >= 0) {
      const sortFunc = this.descending
        ? (a, b) => (a[this.sort] < b[this.sort] ? 1 : -1)
        : (a, b) => (a[this.sort] > b[this.sort] ? 1 : -1)
      return [...this.data]
        .map((item, index) => ({item, index}))
        .sort((a, b) => sortFunc(a.item[this.sort], b.item[this.sort]))
        .map(({index}) => index)
    }
    return this.data.map((_, index) => index)
  }

  _handleRowClick(rowNumber) {
    const originalRowNumber = this._sortedDataIndices()[rowNumber]
    fireEvent(this, 'table:row-click', {rowNumber: originalRowNumber})
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
