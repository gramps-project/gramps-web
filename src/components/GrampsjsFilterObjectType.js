import {LitElement, css, html} from 'lit'
import '@material/web/radio/radio'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export const filterObjectTypes = [
  'Person',
  'Family',
  'Event',
  'Place',
  'Source',
  'Citation',
  'Repository',
  'Note',
]

export class GrampsjsFilterObjectType extends GrampsjsAppStateMixin(
  LitElement
) {
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
    const selected = this.rules[0]?.values?.[0]
    return html`
      <div role="radiogroup">
        ${filterObjectTypes.map(
          key => html`
            <label>
              <md-radio
                name="objtype"
                value="${key}"
                .checked="${key === selected}"
                @change="${this._handleChange}"
              ></md-radio>
              <span>${this._(key)}</span>
            </label>
          `
        )}
      </div>
    `
  }

  _handleChange(event) {
    const rule = {name: this.section.rule, values: [event.target.value]}
    fireEvent(this, 'filter-section:change', {rules: [rule]})
  }
}

window.customElements.define(
  'grampsjs-filter-object-type',
  GrampsjsFilterObjectType
)
