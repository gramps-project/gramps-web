import { LitElement, css } from 'lit-element';
import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsView extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`

      :host {
        margin-top: 25px;
        background-color: #ffffff;
      }

      `
    ];
  }

  // shouldUpdate() {
  //   return this.active;
  // }

  static get properties() {
    return {
      active: { type: Boolean },
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
