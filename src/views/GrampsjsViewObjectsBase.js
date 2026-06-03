/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/

import {html, css} from 'lit'
import {mdiPlus} from '@mdi/js'

import '@material/web/fab/fab.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTable.js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsPagination.js'
import '../components/GrampsjsFilterChip.js'
import '../components/GrampsjsFilters.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'

import {fireEvent} from '../util.js'

export class GrampsjsViewObjectsBase extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        grampsjs-table {
          margin-top: 20px;
        }

        md-fab {
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
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _rawData: {type: Array},
      _columns: {type: Array},
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
    this._columns = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
    this._pageSize = 24
    this._sort = '-change'
    this._objectsName = ''
    this.altView = false
    this._oldUrl = ''
  }

  get _tableBreakPoint() {
    return Math.min(960, Math.max(500, this._columns.length * 160))
  }

  get _tableData() {
    return this._data.map(row => this._columns.map(col => row[col.key]))
  }

  renderContent() {
    return html`
      ${this._renderFilter()}
      ${this.altView
        ? this.renderAltView()
        : html`
            <grampsjs-table
              serverSort
              sortable
              linked
              ?loading="${this.loading}"
              .columns="${this._columns}"
              .data="${this._tableData}"
              sortDescriptor="${this._sort}"
              breakPoint="${this._tableBreakPoint}"
              .appState="${this.appState}"
              @table:row-click="${this._handleTableRowClick}"
              @table:sort-changed="${this._handleTableSortChanged}"
            ></grampsjs-table>
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
        class="${this.filterOpen ? '' : 'hidden'}"
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
    return html`
      <md-fab variant="secondary" @click=${this._handleClickAdd}>
        <grampsjs-icon
          slot="icon"
          .path="${mdiPlus}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  _handleFiltersChanged() {
    this._page = 1
    this._fetchData()
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
  }

  _handleTableRowClick(e) {
    const {rowNumber} = e.detail
    fireEvent(this, 'nav', {path: this._getItemPath(this._data[rowNumber])})
  }

  _handleTableSortChanged(e) {
    const {key, descending} = e.detail
    this._page = 1
    this._sort = `${descending ? '-' : '+'}${key}`
  }

  _handleClickAdd() {
    fireEvent(this, 'nav', {path: this._getAddPath()})
  }

  get _filters() {
    return this.renderRoot.querySelector('grampsjs-filters')
  }

  get _fullUrl() {
    let url = `${this._fetchUrl}&page=${this._page}&pagesize=${this._pageSize}`
    if (this._sort) {
      url = `${url}&sort=${this._sort}`
    }
    const filters = Object.values(this._filters.filters).map(
      // eslint-disable-next-line no-unused-vars
      ({_slot, ...rule}) => rule
    )
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

  handleUpdateStaleData() {
    this._fetchData()
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
