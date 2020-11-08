import { css, LitElement } from 'lit-element';
import { sharedStyles } from '../SharedStyles.js';

export class GrampsjsObject extends LitElement {
  static get styles() {
    return [
      sharedStyles,
    ];
  }

  static get properties() {
    return {
      data: { type: Object },
      strings: { type: Object },
    };
  }

  constructor() {
    super();
    this.data = {};
    this.strings = {};
  }


  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

