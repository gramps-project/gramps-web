import {LitElement, css, html} from 'lit'
import '@material/web/textfield/outlined-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, debounce} from '../util.js'
import {parseYears, yearsRule} from '../filterDefinitions.js'

export class GrampsjsFilterYears extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        md-outlined-text-field {
          width: 160px;
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
    this._handleInput = debounce(() => this._applyInput(), 1000)
  }

  render() {
    const [yearFrom, yearUntil] = parseYears(this.rules[0], this.section.index)
    const maxYear = new Date().getFullYear()
    return html`
      <md-outlined-text-field
        type="number"
        max="${maxYear}"
        label="${this._('between')}"
        id="year-from"
        value="${yearFrom}"
        @input="${this._handleInput}"
      ></md-outlined-text-field>
      <md-outlined-text-field
        type="number"
        max="${maxYear}"
        label="${this._('and')}"
        id="year-until"
        value="${yearUntil || maxYear}"
        @input="${this._handleInput}"
      ></md-outlined-text-field>
    `
  }

  _applyInput() {
    const yearFrom = this.renderRoot.querySelector('#year-from')?.value
    const yearUntil = this.renderRoot.querySelector('#year-until')?.value
    if (!yearFrom && !yearUntil) {
      fireEvent(this, 'filter-section:change', {rules: []})
    } else if (yearFrom && yearUntil && Number(yearUntil) >= Number(yearFrom)) {
      const rule = yearsRule(
        this.section,
        yearFrom,
        yearUntil,
        this.appState.settings.serverLang
      )
      fireEvent(this, 'filter-section:change', {rules: [rule]})
    }
  }
}

window.customElements.define('grampsjs-filter-years', GrampsjsFilterYears)
