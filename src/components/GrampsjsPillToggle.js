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
          margin: 12px 0;
        }

        button + button {
          border-left: 1px solid
            var(--md-sys-color-outline, var(--mdc-theme-primary));
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

        button:first-child {
          border-radius: 999px 0 0 999px;
        }

        button:last-child {
          border-radius: 0 999px 999px 0;
        }

        button:only-child {
          border-radius: 999px;
        }

        button:hover {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-primary, var(--mdc-theme-primary)) 8%,
            transparent
          );
        }

        @keyframes focus-ring-pulse {
          0% {
            outline-width: 0;
          }
          25% {
            outline-width: 8px;
          }
          100% {
            outline-width: 3px;
          }
        }

        button:focus-visible {
          outline: 3px solid
            var(--md-sys-color-secondary, var(--mdc-theme-secondary));
          outline-offset: 2px;
          animation: focus-ring-pulse 600ms cubic-bezier(0.2, 0, 0, 1) forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          button:focus-visible {
            animation: none;
          }
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
        role="radiogroup"
        aria-label="${ifDefined(this.ariaLabel || undefined)}"
        @keydown="${this._handleKeydown}"
      >
        ${this.options.map(
          opt => html`
            <button
              type="button"
              role="radio"
              class="${opt.value === this.selected ? 'active' : ''}"
              aria-checked="${opt.value === this.selected}"
              tabindex="${opt.value === this.selected ||
              (this.selected == null && opt === this.options[0])
                ? '0'
                : '-1'}"
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

  _handleKeydown(e) {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
    if (!forward && !backward) return
    e.preventDefault()
    const buttons = [...this.renderRoot.querySelectorAll('button')]
    if (!buttons.length) return
    const i = buttons.findIndex(b => b.getAttribute('aria-checked') === 'true')
    const current = i === -1 ? 0 : i
    const next =
      buttons[(current + (forward ? 1 : -1) + buttons.length) % buttons.length]
    next?.click()
    next?.focus()
  }
}

window.customElements.define('grampsjs-pill-toggle', GrampsjsPillToggle)
