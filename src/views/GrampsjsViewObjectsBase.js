/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/

import {html, css} from 'lit'
import {mdiPlus, mdiCog, mdiCheckboxMultipleOutline} from '@mdi/js'

import '@material/web/fab/fab.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/checkbox/checkbox.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
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

        .batch-toolbar {
          clear: both;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 24px;
          padding: 6px 4px;
          margin-top: 8px;
        }

        .batch-toolbar .selection-count {
          font-size: 16px;
          color: var(--grampsjs-body-font-color-70);
        }

        .batch-toolbar md-filled-select {
          --md-filled-select-text-field-container-height: 36px;
          --md-filled-select-text-field-top-space: 0px;
          --md-filled-select-text-field-bottom-space: 0px;
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
      _selectedHandles: {type: Array},
      _selectionMode: {type: Boolean},
      _selectionKey: {type: Number},
      _showMergeDialog: {type: Boolean},
      _showActionError: {type: Boolean},
      _currentAction: {type: String},
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
    this._selectedHandles = []
    this._selectionMode = false
    this._selectionKey = 0
    this._showMergeDialog = false
    this._showActionError = false
    this._currentAction = ''
  }

  // eslint-disable-next-line class-methods-use-this
  get _supportsMerge() {
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  _getObjectLabel(rawObj) {
    return rawObj?.gramps_id || ''
  }

  get _visibleColumns() {
    const saved = this.appState?.settings?.columns?.[this._objectsName]
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const filtered = saved
        .map(key => this._columns.find(col => col.key === key))
        .filter(Boolean)
      if (filtered.length > 0) return filtered
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
      ${this._selectionMode ? this._renderBatchToolbar() : ''}
      ${this.altView
        ? this.renderAltView()
        : html`
            <grampsjs-table
              serverSort
              sortable
              linked
              ?selectable="${this._selectionMode}"
              selectionKey="${this._selectionKey}"
              ?loading="${this.loading}"
              .columns="${this._visibleColumns}"
              .data="${this._tableData}"
              sortDescriptor="${this._sort}"
              breakPoint="${this._tableBreakPoint}"
              .appState="${this.appState}"
              @table:row-click="${this._handleTableRowClick}"
              @table:sort-changed="${this._handleTableSortChanged}"
              @selection:changed="${this._handleSelectionChanged}"
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
        ${this.appState.permissions.canEdit
          ? this._selectionMode
            ? html`<md-filled-button
                slot="leading"
                @click="${this._toggleSelectionMode}"
              >
                <grampsjs-icon
                  slot="icon"
                  .path="${mdiCheckboxMultipleOutline}"
                  height="20"
                  color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
                ></grampsjs-icon>
                ${this._('Select')}
              </md-filled-button>`
            : html`<md-outlined-button
                slot="leading"
                @click="${this._toggleSelectionMode}"
              >
                <grampsjs-icon
                  slot="icon"
                  .path="${mdiCheckboxMultipleOutline}"
                  height="20"
                  color="var(--mdc-theme-primary)"
                ></grampsjs-icon>
                ${this._('Select')}
              </md-outlined-button>`
          : ''}
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

  _renderBatchToolbar() {
    return html`
      <div class="batch-toolbar">
        <span class="selection-count">
          ${this._('%s selected', this._selectedHandles.length)}
        </span>
        <md-filled-select
          .value="${this._currentAction}"
          label="${this._('Action')}"
          style="min-width:140px"
          @change="${e => {
            this._currentAction = e.target.value
          }}"
        >
          ${this._supportsMerge
            ? html`<md-select-option value="merge">
                ${this._('Merge')}
              </md-select-option>`
            : ''}
        </md-filled-select>
        <md-outlined-button
          ?disabled="${!this._currentAction}"
          @click="${this._handleApplyAction}"
        >
          ${this._('Apply')}
        </md-outlined-button>
      </div>
      ${this._renderMergeDialog()} ${this._renderActionErrorDialog()}
    `
  }

  _handleApplyAction() {
    const action = this._currentAction
    if (action === 'merge') {
      if (this._selectedHandles.length === 2) {
        this._showMergeDialog = true
      } else {
        this._showActionError = true
      }
    }
  }

  _renderActionErrorDialog() {
    return html`
      <md-dialog
        ?open="${this._showActionError}"
        @cancel="${() => {
          this._showActionError = false
        }}"
        @close="${() => {
          this._showActionError = false
        }}"
      >
        <div slot="content">
          ${this._('Exactly two objects must be selected to perform a merge.')}
        </div>
        <div slot="actions">
          <md-text-button @click="${() => (this._showActionError = false)}">
            ${this._('OK')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _renderMergeDialog() {
    if (!this._showMergeDialog) return ''
    const [h1, h2] = this._selectedHandles
    const raw1 = this._rawData.find(r => r.handle === h1)
    const raw2 = this._rawData.find(r => r.handle === h2)
    return html`
      <md-dialog
        ?open="${this._showMergeDialog}"
        @cancel="${() => {
          this._showMergeDialog = false
        }}"
        @close="${() => {
          this._showMergeDialog = false
        }}"
      >
        <div slot="headline">${this._('Merge')}</div>
        <div slot="content">
          <p>
            ${this._(
              'Select the object that will provide the\nprimary data for the merged object.'
            )}
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
            <md-outlined-button @click="${() => this._handleMerge(h1, h2)}">
              ${this._getObjectLabel(raw1)}
            </md-outlined-button>
            <md-outlined-button @click="${() => this._handleMerge(h2, h1)}">
              ${this._getObjectLabel(raw2)}
            </md-outlined-button>
          </div>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this._showMergeDialog = false
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  async _handleMerge(phoenix, titanic) {
    this._showMergeDialog = false
    const result = await this.appState.apiPost(
      `/api/${this._objectsName}/${phoenix}/merge/${titanic}`,
      {}
    )
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return
    }
    this._selectionKey += 1
    this._selectedHandles = []
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
    const hiddenCol = this._columns.find(col => col.key === key)
    if (
      !visible &&
      hiddenCol?.sortKey &&
      this._sort.substring(1) === hiddenCol.sortKey
    ) {
      const fallback = this._columns.find(
        col => col.sortKey && newVisible.includes(col.key)
      )
      this._sort = fallback ? `-${fallback.sortKey}` : '-change'
    }
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

  _handleSelectionChanged(e) {
    const {indices} = e.detail
    this._selectedHandles = indices
      .map(i => this._rawData[i]?.handle)
      .filter(Boolean)
  }

  _toggleSelectionMode() {
    this._selectionMode = !this._selectionMode
    if (!this._selectionMode) {
      this._selectedHandles = []
      this._selectionKey += 1
    }
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
    this._selectedHandles = []
    this._selectionKey += 1
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
