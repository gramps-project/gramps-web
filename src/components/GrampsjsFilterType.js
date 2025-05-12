import {LitElement, css, html} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent} from '../util.js'

export class GrampsjsFilterType extends GrampsjsAppStateMixin(LitElement) {
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
      filters: {type: Array},
      label: {type: String},
      types: {type: Object},
      loadingTypes: {type: Boolean},
      typesLocale: {type: Object},
      typeName: {type: String},
      rule: {type: String},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.label = ''
    this.types = {}
    this.typesLocale = {}
    this.typeName = ''
    this.loadingTypes = false
    this.rule = 'HasType'
  }

  render() {
    return html`
      <h3>${this.label || this._('Type')}</h3>
      <grampsjs-form-select-type
        id="type"
        noheading
        nocustom
        valueNonLocal
        label="${this.label || this._('Type')}"
        .appState="${this.appState}"
        typeName="${this.typeName}"
        defaultTypeName=""
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        @formdata:changed="${this._handleChange}"
      >
      </grampsjs-form-select-type>
    `
  }

  updateTypeData() {
    this.loadingTypes = true
    this.appState
      .apiGet('/api/types/')
      .then(data => {
        if ('data' in data) {
          this.types = data.data || {}
        } else if ('error' in data) {
          fireEvent(this, 'grampsjs:error', {message: data.error})
        }
      })
      .then(() => {
        this.appState.apiGet('/api/types/?locale=1').then(data => {
          this.loadingTypes = false
          if ('data' in data) {
            this.typesLocale = data.data || {}
            this.error = false
          } else if ('error' in data) {
            fireEvent(this, 'grampsjs:error', {message: data.error})
          }
        })
      })
  }

  firstUpdated() {
    this.updateTypeData()
  }

  _handleChange(event) {
    const type = event.detail.data
    const rules = [{name: this.rule, values: [type]}]
    fireEvent(this, 'filter:changed', {filters: {rules}, replace: this.rule})
  }
}

window.customElements.define('grampsjs-filter-type', GrampsjsFilterType)
