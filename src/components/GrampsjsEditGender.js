import { LitElement, html } from 'lit';

import '@material/mwc-icon-button';

import { sharedStyles } from '../SharedStyles.js';
import { fireEvent } from '../util.js';

const icons = {
  0: 'female',
  1: 'male',
  2: 'question_mark',
};

const newGender = {
  0: 1,
  1: 2,
  2: 0,
};

export class GrampsjsEditGender extends LitElement {
  static get styles() {
    return [sharedStyles];
  }

  static get properties() {
    return {
      gender: { type: Number },
      edit: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.gender = 2; // unkown
    this.edit = false;
  }

  render() {
    if (!this.edit) {
      return '';
    }
    return html`
      <mwc-icon-button
        icon="${icons[this.gender]}"
        @click="${this._handleClick}"
        class="edit"
      ></mwc-icon-button>
    `;
  }

  _handleClick(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: { gender: newGender[this.gender] },
    });
  }
}

window.customElements.define('grampsjs-edit-gender', GrampsjsEditGender);
