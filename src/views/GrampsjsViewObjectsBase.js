/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/

import {html, css} from 'lit'
import {mdiPlus, mdiCog} from '@mdi/js'

import '@material/web/fab/fab.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/checkbox/checkbox.js'
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

        .column-picker-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }

        .column-picker-row label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 15px;
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
      _showColumnPicker: {type: Boolean},
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
    this._showColumnPicker = false
  }

  get _visibleColumns() {
    const saved = this.appState?.settings?.columns?.[this._objectsName]
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved
        .map(key => this._columns.find(col => col.key === key))
        .filter(Boolean)
    }
    return this._columns.filter(col => col.defaultVisible !== false)
  }

  get _tableBreakPoint() {
    return Math.min(960, Math.max(500, this._visibleColumns.length * 160))
  }

  get _tableData() {
    return this._data.map(row => this._visibleColumns.map(col => row[col.key]))
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
              .columns="${this._visibleColumns}"
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

      ${this.canAdd ? this.renderFab() : ''} ${this._renderColumnPickerDialog()}
    `
  }

  get canAdd() {
    return this.appState.permissions.canAdd
  }

  // eslint-disable-next-line class-methods-use-this
  renderAltView() {
    return ''
  }

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
      <div class="viewbtn">
        ${this._renderViewButton()}
        <md-icon-button
          title="${this._('Columns')}"
          aria-label="${this._('Columns')}"
          @click="${() => {
            this._showColumnPicker = true
          }}"
        >
          <grampsjs-icon .path="${mdiCog}" height="22"></grampsjs-icon>
        </md-icon-button>
      </div>

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

  _renderColumnPickerDialog() {
    const visibleKeys = this._visibleColumns.map(c => c.key)
    return html`
      <md-dialog
        ?open="${this._showColumnPicker}"
        @cancel="${() => {
          this._showColumnPicker = false
        }}"
        @close="${() => {
          this._showColumnPicker = false
        }}"
      >
        <div slot="headline">${this._('Columns')}</div>
        <div slot="content">
          ${this._columns.map(
            col => html`
              <div class="column-picker-row">
                <label for="col-${col.key}">
                  <md-checkbox
                    id="col-${col.key}"
                    ?checked="${visibleKeys.includes(col.key)}"
                    ?disabled="${visibleKeys.length === 1 &&
                    visibleKeys.includes(col.key)}"
                    @change="${e =>
                      this._toggleColumn(col.key, e.target.checked)}"
                  ></md-checkbox>
                  ${this._colLabel(col.name)}
                </label>
              </div>
            `
          )}
        </div>
        <div slot="actions">
          <md-text-button @click="${this._resetColumns}">
            ${this._('Reset')}
          </md-text-button>
          <md-text-button
            @click="${() => {
              this._showColumnPicker = false
            }}"
          >
            ${this._('Close')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _colLabel(name) {
    return this._(name).replace(/:$/, '')
  }

  _resetColumns() {
    const existingColumns = {...(this.appState.settings?.columns || {})}
    delete existingColumns[this._objectsName]
    this.appState.updateSettings({columns: existingColumns}, true)
  }

  _toggleColumn(key, visible) {
    const currentVisible = this._visibleColumns.map(c => c.key)
    let newVisible
    if (visible) {
      newVisible = this._columns
        .filter(col => col.key === key || currentVisible.includes(col.key))
        .map(col => col.key)
    } else {
      newVisible = currentVisible.filter(k => k !== key)
    }
    if (newVisible.length === 0) return
    const existingColumns = this.appState.settings?.columns || {}
    this.appState.updateSettings(
      {columns: {...existingColumns, [this._objectsName]: newVisible}},
      true
    )
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
