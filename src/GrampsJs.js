import { LitElement, html, css } from 'lit-element';
import { installRouter } from 'pwa-helpers/router.js';

import './views/GrampsjsViewPerson.js'


export class GrampsJs extends LitElement {
  static get properties() {
    return {
      strings: { type: Object },
      _page: { type: String },
      _pageId: { type: String },
    };
  }

  constructor() {
    super();
    this.strings = {};
    this._page = 'home';
    this._pageId = '';
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

      .page {
        display: none;
      }

      .page[active] {
        display: block;
      }
    `;
  }

  render() {
    return html`
      <main>
      Page: ${this._page}
      Subpage: ${this._pageId}
      <h1>Gramps.js</h1>
      <p><a href="/">Home</a></p>
      <p><a href="/person/I0044">Person</a></p>
      <grampsjs-view-person
          class="page"
          ?active=${this._page === 'person'}
          grampsId="${this._pageId}"
        ></grampsjs-view-person>

      </main>
    `;
  }

  firstUpdated() {
    installRouter((location) => this._loadPage(decodeURIComponent(location.pathname)));
  }

  _loadPage(path) {
    if (path === "/") {
      console.log("hoooome")
      this._page = 'home';
      this._pageId = '';
    } else{
      const pathId = path.slice(1);
      const page = pathId.split('/')[0]
      const pageId = pathId.split('/')[1]
      this._page = page;
      this._pageId = pageId || '';
    }
  }

}
