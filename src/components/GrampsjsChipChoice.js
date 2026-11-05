/*
A set of filter chips of which exactly one is selected.
*/

import {LitElement, css, html} from 'lit'
import {ifDefined} from 'lit/directives/if-defined.js'
import '@material/web/chips/chip-set.js'
import '@material/web/chips/filter-chip.js'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'

export class GrampsjsChipChoice extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        /* Selected chips are filled with the primary colour, like the other
           toggles and chips used for selecting */
        md-filter-chip {
          --md-filter-chip-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-hover-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-focus-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-pressed-label-text-color: var(
            --md-sys-color-primary
          );
          --md-filter-chip-selected-container-color: var(
            --md-sys-color-primary
          );
          --md-filter-chip-selected-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-focus-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-pressed-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-state-layer-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-leading-icon-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-leading-icon-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-focus-leading-icon-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-pressed-leading-icon-color: var(
            --md-sys-color-on-primary
          );
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

  // Each option has a `value` and a `label`
  constructor() {
    super()
    this.options = []
    this.selected = null
    this.ariaLabel = ''
  }

  render() {
    return html`
      <md-chip-set aria-label="${ifDefined(this.ariaLabel || undefined)}">
        ${this.options.map(
          opt => html`
            <md-filter-chip
              label="${opt.label}"
              .selected="${opt.value === this.selected}"
              @click="${e => this._handleClick(e, opt.value)}"
            ></md-filter-chip>
          `
        )}
      </md-chip-set>
    `
  }

  _handleClick(e, value) {
    // The chip toggles itself on click; preventing the default reverts that,
    // so the selection only changes through the `selected` property
    e.preventDefault()
    if (value !== this.selected) {
      fireEvent(this, 'chip-choice:change', {value})
    }
  }
}

window.customElements.define('grampsjs-chip-choice', GrampsjsChipChoice)
