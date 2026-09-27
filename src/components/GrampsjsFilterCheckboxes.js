import {LitElement, css, html} from 'lit'
import '@material/web/checkbox/checkbox'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {rulesEqual} from '../filterDefinitions.js'

export class GrampsjsFilterCheckboxes extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0.5em 0;
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
    this.section = {entries: []}
    this.rules = []
  }

  render() {
    return html`
      ${this.section.entries.map(
        (entry, i) => html`
          <label>
            <md-checkbox
              data-index="${i}"
              .checked="${this.rules.some(rule =>
                rulesEqual(rule, entry.rule)
              )}"
              @change="${this._handleChange}"
            ></md-checkbox>
            <span>${entry.label}</span>
          </label>
        `
      )}
    `
  }

  _handleChange() {
    const rules = [...this.renderRoot.querySelectorAll('md-checkbox')]
      .filter(box => box.checked)
      .map(box => this.section.entries[box.dataset.index].rule)
    fireEvent(this, 'filter-section:change', {rules})
  }
}

window.customElements.define(
  'grampsjs-filter-checkboxes',
  GrampsjsFilterCheckboxes
)
