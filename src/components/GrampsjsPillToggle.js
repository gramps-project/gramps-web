import {LitElement, css, html} from 'lit'
import {ifDefined} from 'lit/directives/if-defined.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsPillToggle extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          display: inline-flex;
          border: 1px solid
            var(--md-sys-color-outline, var(--mdc-theme-primary));
          border-radius: 999px;
          overflow: hidden;
          margin: 12px 0;
        }

        button {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          padding: 6px 18px;
          font-family: var(
            --md-ref-typeface-plain,
            var(--grampsjs-body-font-family)
          );
          font-size: var(
            --grampsjs-pill-toggle-font-size,
            var(--md-sys-typescale-label-large-size, 14px)
          );
          font-weight: 500;
          letter-spacing: 0.006em;
          color: var(--md-sys-color-primary, var(--mdc-theme-primary));
          background: transparent;
          transition: background-color 150ms, color 150ms;
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
        }

        button:hover {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-primary, var(--mdc-theme-primary)) 8%,
            transparent
          );
        }

        button:focus-visible {
          outline: 2px solid
            var(--md-sys-color-primary, var(--mdc-theme-primary));
          outline-offset: -2px;
        }

        button.active {
          background-color: var(
            --md-sys-color-primary,
            var(--mdc-theme-primary)
          );
          color: var(--md-sys-color-on-primary, #fff);
        }

        button.active:hover {
          opacity: 0.92;
        }
      `,
    ]
  }

  static get properties() {
    return {
      options: {type: Array},
      selected: {attribute: false},
      ariaLabel: {type: String},
    }
  }

  constructor() {
    super()
    this.options = []
    this.selected = null
    this.ariaLabel = ''
  }

  render() {
    return html`
      <div
        class="container"
        role="group"
        aria-label="${ifDefined(this.ariaLabel || undefined)}"
      >
        ${this.options.map(
          opt => html`
            <button
              type="button"
              class="${opt.value === this.selected ? 'active' : ''}"
              aria-pressed="${opt.value === this.selected}"
              @click="${() => this._handleClick(opt.value)}"
            >
              ${opt.label}
            </button>
          `
        )}
      </div>
    `
  }

  _handleClick(value) {
    if (value !== this.selected) {
      fireEvent(this, 'pill-toggle:change', {value})
    }
  }
}

window.customElements.define('grampsjs-pill-toggle', GrampsjsPillToggle)
