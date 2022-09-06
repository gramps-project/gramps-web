import {LitElement, css, html} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'
import '@material/mwc-textfield'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {getSettings} from '../api.js'
import {fireEvent, dateSpanLocal, debounce} from '../util.js'

export class GrampsjsFilterYears extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          font-size: 14px;
          text-transform: uppercase;
          font-family: Roboto;
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
      _yearFrom: {type: String},
      _yearUntil: {type: String},
      _serverLang: {type: String},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.label = ''
    this.rule = ''
    this.open = false
    this._yearFrom = null
    this._yearUntil = new Date().getFullYear()
    this._serverLang = getSettings().serverLang
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
      const date = this._serverLang
        ? dateSpanLocal(year1, year2, 'de')
        : `from ${year1} until ${year2}`
      const rules = [{name: this.rule, values: [date, '', '']}]
      fireEvent(this, 'filter:changed', {filters: {rules}, replace: this.rule})
    }
  }

  connectedCallback() {
    super.connectedCallback()
  }
}

window.customElements.define('grampsjs-filter-years', GrampsjsFilterYears)
