import {LitElement, css, html, nothing} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {
  mdiAlertCircleOutline,
  mdiChevronRight,
  mdiFilter,
  mdiFilterCogOutline,
  mdiFilterOff,
} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'
import '@material/web/button/text-button'
import '@material/web/iconbutton/icon-button'

import './GrampsjsFilterBuilder.js'
import './GrampsjsFilterCheckboxes.js'
import './GrampsjsFilterChip.js'
import './GrampsjsFilterMime.js'
import './GrampsjsFilterObjectType.js'
import './GrampsjsFilterTags.js'
import './GrampsjsFilterText.js'
import './GrampsjsFilterType.js'
import './GrampsjsFilterYears.js'
import './GrampsjsGoqlInput.js'
import './GrampsjsIcon.js'
import {renderIconSvg} from '../icons.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {apiVersionAtLeast, fireEvent, clickKeyHandler} from '../util.js'
import {
  findSection,
  indexedRule,
  pillLabel,
  removePill,
  sectionRules,
  setSectionRules,
  textFilter,
} from '../filterDefinitions.js'
import {pillsToTree, treeToFilters, treeToPills} from '../filterBuilder.js'

// The section of the GOQL expression, which has its own field applied on
// demand
const GOQL_SECTION = textFilter(s => s, {label: 'GOQL', rule: 'MatchesQuery'})

