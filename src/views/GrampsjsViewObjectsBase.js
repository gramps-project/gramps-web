/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/

import {html, css} from 'lit'
import {mdiSort, mdiSortAscending, mdiSortDescending} from '@mdi/js'

import '@material/mwc-fab'
import '@material/mwc-icon-button'
import '@material/mwc-icon'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsPagination.js'
import '../components/GrampsjsFilterChip.js'
import '../components/GrampsjsFilters.js'

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

        .hidden {
          display: none;
        }

        .viewbtn {
          float: right;
        }

        .viewbtn mwc-icon-button {
          color: var(--mdc-theme-primary);
        }
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _rawData: {type: Array},
      _columns: {type: Object},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number},
      _pageSize: {type: Number},
      _sort: {type: String},
      _objectsName: {type: String},
      altView: {type: Boolean},
      _oldUrl: {type: String},
    }
  }

  constructor() {
    super()
    this._data = []
    this._rawData = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
    this._pageSize = 20
    this._sort = ''
    this._objectsName = ''
    this.altView = false
    this._oldUrl = ''
  }

  renderContent() {
    return html`
      ${this._renderFilter()}
      ${this.altView
        ? this.renderAltView()
        : html`
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
          `}
      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        @page:changed="${this._handlePageChanged}"
        .appState="${this.appState}"
      ></grampsjs-pagination>

      ${this.canAdd ? this.renderFab() : ''}
    `
  }

  get canAdd() {
    return this.appState.permissions.canAdd
  }

  // eslint-disable-next-line class-methods-use-this
  renderAltView() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  _renderFilter() {
    return html`
      <grampsjs-filters
        @filters:changed="${this._handleFiltersChanged}"
        .appState="${this.appState}"
        objectType="${this._objectsName}"
        ?errorGql="${this.error}"
      >
        ${this.renderFilters()}
      </grampsjs-filters>
      <div class="viewbtn">${this._renderViewButton()}</div>

      <div
        class="${classMap({hidden: !this.filterOpen})}"
        @filter:changed="${this._handleFilterChanged}"
      ></div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderViewButton() {
    return ''
  }

  renderFilters() {
    return html`
      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>
    `
  }

  renderFab() {
    return html` <mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab> `
  }

  _handleFiltersChanged() {
    this._fetchData()
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
        id="btn-sort-${column}"
      >
        ${this._renderSortIcon(isCurrent, isAscending)}
      </mwc-icon-button>
      <grampsjs-tooltip for="btn-sort-${column}" .appState="${this.appState}"
        >${this._('Sort')}</grampsjs-tooltip
      >
    </div>`
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSortIcon(isCurrent, isAscending) {
    if (isCurrent) {
      if (isAscending) {
        return renderIcon(mdiSortAscending, 'rgba(0, 0, 0, 0.6)')
      }
      return renderIcon(mdiSortDescending, 'rgba(0, 0, 0, 0.6)')
    }
    return renderIcon(mdiSort, 'rgba(0, 0, 0, 0.2)')
  }

  _toggleSort(sortKey, isCurrent, isAscending) {
    this._sort = isCurrent && isAscending ? `-${sortKey}` : `+${sortKey}`
  }

  get _filters() {
    return this.renderRoot.querySelector('grampsjs-filters')
  }

  get _fullUrl() {
    let url = `${this._fetchUrl}&page=${this._page}&pagesize=${this._pageSize}`
    if (this._sort) {
      url = `${url}&sort=${this._sort}`
    }
    const filters = Object.values(this._filters.filters)
    if (filters.length > 0) {
      url = `${url}&rules=${encodeURIComponent(
        JSON.stringify({rules: filters})
      )}`
    }
    const gql = this._filters.query
    if (gql) {
      url = `${url}&gql=${encodeURIComponent(gql)}`
    }
    return url
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active')) {
      this.filterOpen = false
    }
    if (this._fullUrl !== this._oldUrl) {
      this._fetchData()
    }
  }

  _fetchData() {
    this.loading = true
    const url = this._fullUrl
    this._oldUrl = url
    this.appState.apiGet(url).then(data => {
      this.loading = false
      if ('data' in data) {
        this._errorMessage = ''
        this.error = false
        this._rawData = data.data
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
