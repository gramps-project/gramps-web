import {LitElement, css, html} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-icon-button'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

import {fireEvent} from '../util.js'
import './GrampsjsFormNewTag.js'

export class GrampsjsFilterChip extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          align-items: center;
          display: inline-flex;
        }
        .chip {
          font-size: 13px;
          font-weight: 400;
          font-family: var(--grampsjs-body-font-family);
          padding: 6px 14px;
          border-radius: 9999px;
          margin: 5px 5px;
          background-color: var(--mdc-theme-primary);
          color: rgba(255, 255, 255, 0.9);
          line-height: 18px;
        }

        .chip mwc-icon-button {
          margin-left: 4px;
          --mdc-icon-size: 14px;
          --mdc-icon-button-size: 18px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      label: {type: String},
    }
  }

  constructor() {
    super()
    this.label = ''
  }

  render() {
    return html`
      <span class="chip"
        >${this.label}<mwc-icon-button
          icon="clear"
          @click=${this._handleClear}
        ></mwc-icon-button
      ></span>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _handleClear() {
    fireEvent(this, 'filter-chip:clear')
  }
}

window.customElements.define('grampsjs-filter-chip', GrampsjsFilterChip)
