import {LitElement, css, html} from 'lit'
import {ifDefined} from 'lit/directives/if-defined.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'

export class GrampsjsPillToggle extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          --_label-color: var(--md-sys-color-primary, var(--mdc-theme-primary));
          --_hover-color: var(--md-sys-color-primary, var(--mdc-theme-primary));
          --_selected-container-color: var(
            --md-sys-color-primary,
            var(--mdc-theme-primary)
          );
          --_selected-label-color: var(--md-sys-color-on-primary, #fff);
        }

        /* Grey options, with a light tint of the primary colour for the
           selected one */
        :host([muted]) {
          --_label-color: var(--grampsjs-body-font-color-50);
          --_hover-color: var(--md-sys-color-primary);
          --_selected-container-color: color-mix(
            in srgb,
            var(--md-sys-color-primary) 12%,
            transparent
          );
          --_selected-label-color: var(--md-sys-color-primary);
        }

        .container {
          display: inline-flex;
          border: 1px solid
            var(--md-sys-color-outline, var(--mdc-theme-primary));
          border-radius: 999px;
          margin: var(--grampsjs-pill-toggle-margin, 12px 0);
        }

        /* Options with an icon show only the icon when the toggle is narrower
           than 900px, which the labels of the current translations fit */
        :host([icons-only-narrow]) {
          display: block;
          container-type: inline-size;
        }

        button + button {
          border-left: 1px solid
            var(--md-sys-color-outline, var(--mdc-theme-primary));
        }

        button {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          padding: var(--grampsjs-pill-toggle-padding, 6px 18px);
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
          color: var(--_label-color);
          background: transparent;
          transition: background-color 150ms, color 150ms;
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        @container (max-width: 900px) {
          :host([icons-only-narrow]) button.has-icon .label {
            display: none;
          }

          :host([icons-only-narrow]) button.has-icon {
            padding-left: 14px;
            padding-right: 14px;
          }
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
            var(--_hover-color) 8%,
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
          background-color: var(--_selected-container-color);
          color: var(--_selected-label-color);
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
      iconsOnlyNarrow: {
        type: Boolean,
        attribute: 'icons-only-narrow',
        reflect: true,
      },
      muted: {type: Boolean, reflect: true},
    }
  }

  // Each option has a `value` and a `label`, and optionally the path of an
  // `icon`, turned by `rotate` degrees
  constructor() {
    super()
    this.options = []
    this.selected = null
    this.ariaLabel = ''
    this.iconsOnlyNarrow = false
    this.muted = false
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
              class="${opt.value === this.selected ? 'active' : ''} ${opt.icon
                ? 'has-icon'
                : ''}"
              aria-checked="${opt.value === this.selected}"
              aria-label="${ifDefined(opt.icon ? opt.label : undefined)}"
              tabindex="${opt.value === this.selected ||
              (this.selected == null && opt === this.options[0])
                ? '0'
                : '-1'}"
              @click="${() => this._handleClick(opt.value)}"
            >
              ${opt.icon
                ? html`<grampsjs-icon
                    path="${opt.icon}"
                    rotate="${opt.rotate ?? 0}"
                    color="currentColor"
                    height="20"
                    width="20"
                  ></grampsjs-icon>`
                : ''}
              <span class="label">${opt.label}</span>
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
