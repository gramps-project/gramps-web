import { LitElement, html, css } from 'lit-element';

import './views/GrampsjsViewPerson.js'


export class GrampsJs extends LitElement {
  static get properties() {
    return {
      strings: { type: Object },
    };
  }

  constructor() {
    super();
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

        <grampsjs-view-person grampsId="I0044"></grampsjs-view-person>
      </main>
    `;
  }

}
