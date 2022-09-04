/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/

import {html, css} from 'lit'
import {mdiSort, mdiSortAscending, mdiSortDescending} from '@mdi/js'

import '@material/mwc-fab'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsPagination.js'
import {apiGet} from '../api.js'
import {fireEvent} from '../util.js'
import {renderIcon} from '../icons.js'

export class GrampsjsViewObjectsBase extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        table {
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 14px;
          margin-top: 20px;
          width: 100%;
        }

        th {
          padding: 12px 20px;
          font-size: 13px;
          color: #666;
          font-weight: 400;
          vertical-align: top;
          line-height: 24px;
        }

        td {
          padding: 12px 20px;
          height: 17px;
          line-height: 17px;
        }

        td > div {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        th,
        td {
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

        .sortbtn {
          margin-left: 1em;
          display: inline-block;
        }

        .sortbtn mwc-icon-button {
          --mdc-icon-button-size: 32px;
          position: relative;
          top: -4px;
        }

        .sortbtn mwc-icon-button svg {
          height: 20px;
          position: relative;
          top: -4px;
        }

        mwc-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _columns: {type: Object},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number},
      _pageSize: {type: Number},
      _sort: {type: String},
      _filters: {type: Array},
      canAdd: {type: Boolean},
      filters: {type: Array},
      filterOpen: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._data = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
    this._pageSize = 20
    this._sort = ''
    this._filters = []
    this.canAdd = false
    this.filters = []
    this.filterOpen = false
  }

  renderContent() {
    return html`
      ${this._renderFilter()}
      <table class="linked">
        <tr>
          ${Object.keys(this._columns).map(
            column => html`
              <th>
                ${this._(this._columns[column].title)}
                ${this._renderSortBtn(column)}
              </th>
            `,
            this
          )}
        </tr>
        ${this._data.map(
          obj => html`
            <tr @click=${() => this._handleClick(obj)}>
              ${Object.keys(this._columns).map(
                column => html` <td><div>${obj[column]}</div></td> `,
                this
              )}
            </tr>
          `
        )}
      </table>

      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        @page:changed="${this._handlePageChanged}"
        .strings="${this.strings}"
      ></grampsjs-pagination>

      ${this.canAdd ? this.renderFab() : ''}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderFilter() {
    return html` <pre>${JSON.stringify(this.filters, null, 2)}</pre>
      <mwc-button
        icon="filter_list"
        ?unelevated="${this.filterOpen}"
        @click="${this._handleFilterButton}"
        >${this._('filter')}</mwc-button
      >
      <div id="container" @filter:changed="${this._handleFilterChanged}">
        ${this.filterOpen ? html`${this.renderFilters()}` : ''}
      </div>`
  }

  // eslint-disable-next-line class-methods-use-this
  renderFilters() {
    return html`SLOT`
  }

  renderFab() {
    return html` <mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab> `
  }

  firstUpdated() {
    this._fetchData()
  }

  _handleFilterButton() {
    this.filterOpen = !this.filterOpen
  }

  _handleFilterChanged(e) {
    const rules = e.detail?.filters?.rules
    const replace = e.detail?.replace
    const oldFilters = replace
      ? this.filters.filter(f => f.name !== replace)
      : this.filters
    if (rules) {
      this.filters = [...oldFilters, ...rules]
      e.preventDefault()
      e.stopPropagation()
      this._fetchData()
    }
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
  }

  _handleClick(obj) {
    fireEvent(this, 'nav', {path: this._getItemPath(obj)})
  }

  _handleClickAdd() {
    fireEvent(this, 'nav', {path: this._getAddPath()})
  }

  _renderSortBtn(column) {
    const sortKey = this._columns[column].sort
    if (!sortKey) {
      return ''
    }
    const isCurrent = this._sort.substring(1) === sortKey
    const isAscending = isCurrent && this._sort.substring(0, 1) === '+'
    return html` <div class="sortbtn ${isCurrent ? 'current-sort' : ''}">
      <mwc-icon-button
        @click="${() => this._toggleSort(sortKey, isCurrent, isAscending)}"
      >
        ${this._renderSortIcon(isCurrent, isAscending)}
      </mwc-icon-button>
    </div>`
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSortIcon(isCurrent, isAscending) {
    if (isCurrent) {
      if (isAscending) {
        renderIcon(mdiSortAscending, 'rgba(0, 0, 0, 0.6)')
      }
      return renderIcon(mdiSortDescending, 'rgba(0, 0, 0, 0.6)')
    }
    return renderIcon(mdiSort, 'rgba(0, 0, 0, 0.2)')
  }

  _toggleSort(sortKey, isCurrent, isAscending) {
    this._sort = isCurrent && isAscending ? `-${sortKey}` : `+${sortKey}`
  }

  get _fullUrl() {
    let url = `${this._fetchUrl}&page=${this._page}&pagesize=${this._pageSize}`
    if (this._sort) {
      url = `${url}&sort=${this._sort}`
    }
    const filters = Object.values(this.filters)
    if (filters.length > 0) {
      url = `${url}&rules=${encodeURIComponent(
        JSON.stringify({rules: filters})
      )}`
    }
    return url
  }

  update(changed) {
    super.update(changed)
    if (
      changed.has('_page') ||
      changed.has('_sort') ||
      changed.has('_pageSize') ||
      changed.has('strings')
    ) {
      this._fetchData()
    }
  }

  _fetchData() {
    this.loading = true
    apiGet(this._fullUrl).then(data => {
      this.loading = false
      if ('data' in data) {
        this.error = false
        this._data = data.data.map(row => this._formatRow(row, this))
        this._totalCount = data.total_count
        this._pages = Math.ceil(this._totalCount / this._pageSize)
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow() {
    return {}
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return ''
  }
}
