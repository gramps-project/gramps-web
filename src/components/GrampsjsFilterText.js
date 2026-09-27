import {LitElement, css, html} from 'lit'
import '@material/web/textfield/outlined-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, debounce} from '../util.js'
import {indexedRule} from '../filterDefinitions.js'

export class GrampsjsFilterText extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          max-width: 400px;
        }

        md-outlined-text-field {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      section: {type: Object},
      rules: {type: Array},
    }
  }

  constructor() {
    super()
    this.section = {}
    this.rules = []
    this._handleInput = debounce(() => this._applyInput(), 400)
  }

  render() {
    return html`
      <md-outlined-text-field
        id="text-input"
        label="${this.section.label}"
        value="${this.rules[0]?.values?.[this.section.index] ?? ''}"
        @input="${this._handleInput}"
      ></md-outlined-text-field>
    `
  }

  _applyInput() {
    const value =
      this.renderRoot.querySelector('#text-input')?.value.trim() ?? ''
    const rules = value ? [indexedRule(this.section, value)] : []
    fireEvent(this, 'filter-section:change', {rules})
  }
}

window.customElements.define('grampsjs-filter-text', GrampsjsFilterText)