export class GrampsjsFilters extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .filtermenu {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px 8px;
        }

        slot[name='trailing'] {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px 8px;
          margin-left: auto;
        }

        .chips {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          margin: 12px 0 0 -5px;
        }

        #filteroff {
          --md-icon-button-icon-size: 20px;
        }

        #input-goql-container {
          display: flex;
          align-items: center;
        }

        #input-goql {
          flex: 1;
          margin-right: 12px;
        }

        #input-goql-container span {
          display: flex;
          align-items: center;
        }

        .hidden {
          display: none;
        }

        #filter-container {
          padding-top: 12px;
        }

        .sections {
          margin: 12px 0 20px 0;
        }

        summary {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 8px 0;
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

        .section-label {
          flex: none;
          font-size: 14px;
          font-weight: 500;
          color: var(--mdc-theme-primary);
        }

        .section-content {
          padding: 4px 0 16px 22px;
        }

        .advanced {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin: 8px 0 16px 0;
          font-size: 14px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      // sections of the filter panel, see filterDefinitions.js
      definitions: {type: Array},
      // endpoint name of the list's object type, e.g. 'people'; enables the
      // condition builder
      namespace: {type: String},
      open: {type: Boolean},
      // set by the view while its last request failed
      errorGoql: {type: Boolean},
      // hides the error while the expression is edited
      _goqlErrorHidden: {type: Boolean},
      _pills: {type: Array},
      // the filter of the condition builder while the facets can't show it
      _tree: {type: Object},
    }
  }

  constructor() {
    super()
    this.definitions = []
    this.namespace = ''
    this.open = false
    this.errorGoql = false
    this._goqlErrorHidden = false
    this._pills = []
    this._tree = null
  }

  // whether the backend has the MatchesQuery rule
  get _hasGoql() {
    return apiVersionAtLeast(this.appState?.dbInfo, 3, 24)
  }

  // the view's sections and, if supported, the GOQL section
  get _sections() {
    return this._hasGoql
      ? [...this.definitions, GOQL_SECTION]
      : this.definitions
  }

  // the active rules
  get filters() {
    if (this._tree !== null) {
      return treeToFilters(this._tree)
    }
    return this._pills.map(pill => pill.rule)
  }

  render() {
    return html`
      <div class="filtermenu">
        <slot name="leading"></slot>
        ${this.open
          ? html`
              <md-filled-button @click="${this._handleFilterButton}">
                <grampsjs-icon
                  slot="icon"
                  path="${mdiFilter}"
                  color="currentColor"
                ></grampsjs-icon>
                ${this._('filter')}
              </md-filled-button>
            `
          : html`
              <md-outlined-button @click="${this._handleFilterButton}">
                <grampsjs-icon
                  slot="icon"
                  path="${mdiFilter}"
                  color="currentColor"
                ></grampsjs-icon>
                ${this._('filter')}
              </md-outlined-button>
            `}
        <md-icon-button
          id="filteroff"
          aria-label="${this._('Clear all filters')}"
          ?disabled="${!this._hasChips}"
          @click="${this._handleFilterOff}"
        >
          <grampsjs-icon path="${mdiFilterOff}"></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="filteroff" .appState="${this.appState}"
          >${this._('Clear all filters')}</grampsjs-tooltip
        >
        <slot name="trailing"></slot>
      </div>
      ${this._hasChips
        ? html`<div class="chips">${this._renderFilterChips()}</div>`
        : nothing}
      <div id="filter-container" class="${classMap({hidden: !this.open})}">
        <div
          class="sections"
          @filter-section:change="${this._handleSectionChange}"
        >
          ${this._tree === null
            ? html`${this.definitions.map(section =>
                this._renderSection(section)
              )}
              ${this._hasGoql
                ? this._renderDetails(
                    GOQL_SECTION.id,
                    GOQL_SECTION.label,
                    this._renderGoql()
                  )
                : nothing}`
            : this._renderAdvancedNotice()}
        </div>
        ${this.namespace && this._tree === null
          ? html`<md-text-button @click="${this._openBuilder}">
              <grampsjs-icon
                slot="icon"
                path="${mdiFilterCogOutline}"
                color="currentColor"
              ></grampsjs-icon>
              ${this._('Advanced filter')}
            </md-text-button>`
          : nothing}
      </div>
      ${this.namespace
        ? html`<grampsjs-filter-builder
            .appState="${this.appState}"
            namespace="${this.namespace}"
            @filter-builder:apply="${this._handleBuilderApply}"
          ></grampsjs-filter-builder>`
        : nothing}
    `
  }

  _renderAdvancedNotice() {
    return html`
      <div class="advanced">
        <span>${this._('The filter is edited in the advanced filter.')}</span>
        <md-outlined-button @click="${this._openBuilder}">
          ${this._('Edit')}
        </md-outlined-button>
      </div>
    `
  }

  get _hasChips() {
    return this._pills.length > 0 || this._tree !== null
  }

  _renderFilterChips() {
    return html`
      ${this._pills.map((pill, i) => this._renderPill(pill, i))}
      ${this._tree === null
        ? nothing
        : html`
            <grampsjs-filter-chip
              label="${this._('Advanced filter')}"
              @filter-chip:clear="${this._clearTree}"
            ></grampsjs-filter-chip>
          `}
    `
  }

  _renderPill(pill, i) {
    const section = findSection(this._sections, pill.sectionId)
    if (!section) {
      return nothing
    }
    const isGoql = section === GOQL_SECTION
    return html`
      <grampsjs-filter-chip
        label="${isGoql
          ? pill.rule.values[0]
          : pillLabel(s => this._(s), section, pill.rule)}"
        ?monospace="${isGoql}"
        @filter-chip:clear="${() => this._removePill(i)}"
      ></grampsjs-filter-chip>
    `
  }

  _renderSection(section) {
    const rules = sectionRules(this._pills, section.id)
    return this._renderDetails(
      section.id,
      section.label,
      html`<div class="section-content" data-section="${section.id}">
        ${this._renderSectionContent(section, rules)}
      </div>`
    )
  }

  // eslint-disable-next-line class-methods-use-this
  _renderDetails(id, label, content) {
    return html`
      <details data-section="${id}">
        <summary>
          <grampsjs-icon
            path="${mdiChevronRight}"
            height="20"
            width="20"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
          <span class="section-label">${label}</span>
        </summary>
        ${content}
      </details>
    `
  }

  _renderSectionContent(section, rules) {
    switch (section.editor) {
      case 'years':
        return html`<grampsjs-filter-years
          .appState="${this.appState}"
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-years>`
      case 'text':
        return html`<grampsjs-filter-text
          .appState="${this.appState}"
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-text>`
      case 'type':
        return html`<grampsjs-filter-type
          .appState="${this.appState}"
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-type>`
      case 'tags':
        return html`<grampsjs-filter-tags
          .appState="${this.appState}"
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-tags>`
      case 'mime':
        return html`<grampsjs-filter-mime
          .appState="${this.appState}"
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-mime>`
      case 'objectType':
        return html`<grampsjs-filter-object-type
          .appState="${this.appState}"
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-object-type>`
      case 'checkboxes':
        return html`<grampsjs-filter-checkboxes
          .section="${section}"
          .rules="${rules}"
        ></grampsjs-filter-checkboxes>`
      default:
        return nothing
    }
  }

  _renderGoql() {
    return html`
      <div class="section-content" id="input-goql-container">
        <grampsjs-goql-input
          id="input-goql"
          label="${GOQL_SECTION.label}"
          @keydown="${this._handleGoqlKey}"
          @input="${this._hideGoqlError}"
          .value="${this._goql}"
          ?error="${this._hasGoqlError}"
        >
          ${this._hasGoqlError
            ? renderIconSvg(mdiAlertCircleOutline, null, 0, 'trailing-icon')
            : ''}
        </grampsjs-goql-input>
        <span
          ><md-filled-button
            @click="${this._applyGoql}"
            @keydown="${clickKeyHandler}"
            >${this._('Apply')}</md-filled-button
          ></span
        >
      </div>
    `
  }

  _handleSectionChange(e) {
    e.stopPropagation()
    const {section} = e.target.closest('.section-content').dataset
    this._setPills(setSectionRules(this._pills, section, e.detail.rules))
  }

  _removePill(i) {
    this._setPills(removePill(this._pills, i))
  }

  _setPills(pills) {
    this._pills = pills
    this._fireFiltersChanged()
  }

  _openBuilder() {
    this.renderRoot
      .querySelector('grampsjs-filter-builder')
      ?.open(this._tree ?? pillsToTree(this._pills))
  }

  // Shows the builder's filter in the facets when they can show it
  _handleBuilderApply(e) {
    const {tree} = e.detail
    const pills = treeToPills(tree, this._sections)
    this._pills = pills ?? []
    this._tree = pills === null ? tree : null
    this._fireFiltersChanged()
  }

  _clearTree() {
    this._tree = null
    this._fireFiltersChanged()
  }

  // the applied GOQL expression
  get _goql() {
    return sectionRules(this._pills, GOQL_SECTION.id)[0]?.values?.[0] ?? ''
  }

  _handleGoqlKey(event) {
    if (event.code === 'Enter') {
      this._applyGoql()
    } else if (event.code === 'Escape') {
      this._clearGoqlForm()
      this._hideGoqlError()
    }
  }

  _clearGoqlForm() {
    const input = this.renderRoot.querySelector('#input-goql')
    if (input !== null) {
      input.value = ''
    }
  }

  _applyGoql() {
    this._goqlErrorHidden = false
    const input = this.renderRoot.querySelector('#input-goql')
    if (input !== null) {
      const value = input.value.trim()
      const rules = value ? [indexedRule(GOQL_SECTION, value)] : []
      this._setPills(setSectionRules(this._pills, GOQL_SECTION.id, rules))
    }
  }

  // Views report any failed request as a GOQL error, which only concerns
  // the GOQL field while an expression is applied
  get _hasGoqlError() {
    return this.errorGoql && !this._goqlErrorHidden && this._goql !== ''
  }

  _hideGoqlError() {
    this._goqlErrorHidden = true
  }

  // every failed request shows the error again
  willUpdate(changed) {
    super.willUpdate(changed)
    if (changed.has('errorGoql') && this.errorGoql) {
      this._goqlErrorHidden = false
    }
  }

  async _handleFilterButton() {
    this.open = !this.open
    if (this.open) {
      await this.updateComplete
      this._expandActiveSections()
    }
  }

  // Expands the sections with active filters and leaves the others as they are
  _expandActiveSections() {
    this.renderRoot.querySelectorAll('details').forEach(details => {
      const {section} = details.dataset
      if (sectionRules(this._pills, section).length > 0) {
        // eslint-disable-next-line no-param-reassign
        details.open = true
      }
    })
  }

  _handleFilterOff() {
    this._pills = []
    this._tree = null
    this._clearGoqlForm()
    this._hideGoqlError()
    this._fireFiltersChanged()
  }

  _fireFiltersChanged() {
    fireEvent(this, 'filters:changed', {filters: this.filters})
  }
}

window.customElements.define('grampsjs-filters', GrampsjsFilters)
