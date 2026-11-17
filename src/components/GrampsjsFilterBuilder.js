/*
Condition builder, the advanced tier of the filter panel.

A dialog editing a tree of groups and conditions (see filterBuilder.js).
`open(tree)` shows it with a filter. Edits never change the tree passed in;
Apply fires `filter-builder:apply` with the edited tree.

Filters can be saved on this device (see savedFilters.js) and opened again
in the builder. Opening one never applies it: conditions with a rule
missing from the catalogue or an object that doesn't exist are marked and
keep Apply disabled.
*/

import {LitElement, css, html, nothing} from 'lit'
import {repeat} from 'lit/directives/repeat.js'
import {
  mdiArrowLeft,
  mdiChevronRight,
  mdiClose,
  mdiDelete,
  mdiDotsVertical,
  mdiMagnify,
  mdiPlus,
} from '@mdi/js'
import '@material/web/button/filled-button'
import '@material/web/button/text-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'
import '@material/web/dialog/dialog'
import '@material/web/iconbutton/icon-button'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/progress/circular-progress'
import '@material/web/textfield/outlined-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, menuSelectionHandler} from '../util.js'
import {
  MAX_GROUP_DEPTH,
  addChild,
  defaultValues,
  findRule,
  getNode,
  isComplete,
  isGroup,
  isRequiredParam,
  isUnknownRule,
  localizeRules,
  newCondition,
  newGroup,
  paramLabel,
  paramType,
  pickableRules,
  refersToMissing,
  removeNode,
  rulesToTree,
  searchRules,
  serializeNode,
  updateNode,
} from '../filterBuilder.js'
import {
  deleteSavedFilter,
  loadSavedFilters,
  saveFilter,
} from '../savedFilters.js'
import './GrampsjsFilterParam.js'
import './GrampsjsIcon.js'
import {fetchAllTags} from '../tags.js'

