import {LitElement, css, html} from 'lit'
import '@material/web/textfield/outlined-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, debounce} from '../util.js'

export class GrampsjsFilterText extends GrampsjsAppStateMixin(LitElement) {
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

        md-outlined-text-field {
          width: 100%;
          --md-outlined-text-field-container-shape: 8px;
          --md-outlined-text-field-top-space: 9px;
          --md-outlined-text-field-bottom-space: 9px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      filters: {type: Array},
      label: {type: String},
      rule: {type: String},
      valueIndex: {type: Number},
      numArgs: {type: Number},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.label = ''
    this.rule = ''
    this.valueIndex = 0
    this.numArgs = 1
  }

  get _slot() {
    return `${this.rule}:${this.valueIndex}`
  }

  get _currentValue() {
    const rule = this.filters.find(f => (f._slot ?? f.name) === this._slot)
    return rule?.values?.[this.valueIndex] ?? ''
  }

  render() {
    return html`
      <h3>${this._(this.label)}</h3>
      <md-outlined-text-field
        id="text-input"
        label="${this._(this.label)}"
        value="${this._currentValue}"
        @input="${debounce(() => this._handleInput(), 400)}"
      ></md-outlined-text-field>
    `
  }

  updated(changed) {
    if (changed.has('filters')) {
      const el = this.renderRoot.querySelector('#text-input')
      if (el) {
        el.value = this._currentValue
      }
    }
  }

  _handleInput() {
    const el = this.renderRoot.querySelector('#text-input')
    if (!el) return
    const value = el.value.trim()
    const values = Array(this.numArgs).fill('')
    values[this.valueIndex] = value
    const rules = value ? [{name: this.rule, _slot: this._slot, values}] : []
    fireEvent(this, 'filter:changed', {
      filters: {rules},
      replace: this._slot,
    })
  }
}

window.customElements.define('grampsjs-filter-text', GrampsjsFilterText)
