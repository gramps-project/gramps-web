import { LitElement, css, html } from 'lit-element';

import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsSearchResults extends LitElement {

    static get styles() {
      return [
        sharedStyles,
        css`
        `
      ];
    }

  static get properties() {
    return {
      data: { type: Array },
      strings : {type: Object},
      total: {type: Number}
    };
  }

  constructor() {
    super();
    this.data = [];
    this.strings = {};
    this.total = 0;
  }

  render() {
    if (this.data.length === 0) {
      return html``
    }
    return html`
    <p>Total: ${this.total}</p>
    <div id="search-results">
    ${this.data.map(this._renderObj)}
    </div>
    `
  }

  _renderObj(obj) {
    return html`
    ${obj.object?.gramps_id}
    <pre>${JSON.stringify(obj.object)}</pre>
    <hr>`
  }

}


window.customElements.define('grampsjs-search-results', GrampsjsSearchResults);
