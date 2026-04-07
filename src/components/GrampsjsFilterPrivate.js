import {LitElement, css, html} from 'lit'
import '@material/web/checkbox/checkbox'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsFilterPrivate extends GrampsjsAppStateMixin(LitElement) {
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
      rule: {type: String},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.rule = ''
  }

  render() {
    return html`
      <h3>${this._('Privacy')}</h3>
      <label>
        <md-checkbox
          id="private"
          @change="${this._handleChange}"
          ?checked="${this.filters.some(f => f.name === this.rule)}"
        ></md-checkbox>
        <span>${this._('Private')}</span>
      </label>
    `
  }

  _handleChange(event) {
    const rules = event.target.checked ? [{name: this.rule}] : []
    fireEvent(this, 'filter:changed', {filters: {rules}, replace: this.rule})
  }
}

window.customElements.define('grampsjs-filter-private', GrampsjsFilterPrivate)
