/*
Condition builder, the advanced tier of the filter panel.

A dialog editing a tree of groups and conditions (see filterBuilder.js).
`open(tree)` shows it with a filter. Edits never change the tree passed in;
Apply fires `filter-builder:apply` with the edited tree.
*/

import {LitElement, css, html, nothing} from 'lit'
import {repeat} from 'lit/directives/repeat.js'
import {
  mdiArrowLeft,
  mdiChevronRight,
  mdiClose,
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
import {fireEvent} from '../util.js'
import {
  MAX_GROUP_DEPTH,
  addChild,
  defaultValues,
  findRule,
  getNode,
  isComplete,
  isGroup,
  localizeRules,
  newCondition,
  newGroup,
  paramLabel,
  paramType,
  pickableRules,
  removeNode,
  searchRules,
  updateNode,
} from '../filterBuilder.js'
import './GrampsjsFilterParam.js'
import './GrampsjsIcon.js'

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
    }
  }

  constructor() {
    super()
    this.namespace = ''
    this._tree = newGroup()
    this._catalogue = []
    this._catalogueKey = ''
    this._loading = false
    this._error = ''
    this._pickerPath = null
    this._search = ''
    this._grampsTypes = {}
    this._tags = []
    this._menuPath = []
  }

  render() {
    return html`
      <md-dialog>
        <div slot="headline">${this._('Advanced filter')}</div>
        <div slot="content">
          ${this._pickerPath === null
            ? this._renderGroup(this._tree, [], 0)
            : this._renderPicker()}
          <md-menu
            id="group-menu"
            positioning="fixed"
            @close-menu="${this._handleMenuSelect}"
          >
            <md-menu-item data-function="one">
              <div slot="headline">${this._('Exactly one condition')}</div>
            </md-menu-item>
          </md-menu>
        </div>
        <div slot="actions">
          <md-text-button @click="${this.close}"
            >${this._('Cancel')}</md-text-button
          >
          <md-filled-button
            ?disabled="${this._pickerPath !== null ||
            !isComplete(this._tree, this._catalogue)}"
            @click="${this._apply}"
            >${this._('Apply')}</md-filled-button
          >
        </div>
      </md-dialog>
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
                color="var(--mdc-theme-primary)"
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
                color="${depth >= MAX_GROUP_DEPTH
                  ? 'var(--md-sys-color-on-surface-variant)'
                  : 'var(--mdc-theme-primary)'}"
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
                        .grampsTypes="${this._grampsTypes}"
                        .tags="${this._tags}"
                        @filter-param:change="${e =>
                          this._setValue(path, i, e.detail.value)}"
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
          aria-label="${this._('Back')}"
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
    if (this._catalogueKey === key) {
      return
    }
    const {namespace} = this
    this._loading = true
    this._error = ''
    let data = await this.appState.apiGet(
      `/api/filters/${namespace}?locale=${lang}`
    )
    // backends without the locale argument reject it
    if (data.errorDetail?.status === 422) {
      data = await this.appState.apiGet(`/api/filters/${namespace}`)
    }
    if (namespace !== this.namespace) {
      return
    }
    this._loading = false
    if ('data' in data) {
      this._catalogue = localizeRules(data.data?.rules ?? [], s => this._(s))
      this._catalogueKey = key
    } else {
      this._error = data.error
    }
  }

  async _fetchGrampsTypes() {
    if (Object.keys(this._grampsTypes).length > 0) {
      return
    }
    const data = await this.appState.apiGet('/api/types/')
    if ('data' in data) {
      this._grampsTypes = data.data ?? {}
    } else if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _fetchTags() {
    const data = await this.appState.apiGet('/api/tags/')
    if ('data' in data) {
      this._tags = (data.data ?? []).map(tag => tag.name)
    } else if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  _openPicker(path) {
    this._pickerPath = path
    this._search = ''
    this.updateComplete.then(() => {
      this.renderRoot.querySelector('#search')?.focus()
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
    this._menuPath = path
    menu.anchorElement = e.currentTarget
    menu.open = !menu.open
  }

  _handleMenuSelect(e) {
    const func = e.detail.initiator?.dataset?.function
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
}

window.customElements.define('grampsjs-filter-builder', GrampsjsFilterBuilder)
