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
import '@material/web/textfield/outlined-text-field'

import './GrampsjsFilterBuilder.js'
import './GrampsjsFilterCheckboxes.js'
import './GrampsjsFilterChip.js'
import './GrampsjsFilterMime.js'
import './GrampsjsFilterObjectType.js'
import './GrampsjsFilterTags.js'
import './GrampsjsFilterText.js'
import './GrampsjsFilterType.js'
import './GrampsjsFilterYears.js'
import './GrampsjsIcon.js'
import {renderIconSvg} from '../icons.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, clickKeyHandler} from '../util.js'
import {
  findSection,
  pillLabel,
  removePill,
  sectionRules,
  setSectionRules,
} from '../filterDefinitions.js'
import {pillsToTree, treeToFilters, treeToPills} from '../filterBuilder.js'

// section id of the GQL query in the filter panel
const GQL_SECTION = 'gql'

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

        #filteroff {
          --md-icon-button-icon-size: 20px;
        }

        #input-gql-container {
          display: flex;
          align-items: center;
        }

        #input-gql {
          --md-outlined-text-field-input-text-font: var(
            --grampsjs-mono-font-family
          );
          --md-outlined-text-field-input-text-size: 15px;
          --md-outlined-text-field-container-shape: 8px;
          --md-outlined-text-field-top-space: 9px;
          --md-outlined-text-field-bottom-space: 9px;
          flex: 1;
          margin-right: 12px;
        }

        #input-gql-container span {
          align-self: flex-start;
          display: flex;
          align-items: center;
        }

        #input-gql-container md-filled-button {
          --md-filled-button-container-shape: 8px;
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
          text-transform: uppercase;
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
      query: {type: String},
      errorGql: {type: Boolean},
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
    this.query = ''
    this.errorGql = false
    this._pills = []
    this._tree = null
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
                  color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
                ></grampsjs-icon>
                ${this._('filter')}
              </md-filled-button>
            `
          : html`
              <md-outlined-button @click="${this._handleFilterButton}">
                <grampsjs-icon
                  slot="icon"
                  path="${mdiFilter}"
                  color="var(--mdc-theme-primary)"
                ></grampsjs-icon>
                ${this._('filter')}
              </md-outlined-button>
            `}
        <md-icon-button
          id="filteroff"
          aria-label="${this._('Clear all filters')}"
          ?disabled="${this._pills.length === 0 &&
          this._tree === null &&
          this.query === ''}"
          @click="${this._handleFilterOff}"
        >
          <grampsjs-icon path="${mdiFilterOff}"></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="filteroff" .appState="${this.appState}"
          >${this._('Clear all filters')}</grampsjs-tooltip
        >
        ${this._renderFilterChips()}
      </div>
      <div id="filter-container" class="${classMap({hidden: !this.open})}">
        <div
          class="sections"
          @filter-section:change="${this._handleSectionChange}"
        >
          ${this._tree === null
            ? this.definitions.map(section => this._renderSection(section))
            : this._renderAdvancedNotice()}
          ${this._renderDetails(GQL_SECTION, 'GQL', this._renderGql())}
        </div>
        ${this.namespace && this._tree === null
          ? html`<md-text-button @click="${this._openBuilder}">
              <grampsjs-icon
                slot="icon"
                path="${mdiFilterCogOutline}"
                color="var(--mdc-theme-primary)"
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
      ${this.query
        ? html`
            <grampsjs-filter-chip
              @filter-chip:clear="${this._clearQuery}"
              monospace
              label="${this.query}"
            ></grampsjs-filter-chip>
          `
        : nothing}
    `
  }

  _renderPill(pill, i) {
    const section = findSection(this.definitions, pill.sectionId)
    return section
      ? html`
          <grampsjs-filter-chip
            label="${pillLabel(s => this._(s), section, pill.rule)}"
            @filter-chip:clear="${() => this._removePill(i)}"
          ></grampsjs-filter-chip>
        `
      : nothing
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

  _renderGql() {
    return html`
      <div class="section-content" id="input-gql-container">
        <md-outlined-text-field
          id="input-gql"
          @keydown="${this._handleGqlKey}"
          @input="${this._handleGqlChange}"
          value="${this.query}"
          ?error="${this._hasGqlError}"
        >
          ${this._hasGqlError
            ? renderIconSvg(mdiAlertCircleOutline, null, 0, 'trailing-icon')
            : ''}
        </md-outlined-text-field>
        <span
          ><md-filled-button
            @click="${this._applyGql}"
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
    const pills = treeToPills(tree, this.definitions)
    this._pills = pills ?? []
    this._tree = pills === null ? tree : null
    this._fireFiltersChanged()
  }

  _clearTree() {
    this._tree = null
    this._fireFiltersChanged()
  }

  _handleGqlKey(event) {
    if (event.code === 'Enter') {
      this._applyGql()
    } else if (event.code === 'Escape') {
      this._clearGqlForm()
      this._clearGqlError()
    }
  }

  _clearGqlForm() {
    const input = this.renderRoot.querySelector('#input-gql')
    if (input !== null) {
      input.value = ''
    }
  }

  _handleGqlChange() {
    this._clearGqlError()
  }

  _applyGql() {
    this._clearGqlError()
    const input = this.renderRoot.querySelector('#input-gql')
    if (input !== null) {
      this.query = input.value
      this._fireFiltersChanged()
    }
  }

  // Views report any failed request as a GQL error, which only concerns
  // the GQL field while a query is applied
  get _hasGqlError() {
    return this.errorGql && this.query !== ''
  }

  _clearGqlError() {
    this.errorGql = false
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
      const isActive =
        section === GQL_SECTION
          ? this.query !== ''
          : sectionRules(this._pills, section).length > 0
      if (isActive) {
        // eslint-disable-next-line no-param-reassign
        details.open = true
      }
    })
  }

  _handleFilterOff() {
    this._pills = []
    this._tree = null
    this.query = ''
    this._clearGqlForm()
    this._clearGqlError()
    this._fireFiltersChanged()
  }

  _clearQuery() {
    this.query = ''
    this._clearGqlForm()
    this._clearGqlError()
    this._fireFiltersChanged()
  }

  _fireFiltersChanged() {
    fireEvent(this, 'filters:changed', {
      filters: this.filters,
      query: this.query,
    })
  }
}

window.customElements.define('grampsjs-filters', GrampsjsFilters)
