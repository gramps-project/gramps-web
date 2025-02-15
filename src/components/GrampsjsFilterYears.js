import {LitElement, css, html} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'
import '@material/mwc-textfield'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, dateSpanLocal, debounce} from '../util.js'

export class GrampsjsFilterYears extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          font-size: 14px;
          text-transform: uppercase;
          font-family: var(--grampsjs-body-font-family);
          font-weight: 500;
          color: var(--mdc-theme-primary);
          border-color: var(--mdc-theme-primary);
          border-bottom-width: 1px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      filters: {type: Object},
      open: {type: Boolean},
      label: {type: String},
      rule: {type: String},
      dateIndex: {type: Number},
      numArgs: {type: Number},
      _yearFrom: {type: String},
      _yearUntil: {type: String},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.label = ''
    this.rule = ''
    this.open = false
    this.dateIndex = 0
    this.numArgs = 3
    this._yearFrom = null
    this._yearUntil = new Date().getFullYear()
  }

  render() {
    return html`
      <h3>${this._(this.label)}</h3>
      <mwc-textfield
        type="number"
        max="${new Date().getFullYear()}"
        label="${this._('between')}"
        id="year_from"
        value="${this._yearFrom}"
        @input="${debounce(() => this._handleYearFrom(), 1000)}"
      ></mwc-textfield>
      <mwc-textfield
        type="number"
        max="${new Date().getFullYear()}"
        label="${this._('and')}"
        id="year_until"
        value="${this._yearUntil}"
        @input="${debounce(() => this._handleYearUntil(), 1000)}"
      ></mwc-textfield>
    `
  }

  _handleYearFrom() {
    const el = this.renderRoot.querySelector('#year_from')
    if (el) {
      this._yearFrom = el.value
      this._checkValid()
    }
  }

  _handleYearUntil() {
    const el = this.renderRoot.querySelector('#year_until')
    if (el) {
      this._yearUntil = el.value
      this._checkValid()
    }
  }

  _checkValid() {
    const isValid =
      !!this._yearFrom && !!this._yearUntil && this._yearUntil >= this._yearFrom
    if (isValid) {
      this.applyFilter()
    }
  }

  applyFilter() {
    const year1 = this.renderRoot.querySelector('#year_from')?.value
    const year2 = this.renderRoot.querySelector('#year_until')?.value
    if (year1 && year2) {
      // need to translate the date span if the server locale is not English
      const date = this.appState.settings.serverLang
        ? dateSpanLocal(year1, year2, this.appState.settings.serverLang)
        : `from ${year1} until ${year2}`
      const values = Array(this.numArgs).fill('')
      values[this.dateIndex] = date
      const rules = [{name: this.rule, values}]
      fireEvent(this, 'filter:changed', {filters: {rules}, replace: this.rule})
    }
  }
}

window.customElements.define('grampsjs-filter-years', GrampsjsFilterYears)
