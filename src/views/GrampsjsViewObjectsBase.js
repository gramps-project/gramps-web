/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/

import {html, css} from 'lit'
import {
  mdiPlus,
  mdiCog,
  mdiCheckboxMultipleOutline,
  mdiLock,
  mdiLockOpenVariantOutline,
} from '@mdi/js'

import '@material/web/fab/fab.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/checkbox/checkbox.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/radio/radio.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTable.js'
import '../components/GrampsjsTagChips.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsFormNewTag.js'
import '../components/GrampsjsSearchResultList.js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsPagination.js'
import '../components/GrampsjsFilterChip.js'
import '../components/GrampsjsFilters.js'
import '../components/GrampsjsGetStarted.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'

import {apiVersionAtLeast, fireEvent, treeIsEmpty} from '../util.js'
import {awaitTaskResponse} from '../taskResponse.js'
import {tagFilter} from '../filterDefinitions.js'
import {fetchAllTags} from '../tags.js'

// Deleting or editing more objects than this runs in a background task
const BACKGROUND_THRESHOLD = 10

// Batch actions that open a dialog to edit the selected objects
const EDIT_ACTIONS = ['addTag', 'removeTag', 'privacy']

/* Column showing the tags of a row, expects `tags` as a list of tag objects
(from `extend=tag_list`) */
export const tagsColumn = {
  name: 'Tags',
  key: 'tags',
  hideWhenEmpty: true,
  format: tags =>
    tags?.length
      ? html`<grampsjs-tag-chips dense .data="${tags}"></grampsjs-tag-chips>`
      : '',
}

