import {LitElement, css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-icon-button'
import '@material/mwc-button'

import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent, personFilter, filterCounts, filterMime} from '../util.js'

export class GrampsjsFilters extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hidden {
          display: none;
        }

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
      `,
    ]
  }

  static get properties() {
    return {
      filters: {type: Array},
      open: {type: Boolean},
      objectType: {type: String},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.open = false
    this.objectType = ''
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
          ?disabled="${this.filters.length === 0}"
          icon="filter_list_off"
          @click="${this._handleFilterOff}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="filteroff" .strings="${this.strings}"
          >${this._('Clear all filters')}</grampsjs-tooltip
        >
        ${this._renderFilterChips()}
      </div>
      <div
        class="${classMap({hidden: !this.open})}"
        @filter:changed="${this._handleFilterChanged}"
      >
        <slot></slot>
      </div>
    `
  }

  _renderFilterChips() {
    return this.filters.map(
      (rule, i) => html`
        <grampsjs-filter-chip
          label="${this.ruleToLabel(rule)}"
          @filter-chip:clear="${() => this._clearFilter(i)}"
        ></grampsjs-filter-chip>
      `
    )
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
    this.open = false
    this._fireFiltersChanged()
  }

  _fireFiltersChanged() {
    fireEvent(this, 'filters:changed', {filters: this.filters})
  }

  updated(changed) {
    if (changed.has('filters')) {
      this.broadcastToChildren()
    }
  }

  get _slottedChildren() {
    const slot = this.shadowRoot.querySelector('slot')

    return slot.assignedElements({flatten: true})
  }

  broadcastToChildren() {
    this._slottedChildren.forEach(child => {
      const el = child
      el.filters = this.filters
    })
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
