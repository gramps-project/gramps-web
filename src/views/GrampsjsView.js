import { LitElement } from 'lit-element';
import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsView extends LitElement {
  static get styles() {
    return [
      sharedStyles,
    ];
  }

  static get properties() {
    return {
      strings: { type: Object },
    };
  }

  constructor() {
    super();
    this.strings = {};
  }


  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}
