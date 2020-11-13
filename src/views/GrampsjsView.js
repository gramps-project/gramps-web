/*
Base class for Gramps views
*/

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
      loading: {type: Boolean}
    };
  }

  constructor() {
    super();
    this.strings = {};
    this.active = false;
    this.loading = false;
  }

  update(changed) {
    super.update(changed);
    if (changed.has('loading')) {
      if (this.loading && this.active) {
        this.dispatchEvent(new CustomEvent("progress:on", {bubbles: true, composed: true}))
      }
      else if (!this.loading && this.active) {
        this.dispatchEvent(new CustomEvent("progress:off", {bubbles: true, composed: true}))
      }
    }
    if (changed.has('active')) {
      if (!this.active) {
        this.dispatchEvent(new CustomEvent("progress:off", {bubbles: true, composed: true}))
      }
      else if (this.loading) {
        this.dispatchEvent(new CustomEvent("progress:on", {bubbles: true, composed: true}))
      }
    }
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}
