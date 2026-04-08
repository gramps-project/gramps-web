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
        h3 {
          font-size: 14px;
          text-transform: uppercase;
          font-family: var(--grampsjs-body-font-family);
          font-weight: 500;
          color: var(--mdc-theme-primary);
          border-color: var(--mdc-theme-primary);
          border-bottom-width: 1px;
        }

        label {
          margin: 0.5em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      filters: {type: Array},
    }
  }

  constructor() {
    super()
    this.filters = []
  }

  render() {
    return html`
      <h3>${this._('Subject')}</h3>
      <div role="radiogroup">
        ${filterObjectTypes.map(
          key => html`
            <label for="objtype-${key}">
              <md-radio
                id="objtype-${key}"
                name="objtype"
                @change="${this._handleChange}"
                ?checked="${this.filters.some(
                  rule =>
                    rule.name === 'IsReferencedByObjectType' &&
                    rule.values[0] === key
                )}"
              ></md-radio>
              <span>${this._(key)}</span>
            </label>
          `
        )}
      </div>
    `
  }

  _handleChange(event) {
    const objType = event.target.id.replace('objtype-', '')
    const rules = [
      {
        name: 'IsReferencedByObjectType',
        _slot: 'IsReferencedByObjectType',
        values: [objType],
      },
    ]
    fireEvent(this, 'filter:changed', {
      filters: {rules},
      replace: 'IsReferencedByObjectType',
    })
  }
}

window.customElements.define(
  'grampsjs-filter-object-type',
  GrampsjsFilterObjectType
)
