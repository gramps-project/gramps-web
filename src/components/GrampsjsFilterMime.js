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
      <h3>${this._('_Media Type:').replace(':', '')}</h3>
      <div role="radiogroup">
        ${Object.keys(filterMime).map(
          key => html`
            <label for="${key}">
              <md-radio
                id="${key}"
                @change="${this._handleChange}"
                ?checked="${this.filters.filter(
                  rule => rule.name === 'HasMedia' && rule.values[1] === key
                ).length > 0}"
              ></md-radio>
              <span>${this._(filterMime[key])}</span></label
            >
          `
        )}
      </div>
    `
  }

  _handleChange(event) {
    const mime = event.target.id
    const rules = [{name: 'HasMedia', values: ['', mime, '', '']}]
    fireEvent(this, 'filter:changed', {filters: {rules}, replace: 'HasMedia'})
  }
}

window.customElements.define('grampsjs-filter-mime', GrampsjsFilterMime)
