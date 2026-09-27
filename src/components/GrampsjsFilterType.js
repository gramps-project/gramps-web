import {LitElement, css, html} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsFormSelectType.js'

import {fireEvent} from '../util.js'

export class GrampsjsFilterType extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          max-width: 400px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      section: {type: Object},
      rules: {type: Array},
      types: {type: Object},
      loadingTypes: {type: Boolean},
      typesLocale: {type: Object},
    }
  }

  constructor() {
    super()
    this.section = {}
    this.rules = []
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
  }

  render() {
    return html`
      <grampsjs-form-select-type
        id="type"
        noheading
        nocustom
        label="${this.section.label}"
        .appState="${this.appState}"
        typeName="${this.section.typeName}"
        defaultValue=""
        .value="${this.rules[0]?.values?.[0] ?? ''}"
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
    event.stopPropagation()
    const type = event.detail.data
    const rules = type ? [{name: this.section.rule, values: [type]}] : []
    fireEvent(this, 'filter-section:change', {rules})
  }
}

window.customElements.define('grampsjs-filter-type', GrampsjsFilterType)
