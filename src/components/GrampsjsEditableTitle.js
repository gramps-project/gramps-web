/*
A heading text that can be edited in place. Meant to be placed in an h2,
whose font it takes on.

When `editable`, clicking the text or the pencil button turns it into a field
that saves on Enter or when it loses focus and cancels on Escape. Saving fires
an `edit:action` that updates the property `prop` of the object.
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiCheck, mdiClose, mdiPencil} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'

import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsEditableTitle extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          font: inherit;
          line-height: inherit;
        }

        .display,
        .editing {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .text.editable {
          cursor: text;
          border-radius: 5px;
          padding: 0 6px;
          margin-left: -6px;
        }

        .text.editable:hover {
          background-color: var(
            --grampsjs-editable-title-hover-background-color
          );
        }

        input {
          flex: 1;
          min-width: 0;
          font: inherit;
          color: inherit;
          background: none;
          border: none;
          border-bottom: 2px solid var(--mdc-theme-secondary);
          padding: 0 0 2px 0;
          margin: 0;
          outline: none;
        }

        input[aria-invalid='true'] {
          border-bottom-color: var(--grampsjs-alert-error-font-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: String},
      prop: {type: String},
      placeholder: {type: String},
      editable: {type: Boolean},
      required: {type: Boolean},
      _editing: {type: Boolean},
      _invalid: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.prop = 'title'
    this.placeholder = ''
    this.editable = false
    this.required = false
    this._editing = false
    this._invalid = false
    // the value when editing started
    this._startValue = ''
  }

  willUpdate(changed) {
    if (changed.has('editable') && !this.editable) {
      this._editing = false
    }
  }

  render() {
    return this._editing ? this._renderEditing() : this._renderText()
  }

  // Clicking the text starts editing, like the pencil button, which is the
  // way to start editing by keyboard
  /* eslint-disable lit-a11y/click-events-have-key-events */
  _renderText() {
    return html`<div class="display">
      <span
        class="${classMap({text: true, editable: this.editable})}"
        @click="${this._handleTextClick}"
        >${this.value || this.placeholder}</span
      >
      ${this.editable
        ? html`
            <md-icon-button
              id="btn-edit"
              class="edit"
              aria-label="${this._('Edit')}"
              @click="${this._handleEdit}"
            >
              <grampsjs-icon
                path="${mdiPencil}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
            <grampsjs-tooltip for="btn-edit" .appState="${this.appState}"
              >${this._('Edit')}</grampsjs-tooltip
            >
          `
        : ''}
    </div>`
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */

  // The buttons keep the focus in the input on mousedown, so that it does
  // not save on blur before the button is clicked
  _renderEditing() {
    return html`
      <div class="editing">
        <input
          type="text"
          aria-label="${this._('Title')}"
          aria-invalid="${this._invalid}"
          @keydown="${this._handleKeyDown}"
          @input="${this._handleInput}"
          @blur="${this._handleBlur}"
        />
        <md-icon-button
          id="btn-save"
          class="edit"
          aria-label="${this._('_Save')}"
          @mousedown="${e => e.preventDefault()}"
          @click="${() => this._save()}"
        >
          <grampsjs-icon
            path="${mdiCheck}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="btn-save" .appState="${this.appState}"
          >${this._('_Save')}</grampsjs-tooltip
        >
        <md-icon-button
          id="btn-cancel"
          class="edit"
          aria-label="${this._('Cancel')}"
          @mousedown="${e => e.preventDefault()}"
          @click="${() => this._cancel()}"
        >
          <grampsjs-icon
            path="${mdiClose}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="btn-cancel" .appState="${this.appState}"
          >${this._('Cancel')}</grampsjs-tooltip
        >
      </div>
    `
  }

  get _input() {
    return this.renderRoot.querySelector('input')
  }

  // The input is filled once, so reloads of `value` while editing do not
  // overwrite what is being typed
  async _handleEdit() {
    this._invalid = false
    this._editing = true
    this._startValue = this.value ?? ''
    await this.updateComplete
    const input = this._input
    input.value = this._startValue
    input.focus()
    input.select()
  }

  _handleTextClick() {
    if (this.editable) {
      this._handleEdit()
    }
  }

  _handleInput() {
    this._invalid = false
  }

  // keys that confirm a character of an input method editor are left to it
  _handleKeyDown(e) {
    if (e.isComposing) {
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      this._save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this._cancel()
    }
  }

  // A required title left empty is discarded when the input loses focus.
  // The focus stays where the user moved it.
  _handleBlur() {
    if (!this._editing) {
      return
    }
    if (this.required && this._input.value.trim() === '') {
      this._cancel({restoreFocus: false})
    } else {
      this._save({restoreFocus: false})
    }
  }

  // An untouched text is not saved, so that it does not overwrite a value
  // that was reloaded while editing
  _save({restoreFocus = true} = {}) {
    if (!this._editing) {
      return
    }
    const value = this._input.value.trim()
    if (this.required && value === '') {
      this._invalid = true
      this._input.focus()
      return
    }
    if (value !== this._startValue && value !== (this.value ?? '')) {
      fireEvent(this, 'edit:action', {
        action: 'updateProp',
        data: {[this.prop]: value},
      })
    }
    this._finishEditing(restoreFocus)
  }

  _cancel({restoreFocus = true} = {}) {
    this._finishEditing(restoreFocus)
  }

  async _finishEditing(restoreFocus) {
    this._editing = false
    await this.updateComplete
    if (restoreFocus) {
      this.renderRoot.getElementById('btn-edit')?.focus()
    }
  }
}

window.customElements.define('grampsjs-editable-title', GrampsjsEditableTitle)
