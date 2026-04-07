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
      publicRule: {type: String},
    }
  }

  constructor() {
    super()
    this.filters = []
    this.rule = ''
    this.publicRule = ''
  }

  render() {
    return html`
      <h3>${this._('Privacy')}</h3>
      <label for="private">
        <md-checkbox
          id="private"
          @change="${this._handleChange}"
          ?checked="${this.filters.some(f => f.name === this.rule)}"
        ></md-checkbox>
        <span>${this._('Private')}</span>
      </label>
      ${this.publicRule
        ? html`
            <label for="public">
              <md-checkbox
                id="public"
                @change="${this._handleChangePublic}"
                ?checked="${this.filters.some(f => f.name === this.publicRule)}"
              ></md-checkbox>
              <span>${this._('Not private')}</span>
            </label>
          `
        : ''}
    `
  }

  _handleChange(event) {
    const rules = event.target.checked ? [{name: this.rule}] : []
    fireEvent(this, 'filter:changed', {filters: {rules}, replace: this.rule})
  }

  _handleChangePublic(event) {
    const rules = event.target.checked ? [{name: this.publicRule}] : []
    fireEvent(this, 'filter:changed', {
      filters: {rules},
      replace: this.publicRule,
    })
  }
}

window.customElements.define('grampsjs-filter-private', GrampsjsFilterPrivate)
