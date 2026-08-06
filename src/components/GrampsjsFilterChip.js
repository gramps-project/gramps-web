import {LitElement, css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'
import '@material/web/iconbutton/icon-button.js'
import './GrampsjsIcon.js'

import {mdiClose} from '@mdi/js'
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
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          font-weight: 400;
          font-family: var(--grampsjs-body-font-family);
          padding: 6px 14px;
          border-radius: 8px;
          margin: 5px 5px;
          background-color: var(--mdc-theme-primary);
          color: var(--mdc-theme-on-primary);
          line-height: 18px;
        }

        .chip md-icon-button {
          margin-left: 4px;
          --md-icon-button-icon-size: 14px;
          --md-icon-button-state-layer-width: 18px;
          --md-icon-button-state-layer-height: 18px;
        }

        .monospace {
          font-family: var(--grampsjs-mono-font-family);
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
          : this.label}<md-icon-button
          aria-label="${this._('Clear')}"
          @click=${this._handleClear}
        >
          <grampsjs-icon
            path="${mdiClose}"
            color="var(--mdc-theme-on-primary)"
            width="14"
            height="14"
          ></grampsjs-icon> </md-icon-button
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
