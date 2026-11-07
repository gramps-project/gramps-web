import {css, html} from 'lit'
import {MdOutlinedTextField} from '@material/web/textfield/outlined-text-field.js'

import {tokenizeGoql} from '../goqlTokens.js'

/*
Outlined text field for GOQL expressions with syntax highlighting. The native
input's text is transparent; a highlighted copy of it is stacked in the same
grid cell, so both share position, size and font.

renderInputOrTextarea is internal to @material/web (checked against 2.4.1);
the unit test fails if the highlight no longer ends up next to the input.
*/
export class GrampsjsGoqlInput extends MdOutlinedTextField {
  static get styles() {
    return [
      ...super.styles,
      css`
        :host {
          --md-outlined-text-field-input-text-font: var(
            --grampsjs-mono-font-family
          );
          --md-outlined-text-field-input-text-size: 15px;
          --md-outlined-text-field-input-text-color: transparent;
          --md-outlined-text-field-hover-input-text-color: transparent;
          --md-outlined-text-field-focus-input-text-color: transparent;
          --md-outlined-text-field-error-input-text-color: transparent;
          --md-outlined-text-field-error-hover-input-text-color: transparent;
          --md-outlined-text-field-error-focus-input-text-color: transparent;
          --goql-text: var(--grampsjs-color-code-text, #000);
          --md-outlined-text-field-caret-color: var(--goql-text);
          --md-outlined-text-field-focus-caret-color: var(--goql-text);
          --md-outlined-text-field-error-focus-caret-color: var(--goql-text);
        }

        .goql-stack {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        .goql-stack > * {
          grid-area: 1 / 1;
        }

        /* the input inherits its width from the wrapper, which is no longer
           the field's slotted content and so lacks the slot's width: 100% */
        .goql-stack > .input-wrapper {
          width: 100%;
        }

        .goql-highlight {
          overflow: hidden;
          white-space: nowrap;
          pointer-events: none;
          color: var(--goql-text);
        }

        /* only the token text keeps its spaces; the template's line breaks
           around them would otherwise add empty lines */
        .goql-highlight span {
          white-space: pre;
        }

        .keyword {
          color: var(--grampsjs-color-code-keyword);
        }

        .control {
          color: var(--grampsjs-color-code-control);
        }

        .constant {
          color: var(--grampsjs-color-code-constant);
        }

        .function {
          color: var(--grampsjs-color-code-function);
        }

        .type {
          color: var(--grampsjs-color-code-type);
        }

        .enum {
          color: var(--grampsjs-color-code-enum);
        }

        .variable {
          color: var(--grampsjs-color-code-variable);
        }

        .string {
          color: var(--grampsjs-color-code-string);
        }

        .number {
          color: var(--grampsjs-color-code-number);
        }

        /* nesting levels cycle through three colors */
        .bracket-0 {
          color: var(--grampsjs-color-code-bracket-1);
        }

        .bracket-1 {
          color: var(--grampsjs-color-code-bracket-2);
        }

        .bracket-2 {
          color: var(--grampsjs-color-code-bracket-3);
        }
      `,
    ]
  }

  static get properties() {
    return {
      _goqlScroll: {state: true},
    }
  }

  constructor() {
    super()
    this.autocomplete = 'off'
    this._goqlScroll = 0
  }

  firstUpdated(changed) {
    super.firstUpdated?.(changed)
    // spelling marks would show up under the transparent text
    const input = this.renderRoot.querySelector('.input')
    if (input) {
      input.spellcheck = false
    }
  }

  renderInputOrTextarea() {
    // the caret moves the input's scroll position without an input event
    const sync = {handleEvent: () => this._syncGoqlScroll(), capture: true}
    return html`
      <div
        class="goql-stack"
        @input="${sync}"
        @scroll="${sync}"
        @keyup="${sync}"
        @click="${sync}"
        @select="${sync}"
      >
        ${super.renderInputOrTextarea()}
        <div class="goql-highlight" aria-hidden="true">
          <span style="margin-left: -${this._goqlScroll}px"
            >${tokenizeGoql(this.value).map(
              token =>
                html`<span
                  class="${token.type === 'bracket'
                    ? `bracket-${token.depth % 3}`
                    : token.type}"
                  >${token.text}</span
                >`
            )}</span
          >
        </div>
      </div>
    `
  }

  // keeps the highlighted copy aligned when the text is wider than the field
  _syncGoqlScroll() {
    this._goqlScroll = this.renderRoot.querySelector('.input')?.scrollLeft ?? 0
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('value')) {
      this._syncGoqlScroll()
    }
  }
}

window.customElements.define('grampsjs-goql-input', GrampsjsGoqlInput)
