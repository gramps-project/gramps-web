/*
Element for selecting a Gramps type
*/

import { html, css, LitElement } from 'lit';
import '@material/mwc-checkbox';

import { sharedStyles } from '../SharedStyles.js';
import { GrampsjsTranslateMixin } from '../mixins/GrampsjsTranslateMixin.js';

class GrampsjsFormPrivate extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``];
  }

  static get properties() {
    return {
      checked: { type: Boolean },
      disabled: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.checked = false;
    this.disabled = false;
  }

  render() {
    return html`
      <p>
        <mwc-formfield label="${this._('Private')}" id="switch-private">
          <mwc-checkbox
            id="private-checkbox"
            @change="${this.handleChange}"
            ?checked="${this.checked}"
            ?disabled="${this.disabled}"
          ></mwc-checkbox>
        </mwc-formfield>
      </p>
    `;
  }

  reset() {
    this.checked = false;
  }

  handleChange(e) {
    this.checked = e.target.checked;
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: { checked: this.checked },
      })
    );
  }
}

window.customElements.define('grampsjs-form-private', GrampsjsFormPrivate);
