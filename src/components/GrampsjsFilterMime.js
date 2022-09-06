import {LitElement, css, html} from 'lit'
import '@material/mwc-radio'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent, filterMime} from '../util.js'

export class GrampsjsFilterMime extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          font-size: 14px;
          text-transform: uppercase;
          font-family: Roboto;
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
    }
  }

  constructor() {
    super()
    this.filters = []
  }

  render() {
    return html`
      <h3>${this._('_Media Type:').replace(':', '')}</h3>
      ${Object.keys(filterMime).map(
        key => html`
          <mwc-formfield label="${this._(filterMime[key])}">
            <mwc-radio
              id="${key}"
              @change="${this._handleChange}"
              ?checked="${this.filters.filter(
                rule => rule.name === 'HasMedia' && rule.values[1] === key
              ).length > 0}"
            ></mwc-radio>
          </mwc-formfield>
        `
      )}
    `
  }

  _handleChange(event) {
    const mime = event.target.id
    const rules = [{name: 'HasMedia', values: ['', mime, '', '']}]
    fireEvent(this, 'filter:changed', {filters: {rules}, replace: 'HasMedia'})
  }
}

window.customElements.define('grampsjs-filter-mime', GrampsjsFilterMime)