export class GrampsjsFilterBuilder extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-dialog {
          width: min(760px, 95vw);
          max-width: 95vw;
          height: min(800px, 90vh);
          max-height: 90vh;
          --md-dialog-container-shape: 16px;
        }

        @media (max-width: 600px) {
          md-dialog {
            width: 100vw;
            max-width: 100vw;
            height: 100%;
            max-height: 100%;
            --md-dialog-container-shape: 0;
          }
        }

        md-icon-button {
          --md-icon-button-icon-size: 20px;
        }

        md-filter-chip {
          --md-filter-chip-container-shape: 8px;
          --md-filter-chip-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-hover-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-focus-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-pressed-label-text-color: var(
            --md-sys-color-primary
          );
          --md-filter-chip-selected-container-color: var(
            --md-sys-color-primary
          );
          --md-filter-chip-selected-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-focus-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-pressed-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-state-layer-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-leading-icon-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-leading-icon-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-focus-leading-icon-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-pressed-leading-icon-color: var(
            --md-sys-color-on-primary
          );
        }

        .group-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* NOT chip, rule with its parameters, remove button */
        .condition {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: start;
          gap: 8px;
          padding: 8px 0;
        }

        .group-header md-chip-set {
          flex: 1;
        }

        .group-children {
          margin: 16px 0 0 12px;
          padding-left: 12px;
          border-left: 2px solid var(--md-sys-color-outline-variant);
        }

        .group-children > * {
          margin-bottom: 12px;
        }

        .condition-name {
          padding-top: 6px;
        }

        .rule-name {
          font-size: 15px;
          font-weight: 500;
        }

        .rule-description {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .params {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        /* object selectors take a row of their own, before the other inputs */
        .params .object {
          grid-column: 1 / -1;
          order: -1;
        }

        .group-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .empty {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
          margin: 8px 0;
        }

        .not-chip {
          text-transform: uppercase;
        }

        .picker-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .picker-header md-outlined-text-field {
          flex: 1;
          --md-outlined-text-field-container-shape: 8px;
        }

        summary {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 12px 0;
          cursor: pointer;
          list-style: none;
          user-select: none;
        }

        summary::-webkit-details-marker {
          display: none;
        }

        summary grampsjs-icon {
          flex: none;
          transition: transform 0.15s;
        }

        details[open] summary grampsjs-icon {
          transform: rotate(90deg);
        }

        .category {
          font-size: 14px;
          font-weight: 500;
          color: var(--mdc-theme-primary);
        }

        md-list {
          --md-list-container-color: transparent;
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: 32px;
        }

        md-menu {
          min-width: 200px;
        }

        .error {
          color: var(--md-sys-color-error);
        }

        .panel-title {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
        }

        .hint {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
          margin: 0 0 12px 0;
        }

        .saved-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .saved-row md-list-item {
          flex: 1;
          min-width: 0;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          width: 100%;
        }

        .actions-start {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-right: auto;
        }
      `,
    ]
  }

  static get properties() {
    return {
      // endpoint name of the list's object type, e.g. 'people'
      namespace: {type: String},
      _tree: {state: true},
      _catalogue: {state: true},
      _loading: {state: true},
      _error: {state: true},
      _pickerPath: {state: true},
      _search: {state: true},
      _grampsTypes: {state: true},
      _tags: {state: true},
      // '' while editing the tree, 'saved' for the list of saved filters,
      // 'save' for naming the filter to save
      _panel: {state: true},
      _savedFilters: {state: true},
      _saveName: {state: true},
      // `${namespace}:${id}` of the objects found missing
      _missingIds: {state: true},
    }
  }

  constructor() {
    super()
    this.namespace = ''
    this._tree = newGroup()
    this._catalogue = []
    this._catalogueKey = ''
    // key of the catalogue being fetched
    this._catalogueRequest = ''
    this._loading = false
    this._error = ''
    this._pickerPath = null
    this._search = ''
    this._grampsTypes = {}
    this._tags = []
    this._menuPath = []
    this._panel = ''
    this._savedFilters = []
    this._saveName = ''
    // name of the saved filter being edited
    this._savedName = ''
    this._missingIds = new Set()
  }

  render() {
    return html`
      <md-dialog>
        <div slot="headline">${this._('Advanced filter')}</div>
        <div slot="content">
          ${this._renderContent()}
          <md-menu
            id="group-menu"
            positioning="fixed"
            @close-menu="${menuSelectionHandler(item =>
              this._selectMenuItem(item)
            )}"
          >
            <md-menu-item data-function="one">
              <div slot="headline">${this._('Exactly one condition')}</div>
            </md-menu-item>
          </md-menu>
        </div>
        <div slot="actions">${this._renderActions()}</div>
      </md-dialog>
    `
  }

  _renderContent() {
    if (this._pickerPath !== null) {
      return this._renderPicker()
    }
    if (this._panel === 'saved') {
      return this._renderSavedList()
    }
    if (this._panel === 'save') {
      return this._renderSaveForm()
    }
    return this._renderGroup(this._tree, [], 0)
  }

  get _isEditing() {
    return this._pickerPath === null && this._panel === ''
  }

  // Whether the tree can be applied: complete, and no condition refers to
  // an object found missing
  get _canApply() {
    return (
      isComplete(this._tree, this._catalogue) &&
      !refersToMissing(this._tree, this._catalogue, (namespace, id) =>
        this._missingIds.has(`${namespace}:${id}`)
      )
    )
  }

  get _canSave() {
    return this._tree.children.length > 0 && this._canApply
  }

  _renderActions() {
    if (this._panel === 'save') {
      return html`
        <div class="actions">
          <md-text-button @click="${this.close}"
            >${this._('Cancel')}</md-text-button
          >
          <md-filled-button
            ?disabled="${this._saveName.trim() === ''}"
            @click="${this._save}"
            >${this._('_Save')}</md-filled-button
          >
        </div>
      `
    }
    return html`
      <div class="actions">
        ${this._isEditing
          ? html`<div class="actions-start">
              <md-text-button
                ?disabled="${this._savedFilters.length === 0 ||
                this._catalogueKey === ''}"
                @click="${this._openSavedList}"
                >${this._('Saved filters')}</md-text-button
              >
              <md-text-button
                ?disabled="${!this._canSave}"
                @click="${this._openSaveForm}"
                >${this._('_Save')}</md-text-button
              >
            </div>`
          : nothing}
        <md-text-button @click="${this.close}"
          >${this._('Cancel')}</md-text-button
        >
        <md-filled-button
          ?disabled="${!this._isEditing || !this._canApply}"
          @click="${this._apply}"
          >${this._('Apply')}</md-filled-button
        >
      </div>
    `
  }

  _renderBackButton() {
    return html`
      <md-icon-button
        aria-label="${this._('_Back')}"
        @click="${this._closePanel}"
      >
        <grampsjs-icon path="${mdiArrowLeft}"></grampsjs-icon>
      </md-icon-button>
    `
  }

  _renderSavedList() {
    return html`
      <div class="picker-header">
        ${this._renderBackButton()}
        <span class="panel-title">${this._('Saved filters')}</span>
      </div>
      <p class="hint">${this._('Saved on this device')}</p>
      <md-list>
        ${this._savedFilters.map(
          filter => html`
            <div class="saved-row">
              <md-list-item
                type="button"
                @click="${() => this._openSaved(filter)}"
              >
                <div slot="headline">${filter.name}</div>
              </md-list-item>
              <md-icon-button
                aria-label="${this._('Delete')}"
                @click="${() => this._deleteSaved(filter)}"
              >
                <grampsjs-icon path="${mdiDelete}"></grampsjs-icon>
              </md-icon-button>
            </div>
          `
        )}
      </md-list>
    `
  }

  _renderSaveForm() {
    return html`
      <div class="picker-header">
        ${this._renderBackButton()}
        <md-outlined-text-field
          id="save-name"
          label="${this._('Name')}"
          supporting-text="${this._('Saved on this device')}"
          .value="${this._saveName}"
          @input="${e => {
            this._saveName = e.target.value
          }}"
          @keydown="${this._handleSaveKey}"
        ></md-outlined-text-field>
      </div>
    `
  }

  _renderGroup(group, path, depth) {
    const isTop = path.length === 0
    return html`
      <div class="group">
        <div class="group-header">
          <md-chip-set>
            ${this._renderNotChip(group, path)}
            <md-filter-chip
              label="${this._('All conditions')}"
              .selected="${group.function === 'and'}"
              @click="${e => this._setFunction(e, path, 'and')}"
            ></md-filter-chip>
            <md-filter-chip
              label="${this._('Any condition')}"
              .selected="${group.function === 'or'}"
              @click="${e => this._setFunction(e, path, 'or')}"
            ></md-filter-chip>
            ${group.function === 'one'
              ? html`<md-filter-chip
                  label="${this._('Exactly one condition')}"
                  selected
                  @click="${e => this._setFunction(e, path, 'one')}"
                ></md-filter-chip>`
              : nothing}
          </md-chip-set>
          <md-icon-button
            aria-label="${this._('More options')}"
            @click="${e => this._openMenu(e, path)}"
          >
            <grampsjs-icon path="${mdiDotsVertical}"></grampsjs-icon>
          </md-icon-button>
          ${isTop ? nothing : this._renderRemoveButton(path)}
        </div>
        <div class="group-children">
          ${group.children.length === 0
            ? html`<div class="empty">${this._('No conditions')}</div>`
            : repeat(
                group.children,
                child => child.id,
                (child, i) =>
                  isGroup(child)
                    ? this._renderGroup(child, [...path, i], depth + 1)
                    : this._renderCondition(child, [...path, i])
              )}
          <div class="group-actions">
            <md-text-button @click="${() => this._openPicker(path)}">
              <grampsjs-icon
                slot="icon"
                path="${mdiPlus}"
                color="currentColor"
              ></grampsjs-icon>
              ${this._('Add condition')}
            </md-text-button>
            <md-text-button
              ?disabled="${depth >= MAX_GROUP_DEPTH}"
              @click="${() => this._addGroup(path)}"
            >
              <grampsjs-icon
                slot="icon"
                path="${mdiPlus}"
                color="currentColor"
              ></grampsjs-icon>
              ${this._('Add group')}
            </md-text-button>
          </div>
        </div>
      </div>
    `
  }

  _renderNotChip(node, path) {
    return html`
      <md-filter-chip
        class="not-chip"
        label="${this._('Not')}"
        .selected="${node.invert}"
        @click="${e => this._toggleInvert(e, path)}"
      ></md-filter-chip>
    `
  }

  _renderRemoveButton(path) {
    return html`
      <md-icon-button
        aria-label="${this._('Remove')}"
        @click="${() => this._remove(path)}"
      >
        <grampsjs-icon path="${mdiClose}"></grampsjs-icon>
      </md-icon-button>
    `
  }

  _renderCondition(condition, path) {
    const ruleInfo = findRule(this._catalogue, condition.name)
    const labels = (ruleInfo?.labels ?? condition.values.map(() => '')).map(
      paramLabel
    )
    return html`
      <div class="condition">
        <md-chip-set>${this._renderNotChip(condition, path)}</md-chip-set>
        <div>
          <div class="condition-name">
            <div class="rule-name">${ruleInfo?.name ?? condition.name}</div>
            ${isUnknownRule(condition, this._catalogue)
              ? html`<div class="error">${this._('Unknown rule')}</div>`
              : nothing}
            ${ruleInfo?.description
              ? html`<div class="rule-description">
                  ${ruleInfo.description}
                </div>`
              : nothing}
          </div>
          ${labels.length > 0
            ? html`
                <div class="params">
                  ${labels.map((label, i) => {
                    const type = paramType(ruleInfo, i)
                    return html`
                      <grampsjs-filter-param
                        class="${type.type === 'id' ? 'object' : ''}"
                        .appState="${this.appState}"
                        label="${label}"
                        .value="${condition.values[i] ?? ''}"
                        .paramType="${type}"
                        ?required="${isRequiredParam(type)}"
                        .grampsTypes="${this._grampsTypes}"
                        .tags="${this._tags}"
                        @filter-param:change="${e =>
                          this._setValue(path, i, e.detail.value)}"
                        @filter-param:missing="${e =>
                          this._addMissing(type.namespace, e.detail.value)}"
                      ></grampsjs-filter-param>
                    `
                  })}
                </div>
              `
            : nothing}
        </div>
        ${this._renderRemoveButton(path)}
      </div>
    `
  }

  _renderPicker() {
    return html`
      <div class="picker-header">
        <md-icon-button
          aria-label="${this._('_Back')}"
          @click="${this._closePicker}"
        >
          <grampsjs-icon path="${mdiArrowLeft}"></grampsjs-icon>
        </md-icon-button>
        <md-outlined-text-field
          id="search"
          type="search"
          placeholder="${this._('Search')}"
          .value="${this._search}"
          @input="${e => {
            this._search = e.target.value
          }}"
        >
          <grampsjs-icon
            slot="leading-icon"
            path="${mdiMagnify}"
            color="var(--md-sys-color-on-surface-variant)"
          ></grampsjs-icon>
        </md-outlined-text-field>
      </div>
      ${this._renderPickerList()}
    `
  }

  _renderPickerList() {
    if (this._loading) {
      return html`<div class="loading">
        <md-circular-progress indeterminate></md-circular-progress>
      </div>`
    }
    if (this._error) {
      return html`<div class="empty">${this._error}</div>`
    }
    const categories = searchRules(pickableRules(this._catalogue), this._search)
    if (categories.length === 0) {
      return html`<div class="empty">${this._('Not found')}</div>`
    }
    // categories are collapsed for browsing and expanded for search results
    const searching = this._search.trim() !== ''
    return categories.map(
      ({category, rules}) => html`
        <details ?open="${searching}">
          <summary>
            <grampsjs-icon
              path="${mdiChevronRight}"
              height="20"
              width="20"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
            <span class="category">${category}</span>
          </summary>
          <md-list>
            ${rules.map(
              ruleInfo => html`
                <md-list-item
                  type="button"
                  @click="${() => this._addCondition(ruleInfo)}"
                >
                  <div slot="headline">${ruleInfo.name}</div>
                  <div slot="supporting-text">${ruleInfo.description}</div>
                </md-list-item>
              `
            )}
          </md-list>
        </details>
      `
    )
  }

  // Shows the dialog for editing `tree`
  open(tree) {
    this._tree = tree
    this._pickerPath = null
    this._search = ''
    this._panel = ''
    this._savedName = ''
    this._missingIds = new Set()
    this._loadSavedFilters()
    this.renderRoot.querySelector('md-dialog')?.show()
    this._fetchCatalogue()
    this._fetchGrampsTypes()
    this._fetchTags()
  }

  close() {
    this.renderRoot.querySelector('md-dialog')?.close()
  }

  async _fetchCatalogue() {
    const lang = this.appState.i18n.lang || 'en'
    const key = `${this.namespace}:${lang}`
    if (this._catalogueKey === key || this._catalogueRequest === key) {
      return
    }
    const {namespace} = this
    this._catalogueRequest = key
    this._loading = true
    this._error = ''
    let data = await this.appState.apiGet(
      `/api/filters/${namespace}?locale=${lang}`
    )
    // backends without the locale argument reject it
    if (data.errorDetail?.status === 422) {
      data = await this.appState.apiGet(`/api/filters/${namespace}`)
    }
    if (this._catalogueRequest !== key) {
      // a newer request is running
      return
    }
    this._catalogueRequest = ''
    this._loading = false
    if ('data' in data) {
      this._catalogue = localizeRules(data.data?.rules ?? [], s => this._(s))
      this._catalogueKey = key
    } else {
      this._error = data.error
    }
  }

  async _fetchGrampsTypes() {
    const data = await this.appState.apiGet('/api/types/')
    if ('data' in data) {
      this._grampsTypes = data.data ?? {}
    } else if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _fetchTags() {
    const data = await fetchAllTags(this.appState)
    if ('data' in data) {
      this._tags = (data.data ?? []).map(tag => tag.name)
    } else if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  _openPicker(path) {
    this._pickerPath = path
    this._search = ''
    this.updateComplete.then(async () => {
      // the text field focuses its input once that is rendered
      const search = this.renderRoot.querySelector('#search')
      await search?.updateComplete
      search?.focus()
    })
  }

  _closePicker() {
    this._pickerPath = null
  }

  _addCondition(ruleInfo) {
    this._tree = addChild(
      this._tree,
      this._pickerPath,
      newCondition(ruleInfo.rule, defaultValues(ruleInfo))
    )
    this._pickerPath = null
  }

  _addGroup(path) {
    this._tree = addChild(this._tree, path, newGroup())
  }

  _remove(path) {
    this._tree = removeNode(this._tree, path)
  }

  _setFunction(e, path, func) {
    // the chips show the model state, not their own toggled state
    e.preventDefault()
    this._tree = updateNode(this._tree, path, group => ({
      ...group,
      function: func,
    }))
  }

  _toggleInvert(e, path) {
    e.preventDefault()
    this._tree = updateNode(this._tree, path, node => ({
      ...node,
      invert: !node.invert,
    }))
  }

  _setValue(path, index, value) {
    this._tree = updateNode(this._tree, path, condition => {
      const values = [...condition.values]
      while (values.length < index) {
        values.push('')
      }
      values[index] = value
      return {...condition, values}
    })
  }

  _openMenu(e, path) {
    const menu = this.renderRoot.querySelector('#group-menu')
    if (menu.open && menu.anchorElement === e.currentTarget) {
      menu.close()
      return
    }
    this._menuPath = path
    menu.anchorElement = e.currentTarget
    menu.show()
  }

  _selectMenuItem(item) {
    const func = item.dataset?.function
    if (func && getNode(this._tree, this._menuPath)) {
      this._tree = updateNode(this._tree, this._menuPath, group => ({
        ...group,
        function: func,
      }))
    }
  }

  _apply() {
    fireEvent(this, 'filter-builder:apply', {tree: this._tree})
    this.close()
  }

  _addMissing(namespace, id) {
    this._missingIds = new Set([...this._missingIds, `${namespace}:${id}`])
  }

  // the saved filters of the namespace that the builder can open
  _loadSavedFilters() {
    this._savedFilters = loadSavedFilters(this.namespace).filter(
      filter => rulesToTree(filter.rules) !== null
    )
  }

  _closePanel() {
    this._panel = ''
  }

  _openSavedList() {
    this._loadSavedFilters()
    this._panel = 'saved'
  }

  _openSaved(filter) {
    const tree = rulesToTree(filter.rules)
    if (tree === null) {
      return
    }
    this._tree = tree
    this._savedName = filter.name
    this._panel = ''
  }

  _deleteSaved(filter) {
    deleteSavedFilter(filter.id)
    this._loadSavedFilters()
    if (filter.name === this._savedName) {
      this._savedName = ''
    }
    if (this._savedFilters.length === 0) {
      this._panel = ''
    }
  }

  _openSaveForm() {
    this._saveName = this._savedName
    this._panel = 'save'
    this.updateComplete.then(async () => {
      const field = this.renderRoot.querySelector('#save-name')
      await field?.updateComplete
      field?.focus()
    })
  }

  _handleSaveKey(e) {
    if (e.key === 'Enter' && this._saveName.trim() !== '') {
      e.preventDefault()
      this._save()
    }
  }

  // Saves the tree under the entered name, replacing a saved filter of the
  // same name
  _save() {
    const name = this._saveName.trim()
    const saved = saveFilter(this.namespace, name, serializeNode(this._tree))
    if (saved === null) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('The filter could not be saved.'),
      })
      return
    }
    this._savedName = name
    this._loadSavedFilters()
    this._panel = ''
  }
}

window.customElements.define('grampsjs-filter-builder', GrampsjsFilterBuilder)
