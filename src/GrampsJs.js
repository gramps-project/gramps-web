import { LitElement, html, css } from 'lit-element';
import { installRouter } from 'pwa-helpers/router.js';
import { installMediaQueryWatcher } from 'pwa-helpers/media-query.js';
import '@material/mwc-drawer'
import '@material/mwc-tab'
import '@material/mwc-tab-bar'
import '@material/mwc-top-app-bar'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import './components/GrampsJsListItem.js'


import './views/GrampsjsViewPerson.js'
import './views/GrampsjsViewPeople.js'
import { sharedStyles } from './SharedStyles.js';

export class GrampsJs extends LitElement {
  static get properties() {
    return {
      strings: { type: Object },
      wide: {type: Boolean},
      _page: { type: String },
      _pageId: { type: String },
    };
  }

  constructor() {
    super();
    this.strings = {};
    this._page = 'home';
    this._pageId = '';
    this.wide = false;
  }

  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
        min-height: 100vh;
      }

      main {
        padding: 25px;
      }

      .page {
        display: none;
      }

      .page[active] {
        display: block;
      }

      mwc-tab-bar {
        --mdc-typography-button-text-transform: none;
        --mdc-typography-button-font-weight: 400;
        --mdc-typography-button-letter-spacing: 0px;
        --mdc-typography-button-font-size: 16px;
      }

      mwc-top-app-bar {
        --mdc-typography-headline6-font-family: Roboto Slab;
        --mdc-typography-headline6-font-weight: 400;
        --mdc-typography-headline6-font-size: 19px;
      }

      mwc-tab {
        flex-grow: 0;
      }

      mwc-drawer {
        --mdc-drawer-width: 230px;
        --mdc-typography-headline6-font-family: Roboto Slab;
        --mdc-typography-headline6-font-weight: 400;
        --mdc-typography-headline6-font-size: 19px;
      }

      mwc-drawer[open]:not([type="modal"]) {
        --mdc-top-app-bar-width: calc(100% - var(--mdc-drawer-width, 256px));
      }


    `
    ]
  }

  render() {

    const tabs = {
      people: 'People',
      events: 'Events',
      places: 'Places',
    }

    return html`
      <mwc-drawer hasHeader type="dismissible" id="app-drawer" ?open="${this.wide}">
        <span slot="title">Menu</span>
        <div>
          <mwc-list>
            <li divider padded role="separator"></li>
            <grampsjs-list-item href="/" graphic="icon">
              <span>Home</span>
              <mwc-icon slot="graphic">home</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/people" graphic="icon">
              <span>Lists</span>
              <mwc-icon slot="graphic">list</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/map" graphic="icon">
              <span>Map</span>
              <mwc-icon slot="graphic">map</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/tree" graphic="icon">
              <span>Tree</span>
              <mwc-icon slot="graphic">account_tree</mwc-icon>
            </grampsjs-list-item>
            <li divider padded role="separator"></li>
            <grampsjs-list-item href="/recent" graphic="icon">
              <span>History</span>
              <mwc-icon slot="graphic">history</mwc-icon>
            </grampsjs-list-item>
          </mwc-list>
        </div>
        <div slot="appContent" id="top-app-bar-parent">
          <mwc-top-app-bar>
            <mwc-icon-button slot="navigationIcon" icon="menu"></mwc-icon-button>
            <div slot="title">Gramps.js</div>
          </mwc-top-app-bar>

        <main>

        ${this._tabHtml(tabs)}

        <grampsjs-view-people class="page" ?active=${this._page === 'people'}></grampsjs-view-people>
        <grampsjs-view-person class="page" ?active=${this._page === 'person'} grampsId="${this._pageId}"></grampsjs-view-person>

        </main>

      </div>
      </mwc-drawer>

    `;
  }

  _tabHtml(tabs) {
    if (!(this._page in tabs)) {
      return ``
    }
    return html`
    <mwc-tab-bar activeIndex="${Object.keys(tabs).indexOf(this._page)}">
    ${Object.keys(tabs).map(key => {
      return html`<mwc-tab label="${tabs[key]}" @click="${() => this._handleTab(key)}"></mwc-tab>`
    })}
    </mwc-tab-bar>
  `
  }

  _toggleDrawer() {
    const drawer = this.shadowRoot.getElementById('app-drawer');
    drawer.open = !drawer.open;
  }

  firstUpdated() {
    installRouter((location) => this._loadPage(decodeURIComponent(location.pathname)));
    installMediaQueryWatcher(`(min-width: 768px)`, (matches) => {this.wide = matches});
    const container = this.shadowRoot.getElementById('top-app-bar-parent');
    this.boundToggleDrawer = this._toggleDrawer.bind(this);
    container.addEventListener('MDCTopAppBar:nav', this.boundToggleDrawer);
    this.boundHandleNav = this._handleNav.bind(this);
    container.addEventListener('nav', this.boundHandleNav);
  }

  _loadPage(path) {
    if (path === "/") {
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

  _handleTab(page) {
    if (page !== this._page) {
      const href = `/${page}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
    }
  }

  _handleNav(e) {
    const {page} = e.detail
    if (page !== this._page) {
      const href = `/${page}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
    }
  }

}
