import {LitElement, css, html} from 'lit'
import '@material/web/radio/radio'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, filterMime} from '../util.js'

export class GrampsjsFilterMime extends GrampsjsAppStateMixin(LitElement) {
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
    this.section = {}
    this.rules = []
  }

  render() {
    const selected = this.rules[0]?.values?.[1]
    return html`
      <div role="radiogroup">
        ${Object.keys(filterMime).map(
          key => html`
            <label>
              <md-radio
                name="mime"
                value="${key}"
                .checked="${key === selected}"
                @change="${this._handleChange}"
              ></md-radio>
              <span>${this._(filterMime[key])}</span>
            </label>
          `
        )}
      </div>
    `
  }

  _handleChange(event) {
    const rule = {
      name: this.section.rule,
      values: ['', event.target.value, '', ''],
    }
    fireEvent(this, 'filter-section:change', {rules: [rule]})
  }
}

window.customElements.define('grampsjs-filter-mime', GrampsjsFilterMime)
