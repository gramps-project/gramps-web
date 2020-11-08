import { html, css, LitElement } from 'lit-element';

export class GrampsjsPerson extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        padding: 25px;
        color: var(--grampsjs-person-text-color, #000);
      }
    `;
  }

  static get properties() {
    return {
      data: { type: Object },
    };
  }

  constructor() {
    super();
    this.data = {};
  }

  // __increment() {
  // }

  render() {
    return html`
      ${JSON.stringify(this.data)}
    `;
  }
}


window.customElements.define('grampsjs-person', GrampsjsPerson);
