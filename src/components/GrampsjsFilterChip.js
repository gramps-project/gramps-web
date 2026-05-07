import {LitElement, css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-icon-button'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

import {fireEvent} from '../util.js'
import './GrampsjsFormNewTag.js'

export class GrampsjsFilterChip extends GrampsjsAppStateMixin(LitElement) {
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
          color: var(--mdc-theme-on-primary);
          line-height: 18px;
        }

        .chip mwc-icon-button {
          margin-left: 4px;
          --mdc-icon-size: 14px;
          --mdc-icon-button-size: 18px;
        }

        .monospace {
          font-family: 'Commit Mono';
        }
      `,
    ]
  }

  static get properties() {
    return {
      label: {type: String},
      monospace: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.label = ''
    this.monospace = false
  }

  render() {
    return html`
      <span
        class="${classMap({monospace: this.monospace, chip: true})}"
        id="filter-label"
        >${this.monospace && this.label.length > 20
          ? html`${this.label.substring(0, 20)}&hellip;`
          : this.label}<mwc-icon-button
          icon="clear"
          @click=${this._handleClear}
        ></mwc-icon-button
      ></span>
      ${this.monospace
        ? html`<grampsjs-tooltip
            for="filter-label"
            content="${this.label}"
            theme="monospace"
          ></grampsjs-tooltip>`
        : ''}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _handleClear() {
    fireEvent(this, 'filter-chip:clear')
  }
}

window.customElements.define('grampsjs-filter-chip', GrampsjsFilterChip)
