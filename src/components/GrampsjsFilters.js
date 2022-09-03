import {LitElement, css, html} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsFilters extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          padding: 1em 0.1em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      filters: {type: Object},
      open: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.filters = {}
    this.open = false
  }

  render() {
    return html` <pre>${JSON.stringify(this.filters, null, 2)}</pre>
      <mwc-button
        icon="filter_list"
        ?unelevated="${this.open}"
        @click="${this._handleButton}"
        >${this._('filter')}</mwc-button
      >
      <div id="container" @filter:changed="${this._handleFilterChanged}">
        ${this.open ? html`<slot></slot>` : ''}
      </div>`
  }

  _handleButton() {
    this.open = !this.open
  }

  _handleFilterChanged(e) {
    const rules = e.detail?.filters?.rules
    const data = rules.reduce((obj, rule) => ({...obj, [rule.name]: rule}), {})
    if (rules) {
      this.filters = {...this.filters, ...data}
      e.preventDefault()
      e.stopPropagation()
      fireEvent(this, 'filters:changed', {filters: this.filters})
    }
  }
}

window.customElements.define('grampsjs-filters', GrampsjsFilters)