/* Column showing whether a row is private, offered only to users who can view
private records. Expects `private` as the rendered icon, which _fetchData adds
to every row. */
export const privacyColumn = {
  name: 'Privacy',
  key: 'private',
  sortKey: 'private',
  defaultVisible: false,
  viewPrivate: true,
}

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

        .batch-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 24px;
          padding: 6px 4px;
          margin-top: 8px;
        }

        .batch-toolbar .selection-count {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          color: var(--grampsjs-text-secondary-color);
        }

        .batch-toolbar md-filled-select {
          --md-filled-select-text-field-container-height: 36px;
          --md-filled-select-text-field-top-space: 0px;
          --md-filled-select-text-field-bottom-space: 0px;
        }

        /* the indicators share one place, _openProgress shows one at a time */
        .batch-toolbar .progress {
          display: inline-grid;
        }

        .batch-toolbar .progress > * {
          grid-area: 1 / 1;
        }

        .edit-dialog {
          /* md-list defaults to --md-sys-color-surface, but md-dialog uses
             surface-container-high */
          --md-list-container-color: var(--md-sys-color-surface-container-high);
        }

        .privacy-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 0;
        }

        .privacy-options label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
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
      _showDeleteDialog: {type: Boolean},
      _deleting: {type: Boolean},
      _editing: {type: Boolean},
      _editDialog: {type: String},
      _editTags: {type: Array},
      _editTagHandle: {type: String},
      _editPrivate: {type: Boolean},
      _selectingAll: {type: Boolean},
      _deleteBlockedInfo: {type: Object},
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
    this._showDeleteDialog = false
    this._deleting = false
    this._editing = false
    // The open edit dialog, one of EDIT_ACTIONS, or ''
    this._editDialog = ''
    // Handles the open edit dialog applies to. Creating a tag in the dialog
    // reloads the list, which clears the selection.
    this._editHandles = []
    // Tags offered for removal, null while loading
    this._editTags = null
    this._editTagHandle = ''
    // Privacy chosen in the privacy dialog, null until chosen
    this._editPrivate = null
    this._selectingAll = false
    // Rows of all objects matching the filters, while they are all selected
    this._allMatchingRows = null
    // Token of the pending "select all"
    this._selectAllRequest = null
    this._deleteBlockedInfo = null
    this._showActionError = false
    this._currentAction = ''
  }

  // eslint-disable-next-line class-methods-use-this
  get _supportsMerge() {
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  get _supportsDelete() {
    return true
  }

  // Tagging and setting the privacy of many objects requires API version 3.26
  get _supportsEdit() {
    return apiVersionAtLeast(this.appState?.dbInfo, 3, 26)
  }

  // resolves to why the selected objects can't be deleted, as
  // {title, message}, or null
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async _deleteBlocked(handles) {
    return null
  }

  // eslint-disable-next-line class-methods-use-this
  _getObjectLabel(rawObj) {
    return rawObj?.gramps_id || ''
  }

  // The columns this user can choose from
  get _offeredColumns() {
    const canViewPrivate = this.appState?.permissions?.canViewPrivate
    return this._columns.filter(col => canViewPrivate || !col.viewPrivate)
  }

  get _visibleColumns() {
    const columns = this._offeredColumns
    const saved = this.appState?.settings?.columns?.[this._objectsName]
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const filtered = saved
        .map(key => columns.find(col => col.key === key))
        .filter(Boolean)
      if (filtered.length > 0) return filtered
    }
    return columns.filter(col => col.defaultVisible !== false)
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
      ${this._showGetStarted
        ? this._renderGetStarted()
        : this.altView
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
              .rowHrefs="${this._data.map(
                item => `/${this._getItemPath(item)}`
              )}"
              @table:row-click="${this._handleTableRowClick}"
              @table:sort-changed="${this._handleTableSortChanged}"
              @selection:changed="${this._handleSelectionChanged}"
            ></grampsjs-table>
          `}
      ${this._showGetStarted ? '' : this._renderPagination()}
      ${this.canAdd ? this.renderFab() : ''} ${this._renderColumnPickerDialog()}
    `
  }

  get canAdd() {
    return this.appState.permissions.canAdd
  }

  // In an empty tree, users who can add people see how to start in place of
  // an empty list. Filters cannot match anything there, so they don't matter.
  // This uses the global permission: views override canAdd for their own
  // objects, such as families, which need edit permission too.
  get _showGetStarted() {
    return this.appState.permissions.canAdd && treeIsEmpty(this.appState.dbInfo)
  }

  _renderGetStarted() {
    return html`<grampsjs-get-started
      .appState="${this.appState}"
    ></grampsjs-get-started>`
  }

  _renderPagination() {
    return html`
      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        total="${this._totalCount}"
        pageSize="${this._pageSize}"
        @page:changed="${this._handlePageChanged}"
        .appState="${this.appState}"
      ></grampsjs-pagination>
    `
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
        .definitions="${this.filterDefinitions}"
        namespace="${this.filterNamespace}"
        ?errorGoql="${this.error}"
      >
        ${this.appState.permissions.canEdit ? this._renderSelectButton() : ''}
        ${this._renderToolbarTrailing()}
      </grampsjs-filters>
    `
  }

  _renderSelectButton() {
    const icon = html`<grampsjs-icon
      slot="icon"
      .path="${mdiCheckboxMultipleOutline}"
      height="20"
      color="currentColor"
    ></grampsjs-icon>`
    return this._selectionMode
      ? html`<md-filled-button
          slot="leading"
          @click="${this._toggleSelectionMode}"
        >
          ${icon} ${this._('Select')}
        </md-filled-button>`
      : html`<md-outlined-button
          slot="leading"
          @click="${this._toggleSelectionMode}"
        >
          ${icon} ${this._('Select')}
        </md-outlined-button>`
  }

  // controls at the end of the toolbar, each with slot="trailing"
  _renderToolbarTrailing() {
    return html`
      <md-icon-button
        slot="trailing"
        title="${this._('Columns')}"
        aria-label="${this._('Columns')}"
        @click="${() => {
          this._showColumnPicker = true
        }}"
      >
        <grampsjs-icon .path="${mdiCog}" height="22"></grampsjs-icon>
      </md-icon-button>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSelectPage() {
    return ''
  }

  _renderBatchToolbar() {
    return html`
      <div class="batch-toolbar">
        <span class="selection-count">
          ${this._renderSelectPage()}
          <span>${this._('%s selected', this._selectedHandles.length)}</span>
        </span>
        ${this._canSelectAllMatching
          ? html`<md-text-button
              ?disabled="${this._selectingAll}"
              @click="${this._selectAllMatching}"
            >
              ${this._('_Select All')} (${this._totalCount})
            </md-text-button>`
          : ''}
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
          ${this._supportsEdit
            ? html`<md-select-option value="addTag">
                  ${this._('Add Tag')}
                </md-select-option>
                <md-select-option value="removeTag">
                  ${this._('Remove Tag')}
                </md-select-option>
                <md-select-option value="privacy">
                  ${this._('Privacy')}
                </md-select-option>`
            : ''}
          ${this._supportsDelete
            ? html`<md-select-option value="delete">
                ${this._('Delete')}
              </md-select-option>`
            : ''}
        </md-filled-select>
        <md-outlined-button
          ?disabled="${!this._currentAction ||
          this._deleting ||
          this._editing ||
          this._selectingAll}"
          @click="${this._handleApplyAction}"
        >
          ${this._('Apply')}
        </md-outlined-button>
        <span class="progress">
          <grampsjs-task-progress-indicator
            id="progress-delete"
            taskName="deleteObjectsByHandle"
            size="20"
            .appState="${this.appState}"
          ></grampsjs-task-progress-indicator>
          <grampsjs-task-progress-indicator
            id="progress-edit"
            taskName="editObjectsByHandle"
            size="20"
            .appState="${this.appState}"
          ></grampsjs-task-progress-indicator>
        </span>
      </div>
      ${this._renderMergeDialog()} ${this._renderDeleteDialog()}
      ${this._renderDeleteBlockedDialog()} ${this._renderActionErrorDialog()}
      ${this._renderAddTagDialog()} ${this._renderRemoveTagDialog()}
      ${this._renderPrivacyDialog()}
    `
  }

  async _handleApplyAction() {
    const action = this._currentAction
    if (EDIT_ACTIONS.includes(action)) {
      if (this._selectedHandles.length >= 1) {
        this._openEditDialog(action)
      } else {
        this._showActionError = true
      }
    } else if (action === 'merge') {
      if (this._selectedHandles.length === 2) {
        this._showMergeDialog = true
      } else {
        this._showActionError = true
      }
    } else if (action === 'delete') {
      if (this._selectedHandles.length >= 1) {
        this._deleteBlockedInfo = await this._deleteBlocked(
          this._selectedHandles
        )
        this._showDeleteDialog = !this._deleteBlockedInfo
      } else {
        this._showActionError = true
      }
    }
  }

  _renderActionErrorDialog() {
    const message =
      this._currentAction === 'merge'
        ? this._('Exactly two objects must be selected to perform a merge.')
        : this._('No objects selected.')
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
        <div slot="content">${message}</div>
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

  _renderDeleteBlockedDialog() {
    if (!this._deleteBlockedInfo) return ''
    return html`
      <md-dialog
        open
        @close="${() => {
          this._deleteBlockedInfo = null
        }}"
      >
        <div slot="headline">${this._deleteBlockedInfo.title}</div>
        <div slot="content">${this._deleteBlockedInfo.message}</div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this._deleteBlockedInfo = null
            }}"
          >
            ${this._('OK')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _renderDeleteDialog() {
    if (!this._showDeleteDialog) return ''
    const count = this._selectedHandles.length
    return html`
      <md-dialog
        ?open="${this._showDeleteDialog}"
        @cancel="${() => {
          this._showDeleteDialog = false
        }}"
        @close="${() => {
          this._showDeleteDialog = false
        }}"
      >
        <div slot="headline">
          ${count === 1
            ? this._('Delete this object?')
            : this._('Delete %s objects?', count)}
        </div>
        <div slot="content">${this._('This action cannot be undone.')}</div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this._showDeleteDialog = false
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleDelete}">
            ${this._('Delete')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  // Deletes more than a few objects in a background task where the API
  // supports it; older APIs ignore the flag and delete right away
  async _handleDelete() {
    this._showDeleteDialog = false
    this._deleting = true
    const prog = this._openProgress('#progress-delete')
    const handles = this._selectedHandles
    const query = handles.length > BACKGROUND_THRESHOLD ? '?background=1' : ''
    const res = await this.appState.apiPost(
      `/api/objects/delete-by-handle/${query}`,
      {namespace: this._objectsName, handles},
      {dbChanged: false}
    )
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: 'Delete',
      taskName: 'deleteObjectsByHandle',
    })
    this._deleting = false
    if (outcome.error !== undefined) {
      if (outcome.error) {
        fireEvent(this, 'grampsjs:error', {message: outcome.error})
      }
      return
    }
    fireEvent(window, 'db:changed')
    this._clearSelection()
  }

  // Opens the progress indicator, hiding the other one in the same place,
  // which may still show the outcome of the previous action
  _openProgress(selector) {
    const prog = this.renderRoot.querySelector(selector)
    ;['#progress-delete', '#progress-edit']
      .filter(other => other !== selector)
      .forEach(other => {
        const el = this.renderRoot.querySelector(other)
        if (el) el.open = false
      })
    prog.reset()
    prog.open = true
    return prog
  }

  async _openEditDialog(action) {
    this._editHandles = this._selectedHandles
    this._editTagHandle = ''
    this._editPrivate = null
    this._editDialog = action
    if (action === 'removeTag') {
      this._editTags = null
      const res = await fetchAllTags(this.appState)
      if (this._editDialog !== 'removeTag') {
        return
      }
      if ('error' in res) {
        this._closeEditDialog()
        fireEvent(this, 'grampsjs:error', {message: res.error})
        return
      }
      this._editTags = res.data ?? []
    }
  }

  _closeEditDialog() {
    this._editDialog = ''
    this._editHandles = []
  }

  _renderAddTagDialog() {
    if (this._editDialog !== 'addTag') return ''
    return html`
      <grampsjs-form-new-tag
        .appState="${this.appState}"
        .data="${[]}"
        dialogTitle="${this._('Add Tag')}"
        @object:save="${this._handleAddTagSave}"
        @object:cancel="${this._closeEditDialog}"
      ></grampsjs-form-new-tag>
    `
  }

  _handleAddTagSave(e) {
    e.preventDefault()
    e.stopPropagation()
    const [tagHandle] = e.detail.data
    const handles = this._editHandles
    this._closeEditDialog()
    if (!tagHandle) return Promise.resolve()
    return this._editObjects(handles, [{op: 'add_tag', handle: tagHandle}])
  }

  _renderRemoveTagDialog() {
    if (this._editDialog !== 'removeTag') return ''
    return html`
      <md-dialog class="edit-dialog" open @close="${this._closeEditDialog}">
        <div slot="headline">${this._('Remove Tag')}</div>
        <div slot="content">
          ${this._editTags
            ? html`<grampsjs-search-result-list
                selectable
                activatable
                .data="${this._editTags.map(tag => ({
                  object_type: 'tag',
                  object: tag,
                  handle: tag.handle,
                }))}"
                .appState="${this.appState}"
                @search-result:clicked="${e => {
                  this._editTagHandle = e.detail.handle
                }}"
              ></grampsjs-search-result-list>`
            : ''}
        </div>
        <div slot="actions">
          <md-text-button @click="${this._closeEditDialog}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${!this._editTagHandle}"
            @click="${this._handleRemoveTagApply}"
          >
            ${this._('Apply')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _handleRemoveTagApply() {
    const handles = this._editHandles
    const tagHandle = this._editTagHandle
    this._closeEditDialog()
    return this._editObjects(handles, [{op: 'remove_tag', handle: tagHandle}])
  }

  _renderPrivacyDialog() {
    if (this._editDialog !== 'privacy') return ''
    const option = (value, label) => html`
      <label>
        <md-radio
          name="privacy"
          .checked="${this._editPrivate === value}"
          @change="${() => {
            this._editPrivate = value
          }}"
        ></md-radio>
        <span>${label}</span>
      </label>
    `
    return html`
      <md-dialog class="edit-dialog" open @close="${this._closeEditDialog}">
        <div slot="headline">${this._('Privacy')}</div>
        <div slot="content">
          <div class="privacy-options" role="radiogroup">
            ${option(true, this._('Record is private'))}
            ${option(false, this._('Record is public'))}
          </div>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._closeEditDialog}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${this._editPrivate === null}"
            @click="${this._handlePrivacyApply}"
          >
            ${this._('Apply')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _handlePrivacyApply() {
    const handles = this._editHandles
    const value = this._editPrivate
    this._closeEditDialog()
    return this._editObjects(handles, [{op: 'set_private', value}])
  }

  // Applies the edit operations to the objects, in a background task for
  // more than a few objects
  async _editObjects(handles, operations) {
    this._editing = true
    const prog = this._openProgress('#progress-edit')
    const query = handles.length > BACKGROUND_THRESHOLD ? '?background=1' : ''
    const res = await this.appState.apiPost(
      `/api/objects/edit-by-handle/${query}`,
      {namespace: this._objectsName, handles, operations},
      {dbChanged: false}
    )
    const outcome = await awaitTaskResponse(this.appState, res, {
      prog,
      label: 'Edit',
      taskName: 'editObjectsByHandle',
    })
    this._editing = false
    if (outcome.error !== undefined) {
      if (outcome.error) {
        fireEvent(this, 'grampsjs:error', {message: outcome.error})
      }
      return
    }
    fireEvent(window, 'db:changed')
    this._clearSelection()
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
    this._clearSelection()
  }

  // groups of filters offered in the filter bar, see filterDefinitions.js
  get filterDefinitions() {
    return [tagFilter(s => this._(s))]
  }

  // endpoint name of the rule catalogue of the condition builder
  get filterNamespace() {
    return this._objectsName
  }

  renderFab() {
    return html`
      <md-fab variant="primary" @click=${this._handleClickAdd}>
        <grampsjs-icon
          slot="icon"
          .path="${mdiPlus}"
          color="currentColor"
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
          ${this._offeredColumns.map(
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
    this._cancelSelectAll()
    this._allMatchingRows = null
    this._selectedHandles = indices
      .map(i => this._rawData[i]?.handle)
      .filter(Boolean)
  }

  _clearSelection() {
    this._cancelSelectAll()
    this._allMatchingRows = null
    this._selectedHandles = []
    this._selectionKey += 1
  }

  // Any change of the selection, including by filter and page changes,
  // drops a pending "select all"
  _cancelSelectAll() {
    this._selectAllRequest = null
    this._selectingAll = false
  }

  _toggleSelectionMode() {
    this._selectionMode = !this._selectionMode
    if (!this._selectionMode) {
      this._clearSelection()
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
    return `${url}${this._filterQuery}`
  }

  // The query parameters of the active filters
  get _filterQuery() {
    const {filters} = this._filters
    if (filters.length === 0) {
      return ''
    }
    return `&rules=${encodeURIComponent(JSON.stringify({rules: filters}))}`
  }

  // The URL of all objects matching the filters, with the keys needed to
  // delete them
  get _selectAllUrl() {
    return `/api/${this._objectsName}/?keys=handle${this._filterQuery}`
  }

  // Whether the whole page is selected and more objects match the filters
  get _canSelectAllMatching() {
    return (
      !this._allMatchingRows &&
      this._rawData.length > 0 &&
      this._selectedHandles.length === this._rawData.length &&
      this._totalCount > this._rawData.length
    )
  }

  async _selectAllMatching() {
    const request = {}
    this._selectAllRequest = request
    this._selectingAll = true
    const data = await this.appState.apiGet(this._selectAllUrl)
    if (this._selectAllRequest !== request) {
      return
    }
    this._selectAllRequest = null
    this._selectingAll = false
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return
    }
    this._allMatchingRows = data.data
    this._selectedHandles = data.data.map(row => row.handle)
  }

  update(changed) {
    super.update(changed)
    if (this._fullUrl !== this._oldUrl) {
      this._fetchData()
    }
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  _fetchData() {
    this._clearSelection()
    this.loading = true
    // reset so that a failure after a failure still reaches the filters
    this.error = false
    const url = this._fullUrl
    this._oldUrl = url
    this.appState.apiGet(url).then(data => {
      this.loading = false
      if ('data' in data) {
        this._errorMessage = ''
        this.error = false
        this._rawData = data.data
        this._data = data.data.map(row => ({
          ...this._formatRow(row, this),
          private: this._renderPrivacyCell(row.private),
        }))
        this._totalCount = data.total_count
        this._pages = Math.ceil(this._totalCount / this._pageSize)
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  // A closed lock for private rows, an open outline lock for public ones
  _renderPrivacyCell(isPrivate) {
    const label = isPrivate ? 'Record is private' : 'Record is public'
    return html`<grampsjs-icon
      width="18"
      height="18"
      path="${isPrivate ? mdiLock : mdiLockOpenVariantOutline}"
      color="var(--grampsjs-body-font-color-60)"
      role="img"
      aria-label="${this._(label)}"
      title="${this._(label)}"
    ></grampsjs-icon>`
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
