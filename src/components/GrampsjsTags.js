import { LitElement, css, html } from 'lit-element';

import { hex12ToCss } from '../color.js';
import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsTags extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      .chip {
        font-size: 14px;
        font-weight: 400;
        font-family: Roboto;
        padding: 6px 12px;
        border-radius: 9999px;
        margin: 5px 0px;
        border-width: 1px;
        border-style: solid;
        display: inline-block;
      }

      .tags {
        margin: 10px 0px;
      }
      `
    ];
  }

  static get properties() {
    return {
      data: { type: Array },
    };
  }

  constructor() {
    super();
    this.data = [];
  }


  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
    <div class="tags">
    ${this.data.map(obj => html`
      <span
        class="chip"
        style="border-color:${hex12ToCss(obj.color, 0.9)};color:${hex12ToCss(obj.color, 0.9)};"
        >${obj.name}</span>
    `)}
    </div>
    `
  }

}


window.customElements.define('grampsjs-tags', GrampsjsTags);


