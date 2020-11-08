import { LitElement, html, css } from 'lit-element';


const __APIHOST_DEV__ = "http://localhost:5555"

export class GrampsJs extends LitElement {
  static get properties() {
    return {
      apihost: { type: String },
      strings: { type: Object },
    };
  }

  constructor() {
    super();
    this.apihost = __APIHOST_DEV__;
    this.strings = {};
  }

  static get styles() {
    return css`
      :host {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 960px;
        margin: 0 auto;
        text-align: center;
      }

      main {
        flex-grow: 1;
      }
    `;
  }

  render() {
    return html`
      <main>
        <h1>Gramps.js</h1>
        <p>API host: ${this.apihost}</p>
      </main>
    `;
  }

}
