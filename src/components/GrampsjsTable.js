import {css, html, LitElement} from 'lit'
import '@material/web/checkbox/checkbox.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import '@material/web/iconbutton/filled-icon-button'
import '@material/web/menu/menu'
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiSort,
  mdiSortAscending,
  mdiSortDescending,
} from '@mdi/js'
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
        :host {
          display: block;
        }

        table {
          border-collapse: collapse;
          font-weight: 350;
          color: var(--grampsjs-body-font-color-87);
          font-variant-numeric: tabular-nums;
        }

        thead {
          display: none;
        }

        tbody tr {
          display: grid;
          gap: 0.75em;
          border-top: 1px solid var(--grampsjs-body-font-color-10);
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          padding: 10px 0;
        }

        tbody tr:last-child {
          border-bottom: 1px solid var(--grampsjs-body-font-color-10);
        }

        tbody td {
          text-align: left;
          display: block;
          padding: 0 10px;
          border: none;
          position: relative;
          font-size: 16px;
        }

        tbody td::before {
          content: attr(data-label);
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: var(--grampsjs-body-font-color-50);
          font-weight: 400;
        }

        table.linked tbody tr {
          transition: background-color 100ms ease-out;
        }

        table.linked tbody tr:hover {
          cursor: pointer;
        }

        table.linked tbody tr:not(.selected):hover {
          background-color: var(--grampsjs-color-shade-240);
        }

        table.linked tbody tr:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: -2px;
        }

        /* Wide table */

        table.wide thead {
          display: table-header-group;
        }

        table.wide thead th {
          text-align: left;
          padding: 14px 16px;
          font-size: 14px;
          color: var(--grampsjs-body-font-color-60);
          font-weight: 500;
          vertical-align: middle;
          white-space: nowrap;
          position: sticky;
          top: var(--grampsjs-app-bar-height, 64px);
          z-index: 1;
          background-color: var(--md-sys-color-background);
          /* Collapsed borders don't move with stuck cells */
          box-shadow: inset 0 -1px 0 var(--grampsjs-body-font-color-20);
        }

        th .sort-header {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin: -4px -6px;
          padding: 4px 6px;
          border: none;
          border-radius: 4px;
          background: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
        }

        th .sort-header:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
        }

        th .sort-header svg {
          width: 18px;
          height: 18px;
          visibility: hidden;
          opacity: 0.5;
        }

        th .sort-header:hover svg,
        th .sort-header:focus-visible svg {
          visibility: visible;
        }

        th[aria-sort='ascending'],
        th[aria-sort='descending'] {
          color: var(--grampsjs-body-font-color-87);
        }

        th[aria-sort='ascending'] .sort-header svg,
        th[aria-sort='descending'] .sort-header svg {
          visibility: visible;
          opacity: 1;
        }

        table.wide tbody tr {
          display: table-row;
          gap: 0;
          padding: 0;
        }

        table.wide tbody tr:first-child {
          border-top: none;
        }

        table.wide tbody td {
          display: table-cell;
          padding: 12px 16px;
          border: none;
          font-size: 15px;
        }

        tbody td > .cell-content {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        }

        table.wide tbody td > .cell-content {
          -webkit-line-clamp: 1;
        }

        table.wide tbody td::before {
          content: none;
        }

        .mobile-sort {
          position: relative;
          margin-top: 5px;
          margin-bottom: 15px;
        }

        .mobile-sort md-menu {
          --md-menu-item-one-line-container-height: 48px;
          --md-menu-item-selected-container-color: var(
            --md-sys-color-secondary-container
          );
        }

        /* Narrow (card) mode: pull checkbox out of grid flow, pin to left */
        table:not(.wide) tbody tr:has(td.col-select) {
          position: relative;
          padding-left: 48px;
        }

        table:not(.wide) tbody td.col-select {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        tbody td.col-select::before {
          content: none;
        }

        /* Wide (table) mode */
        table.wide th.col-select {
          width: 48px;
          padding: 0 4px;
          vertical-align: middle;
          text-align: center;
        }

        table.wide td.col-select {
          width: 48px;
          padding: 4px;
          vertical-align: middle;
          text-align: center;
        }

        .narrow-select-all {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 4px 4px 8px;
          font-size: 14px;
          color: var(--grampsjs-body-font-color-70);
        }

        .narrow-select-all + table {
          margin-top: 12px;
        }

        tbody tr.selected {
          background-color: var(
            --md-sys-color-secondary-container,
            var(--grampsjs-color-shade-240)
          );
        }
        .col-select md-checkbox,
        .narrow-select-all md-checkbox {
          --md-checkbox-outline-color: var(--grampsjs-body-font-color-30);
          --md-checkbox-hover-outline-color: var(--grampsjs-body-font-color-50);
        }
      `,
    ]
  }

  static get properties() {
    return {
      columns: {type: Array},
      data: {type: Array},
      narrow: {type: Boolean},
      naturalWidth: {type: Boolean},
      breakPoint: {type: Number},
      loading: {type: Boolean},
      linked: {type: Boolean},
      sortable: {type: Boolean},
      sort: {type: Number},
      descending: {type: Boolean},
      serverSort: {type: Boolean},
      sortDescriptor: {type: String},
      selectable: {type: Boolean},
      selectionKey: {type: Number},
      _containerWidth: {type: Number},
      _selectedIndices: {type: Object},
    }
  }

  constructor() {
    super()
    this.columns = []
    this.data = []
    this.loading = false
    this.narrow = false
    this.naturalWidth = false
    this.breakPoint = 600
    this.linked = false
    this.sortable = false
    this.sort = -1
    this.descending = false
    this.serverSort = false
    this.sortDescriptor = ''
    this.selectable = false
    this.selectionKey = 0
    this._containerWidth = -1
    this._selectedIndices = new Set()
  }

  updated(changed) {
    if (changed.has('selectionKey')) {
      this._selectedIndices = new Set()
    }
  }

  get _isWide() {
    return this._containerWidth > this.breakPoint && !this.narrow
  }

  render() {
    return html`
      <div class="table-container">
        ${this.data.length > 0 && this.sortable && !this._isWide
          ? this._renderMobileSort()
          : ''}
        ${this.selectable && !this._isWide ? this._renderNarrowSelectAll() : ''}

        <table
          class="${classMap({
            wide: this._isWide,
            linked: this.linked,
          })}"
          style="${this.naturalWidth && this._isWide
            ? 'width: auto;'
            : 'width: 100%;'}"
        >
          <thead>
            <tr>
              ${this.selectable && this._isWide
                ? html`<th class="col-select">
                    <md-checkbox
                      ?checked="${this._selectedIndices.size ===
                        this.data.length && this.data.length > 0}"
                      ?indeterminate="${this._selectedIndices.size > 0 &&
                      this._selectedIndices.size < this.data.length}"
                      @change="${this._handleSelectAll}"
                      aria-label="${this._('_Select All')}"
                    ></md-checkbox>
                  </th>`
                : ''}
              ${this.columns.map((column, columnIndex) =>
                this._renderHeaderCell(column, columnIndex)
              )}
            </tr>
          </thead>
          <tbody>
            ${this._sortedRows().map(
              ({item, index}) => html`
                <tr
                  class="${this._selectedIndices.has(index) ? 'selected' : ''}"
                  @click="${() => this._handleRowClick(index)}"
                  @keydown="${clickKeyHandler}"
                  tabindex="${this.linked ? '0' : '-1'}"
                >
                  ${this.selectable
                    ? html`<td
                        class="col-select"
                        @click="${e => e.stopPropagation()}"
                      >
                        <md-checkbox
                          ?checked="${this._selectedIndices.has(index)}"
                          @change="${() => this._handleSelectRow(index)}"
                          aria-label="${this._('Select')}"
                        ></md-checkbox>
                      </td>`
                    : ''}
                  ${item.map(
                    (value, colIndex) => html`
                      <td
                        data-label="${this._colLabel(
                          this.columns[colIndex].name
                        )}"
                      >
                        <div class="cell-content">
                          ${this.loading
                            ? html`<span class="skeleton"
                                ><span style="visibility: hidden;"
                                  >${this._formatValue(
                                    this.columns[colIndex],
                                    value
                                  )}</span
                                ></span
                              >`
                            : this._formatValue(this.columns[colIndex], value)}
                        </div>
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

  _renderMobileSort() {
    const hasActive = this.serverSort
      ? this._getActiveSortColumn() >= 0
      : this.sort >= 0
    const isAscending = this.serverSort
      ? !this._isSortDescending()
      : !this.descending
    return html`
      <div class="mobile-sort">
        <md-icon-button @click="${this._toggleSortMenu}" id="btn-sort-menu">
          <md-icon>${this._renderSortIcon(hasActive, isAscending)}</md-icon>
        </md-icon-button>
        <md-menu id="sort-menu" anchor="btn-sort-menu">
          ${this.columns
            .filter(col => !this.serverSort || col.sortKey)
            .map((column, columnIndex) => {
              const realIndex = this.columns.indexOf(column)
              const isSelected = this.serverSort
                ? this._getActiveSortColumn() === realIndex
                : this.sort === realIndex
              return html`
                <md-menu-item
                  @click="${() => this._toggleSort(realIndex)}"
                  ?selected="${isSelected}"
                >
                  <div slot="headline">${this._colLabel(column.name)}</div>
                </md-menu-item>
              `
            })}
        </md-menu>
      </div>
    `
  }

  _toggleSortMenu() {
    const menu = this.renderRoot.querySelector('#sort-menu')
    menu.open = !menu.open
  }

  _colLabel(name) {
    return this._(name).replace(/:$/, '')
  }

  // eslint-disable-next-line class-methods-use-this
  _formatValue(column, value) {
    if (value === null || value === undefined) {
      return ''
    }
    let returnValue = value
    if (column.format) {
      returnValue = column.format(value)
    }
    if (column.unit) {
      returnValue = `${returnValue} ${column.unit}`
    }
    return returnValue
  }

  _renderHeaderCell(column, columnIndex) {
    const label = this._colLabel(column.name)
    if (!this.sortable || (this.serverSort && !column.sortKey)) {
      return html`<th>${label}</th>`
    }
    const isCurrent = this.serverSort
      ? this._getActiveSortColumn() === columnIndex
      : this.sort === columnIndex
    const isDescending = this.serverSort
      ? this._isSortDescending()
      : this.descending
    let ariaSort = 'none'
    if (isCurrent) ariaSort = isDescending ? 'descending' : 'ascending'
    return html`<th aria-sort="${ariaSort}">
      <button
        class="sort-header"
        @click="${() => this._toggleSort(columnIndex)}"
      >
        ${label}
        ${renderIconSvg(
          isCurrent && isDescending ? mdiArrowDown : mdiArrowUp,
          'currentColor'
        )}
      </button>
    </th>`
  }

  _toggleSort(columnIndex) {
    if (this.serverSort) {
      const col = this.columns[columnIndex]
      if (!col?.sortKey) return
      const isCurrent = this._getActiveSortColumn() === columnIndex
      const wasDescending = this._isSortDescending()
      const descending = isCurrent ? !wasDescending : false
      fireEvent(this, 'table:sort-changed', {key: col.sortKey, descending})
      return
    }
    if (this.sort === columnIndex) {
      this.descending = !this.descending
    } else {
      this.sort = columnIndex
      this.descending = false
    }
  }

  _getActiveSortColumn() {
    if (!this.sortDescriptor) return -1
    const key = this.sortDescriptor.substring(1)
    return this.columns.findIndex(col => col.sortKey === key)
  }

  _isSortDescending() {
    return this.sortDescriptor?.startsWith('-') ?? false
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSortIcon(isCurrent, isAscending) {
    if (isCurrent) {
      if (isAscending) {
        return renderIconSvg(
          mdiSortAscending,
          'var(--grampsjs-body-font-color-60)'
        )
      }
      return renderIconSvg(
        mdiSortDescending,
        'var(--grampsjs-body-font-color-60)'
      )
    }
    return renderIconSvg(mdiSort, 'var(--grampsjs-body-font-color-20)')
  }

  _renderNarrowSelectAll() {
    return html`
      <div class="narrow-select-all">
        <md-checkbox
          ?checked="${this._selectedIndices.size === this.data.length &&
          this.data.length > 0}"
          ?indeterminate="${this._selectedIndices.size > 0 &&
          this._selectedIndices.size < this.data.length}"
          @change="${this._handleSelectAll}"
          aria-label="${this._('_Select All')}"
        ></md-checkbox>
        <span>${this._('_Select All')}</span>
      </div>
    `
  }

  _handleSelectAll() {
    const willSelectAll = this._selectedIndices.size < this.data.length
    this._selectedIndices = willSelectAll
      ? new Set(this.data.map((_, i) => i))
      : new Set()
    fireEvent(this, 'selection:changed', {indices: [...this._selectedIndices]})
  }

  _handleSelectRow(index) {
    const next = new Set(this._selectedIndices)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    this._selectedIndices = next
    fireEvent(this, 'selection:changed', {indices: [...this._selectedIndices]})
  }

  _sortedRows() {
    const indexed = this.data.map((item, index) => ({item, index}))
    if (!this.serverSort && this.sortable && this.sort >= 0) {
      const col = this.sort
      const dir = this.descending ? -1 : 1
      indexed.sort((a, b) => {
        if (a.item[col] > b.item[col]) return dir
        if (a.item[col] < b.item[col]) return -dir
        return 0
      })
    }
    return indexed
  }

  _handleRowClick(originalIndex) {
    fireEvent(this, 'table:row-click', {rowNumber: originalIndex})
  }

  firstUpdated() {
    const container = this.renderRoot.querySelector('.table-container')
    this._resizeObserver = new ResizeObserver(() => this.handleResize())
    this._resizeObserver.observe(container)
    this.handleResize()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._resizeObserver?.disconnect()
  }

  handleResize() {
    const container = this.renderRoot.querySelector('.table-container')
    if (container) {
      this._containerWidth = container.offsetWidth
    }
  }
}

window.customElements.define('grampsjs-table', GrampsjsTable)
