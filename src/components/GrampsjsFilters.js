import {LitElement, css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiAlertCircleOutline} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-icon-button'
import '@material/mwc-button'
import '@material/web/textfield/outlined-text-field'
import '@material/web/button/filled-button'

import './GrampsjsButtonGroup.js'
import {renderIconSvg} from '../icons.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  fireEvent,
  clickKeyHandler,
  personFilter,
  filterCounts,
  filterMime,
} from '../util.js'

export class GrampsjsFilters extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .filtermenu {
          display: inline;
        }

        .filtermenu > * {
          vertical-align: middle;
        }

        #filteroff {
          --mdc-icon-size: 20px;
          color: var(--mdc-theme-primary);
          margin-left: 10px;
          margin-right: 10px;
        }

        #input-gql-container {
          align-items: center;
          margin: 20px 0 30px 0;
          width: 100%;
        }

        #input-gql {
          --md-outlined-text-field-input-text-font: 'Commit Mono';
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

        .flex {
          display: flex;
        }
      `,
    ]
  }

  static get properties() {
    return {
      filters: {type: Array},
      open: {type: Boolean},
      objectType: {type: String},
      query: {type: String},
      useGql: {type: Boolean},
      errorGql: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.open = false
    this.objectType = ''
    this.query = ''
    this.useGql = false
    this.errorGql = false
  }

  render() {
    return html`
      <div class="filtermenu">
        <mwc-button
          icon="filter_list"
          ?unelevated="${this.open}"
          @click="${this._handleFilterButton}"
          >${this._('filter')}</mwc-button
        >
        <mwc-icon-button
          id="filteroff"
          ?disabled="${this.filters.length === 0 && this.query === ''}"
          icon="filter_list_off"
          @click="${this._handleFilterOff}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="filteroff" .appState="${this.appState}"
          >${this._('Clear all filters')}</grampsjs-tooltip
        >
        ${this._renderFilterChips()}
      </div>
      <div
        class="${classMap({hidden: !this.open})}"
        @filter:changed="${this._handleFilterChanged}"
      >
        <grampsjs-button-group>
          <mwc-button
            dense
            ?unelevated="${!this.useGql}"
            @click="${this._handleGqlClick}"
            >${this._('simple')}</mwc-button
          >
          <mwc-button
            dense
            ?unelevated="${this.useGql}"
            @click="${this._handleGqlClick}"
            >GQL</mwc-button
          >
        </grampsjs-button-group>

        <div
          class="${classMap({hidden: !this.useGql, flex: this.useGql})}"
          id="input-gql-container"
        >
          ${this._renderGql()}
        </div>

        <div class="${classMap({hidden: this.useGql})}">
          <slot></slot>
        </div>
      </div>
    `
  }

  _renderFilterChips() {
    if (this.query) {
      return html`
        <grampsjs-filter-chip
          @filter-chip:clear="${this._handleFilterOff}"
          monospace
          label="${this.query}"
        ></grampsjs-filter-chip>
      `
    }
    return this.filters.map(
      (rule, i) => html`
        <grampsjs-filter-chip
          label="${this.ruleToLabel(rule)}"
          @filter-chip:clear="${() => this._clearFilter(i)}"
        ></grampsjs-filter-chip>
      `
    )
  }

  _renderGql() {
    return html`
      <md-outlined-text-field
        id="input-gql"
        @keydown="${this._handleGqlKey}"
        @input="${this._handleGqlChange}"
        value="${this.query}"
        ?error="${this.errorGql}"
      >
        ${this.errorGql
          ? renderIconSvg(mdiAlertCircleOutline, null, 0, 'trailing-icon')
          : ''}
        ></md-outlined-text-field
      >
      <span
        ><md-filled-button
          @click="${this._applyGql}"
          @keydown="${clickKeyHandler}"
          >${this._('Apply')}</md-filled-button
        ></span
      >
    `
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

  _clearGqlError() {
    this.errorGql = false
  }

  _clearFilter(i) {
    this.filters = [...this.filters.slice(0, i), ...this.filters.slice(i + 1)]
    this._fireFiltersChanged()
  }

  _handleFilterButton() {
    this.open = !this.open
  }

  _handleFilterOff() {
    this.filters = []
    this.query = ''
    this._clearGqlError()
    this._fireFiltersChanged()
  }

  _fireFiltersChanged() {
    fireEvent(this, 'filters:changed', {
      filters: this.filters,
      query: this.query,
    })
  }

  updated(changed) {
    if (changed.has('filters')) {
      this.broadcastToChildren()
    }
  }

  get _slottedChildren() {
    const slot = this.shadowRoot.querySelector('slot')
    if (!slot) {
      return []
    }

    return slot.assignedElements({flatten: true})
  }

  broadcastToChildren() {
    this._slottedChildren.forEach(child => {
      const el = child
      el.filters = this.filters
    })
  }

  async _handleGqlClick() {
    this.useGql = !this.useGql
    if (this.filters.length || this.query) {
      this.filters = []
      this.query = ''
      this._fireFiltersChanged()
    }
    this.filters = []
    this.query = ''
    if (this.useGql) {
      await this.updateComplete
      this.renderRoot.getElementById('input-gql').focus()
    }
  }

  _handleFilterChanged(e) {
    e.preventDefault()
    e.stopPropagation()
    const rules = e.detail?.filters?.rules
    const replace = e.detail?.replace
    const oldFilters = replace
      ? this.filters.filter(f => f.name !== replace)
      : this.filters
    if (rules) {
      this.filters = [...oldFilters, ...rules]
      this._fireFiltersChanged()
    }
  }

  ruleToLabel(rule) {
    if (rule.name === 'HasTag') {
      return `${this._('Tag')}: ${rule.values[0]}`
    }
    if (rule.name === 'HasMedia' && rule.values[1] !== '') {
      return `${this._('_Media Type:').replace(':', '')}: ${this._(
        filterMime[rule.values[1]]
      )}`
    }
    if (rule.name === 'HasBirth' && rule.values[0] !== '') {
      return this._ruleToLabelSpan(rule, 'Birth year', 0)
    }
    if (rule.name === 'HasDeath' && rule.values[0] !== '') {
      return this._ruleToLabelSpan(rule, 'Death year', 0)
    }
    if (rule.name === 'HasData' && rule.values[1] !== '') {
      return this._ruleToLabelSpan(rule, 'Date', 1)
    }
    if (rule.name === 'HasType') {
      return `${this._('Type')}: ${this._(rule.values[0])}`
    }
    if (rule.name === 'HasRelType') {
      return `${this._('Relationship type:')} ${this._(rule.values[0])}`
    }
    if (rule.name in personFilter) {
      return this._(personFilter[rule.name])
    }
    if (rule.name in filterCounts[this.objectType]) {
      return this._(filterCounts[this.objectType][rule.name]).replace(
        /<[^>]+>/,
        ''
      )
    }
    return JSON.stringify(rule)
  }

  _ruleToLabelSpan(rule, label, index) {
    const match = rule.values[index].match(/(\d+)[^\d]+(\d+)/)
    if (match.length === 3) {
      if (match[1] === match[2]) {
        return `${this._(label)}: ${match[1]}`
      }
      return `${this._(label)}: ${match[1]}-${match[2]}`
    }
    return JSON.stringify(rule)
  }
}

window.customElements.define('grampsjs-filters', GrampsjsFilters)
