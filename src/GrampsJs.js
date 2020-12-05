import { LitElement, html, css } from 'lit-element';
import { installRouter } from 'pwa-helpers/router.js';
import { installMediaQueryWatcher } from 'pwa-helpers/media-query.js';
import '@material/mwc-drawer'
import '@material/mwc-tab'
import '@material/mwc-tab-bar'
import '@material/mwc-top-app-bar'
import '@material/mwc-icon'
import '@material/mwc-button'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-linear-progress'
import '@material/mwc-circular-progress'
import '@material/mwc-snackbar'
import './components/GrampsJsListItem.js'
import { apiGetTokens, apiGet, doLogout, apiResetPassword } from './api.js'
import { grampsStrings, additionalStrings } from './strings.js'

import './views/GrampsjsViewPeople.js'
import './views/GrampsjsViewFamilies.js'
import './views/GrampsjsViewPlaces.js'
import './views/GrampsjsViewEvents.js'
import './views/GrampsjsViewSources.js'
import './views/GrampsjsViewCitations.js'
import './views/GrampsjsViewNotes.js'
import './views/GrampsjsViewMediaObjects.js'
import './views/GrampsjsViewPerson.js'
import './views/GrampsjsViewFamily.js'
import './views/GrampsjsViewPlace.js'
import './views/GrampsjsViewEvent.js'
import './views/GrampsjsViewSource.js'
import './views/GrampsjsViewCitation.js'
import './views/GrampsjsViewRepository.js'
import './views/GrampsjsViewNote.js'
import './views/GrampsjsViewMedia.js'
import './views/GrampsjsViewSearch.js'
import './views/GrampsjsViewRecent.js'
import { sharedStyles } from './SharedStyles.js';


const LOADING_STATE_INITIAL = 0
const LOADING_STATE_UNAUTHORIZED = 1
const LOADING_STATE_UNAUTHORIZED_NOCONNECTION = 2
const LOADING_STATE_UNAUTHORIZED_RESET_PW = 3
const LOADING_STATE_READY = 4


export class GrampsJs extends LitElement {
  static get properties() {
    return {
      wide: {type: Boolean},
      progress: {type: Boolean},
      loadingState: {type: Number},
      language: {type: String},
      _strings: { type: Object },
      _dbInfo: { type: Object },
      _page: { type: String },
      _pageId: { type: String },
    };
  }

  constructor() {
    super();
    this.wide = false;
    this.progress = false;
    this.loadingState = LOADING_STATE_INITIAL;
    this.language = '';
    this._strings = {};
    this._dbInfo = {};
    this._page = 'home';
    this._pageId = '';

    this.addEventListener('MDCTopAppBar:nav', this._toggleDrawer);
  }

  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
        min-height: 100vh;
      }

      main {
        padding: 10px 25px;
      }

      .page {
        display: none;
      }

      .page[active] {
        display: block;
      }

      mwc-top-app-bar {
        --mdc-typography-headline6-font-family: Roboto Slab;
        --mdc-typography-headline6-font-weight: 400;
        --mdc-typography-headline6-font-size: 19px;
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

      mwc-linear-progress {
        --mdc-theme-primary: #4FC3F7;
      }

      grampsjs-list-item span {
        color: #444;
      }

      #login-container {
        margin: auto;
        height: 100%;
        max-width: 20em;
      }

      #login-form {
        height: 100%;
        position: relative;
        top: 25vh;
      }

      #login-form mwc-textfield {
        width: 100%;
        margin-bottom: 0.7em;
      }

      #login-form mwc-button {
      }

      #user-menu mwc-button {
        margin: 0.5em 1em;
      }

      #person-button {
        margin-left: 60px;
        margin-top: 10px;
        background-color: #E0E0E0;
        color: #444;
        border-radius: 50%;
      }
      mwc-circular-progress {
        --mdc-theme-primary: white;
      }

      #app-title:first-letter {
        text-transform:capitalize;
      }

      p.reset-link {
        padding-top: 1em;
        font-size: 0.9em;
      }

      p.success {
        padding-top: 1em;
        color: #4CAF50;
        font-size: 1.2em;
        font-weight: 400;
        --mdc-icon-size: 1.6em;
        line-height: 1.4em;
        text-align: center;
      }
    `
    ]
  }

  render() {
    if (this.loadingState === LOADING_STATE_INITIAL) {
      return html`Loading ...`
    }
    if (this.loadingState === LOADING_STATE_UNAUTHORIZED_NOCONNECTION) {
      return html`No connection`
    }
    if (this.loadingState === LOADING_STATE_UNAUTHORIZED) {
      window.history.pushState({}, '', 'login')
      return html`
      <div id="login-container">
        <form id="login-form" action="/" @keydown="${this._handleLoginKey}">
          <mwc-textfield outlined id="username" label="Username"></mwc-textfield>
          <mwc-textfield outlined id="password" label="Password" type="password"></mwc-textfield>
          <mwc-button raised label="submit" type="submit" @click="${this._submitLogin}">
            <span slot="trailingIcon" style="display:none;">
              <mwc-circular-progress indeterminate density="-7" closed id="login-progress">
              </mwc-circular-progress>
            </span>
          </mwc-button>
          <p class="reset-link">
            <span class="link" @click="${() => this.loadingState = LOADING_STATE_UNAUTHORIZED_RESET_PW}"
            >Lost password?</span>
          </p>
        </form>
      </div>
      <mwc-snackbar id="error-snackbar"></mwc-snackbar>
      `
    }
    if (this.loadingState === LOADING_STATE_UNAUTHORIZED_RESET_PW) {
      return html`
      <div id="login-container">
        <form id="login-form" action="/">
          <div id="inner-form">
            <mwc-textfield outlined id="username" label="Username" type="text"></mwc-textfield>
            <mwc-button raised label="reset password" type="submit" @click="${this._resetPw}">
              <span slot="trailingIcon" style="display:none;">
                <mwc-circular-progress indeterminate density="-7" closed id="login-progress">
                </mwc-circular-progress>
              </span>
            </mwc-button>
          </div>
          <p class="success" id="reset-success" style="display:none;">
            <mwc-icon>check_circle</mwc-icon><br>
            A password reset link has been sent by e-mail.
          </p>
          <p class="reset-link">
            <span class="link" @click="${() => this.loadingState = LOADING_STATE_UNAUTHORIZED}"
            >Back</span>
          </p>
        </form>
      </div>
      <mwc-snackbar id="error-snackbar"></mwc-snackbar>
      `
    }
    const tabs = {
      people: this._('People'),
      families: this._('Families'),
      events: this._('Events'),
      places: this._('Places'),
      sources: this._('Sources'),
      citations: this._('Citations'),
      repositories: this._('Repositories'),
      notes: this._('Notes'),
      media: this._('Media Objects')
    }
    if (this.language !== '' && Object.keys(this._strings).length === 0) {
      this._loadStrings(grampsStrings, this.language);
    }
    return html`
      <mwc-drawer hasHeader type="dismissible" id="app-drawer" ?open="${this.wide}">
        <span slot="title" style="position: relative;">
          <mwc-icon-button icon="person" id="person-button" @click="${this._openUserMenu}"></mwc-icon-button>
          <mwc-menu absolute x="16" y="22" id="user-menu">
            <mwc-list-item @click=${this._logoutClicked} graphic="icon"><mwc-icon slot="graphic">exit_to_app</mwc-icon>Logout</mwc-list-item>
          </mwc-menu>
        </span>
        <div>
          <mwc-list>
            <li divider padded role="separator"></li>
            <grampsjs-list-item href="/" graphic="icon">
              <span>${this._('Home Page')}</span>
              <mwc-icon slot="graphic">home</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/" graphic="icon">
              <span>${this._('Blog')}</span>
              <mwc-icon slot="graphic">rss_feed</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/people" graphic="icon">
              <span>${this._('Lists')}</span>
              <mwc-icon slot="graphic">list</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/map" graphic="icon">
              <span>${this._('Map')}</span>
              <mwc-icon slot="graphic">map</mwc-icon>
            </grampsjs-list-item>
            <grampsjs-list-item href="/tree" graphic="icon">
              <span>${this._('Family Tree')}</span>
              <mwc-icon slot="graphic">account_tree</mwc-icon>
            </grampsjs-list-item>
            <li divider padded role="separator"></li>
            <grampsjs-list-item href="/recent" graphic="icon">
              <span>${this._('History')}</span>
              <mwc-icon slot="graphic">history</mwc-icon>
            </grampsjs-list-item>
          </mwc-list>
        </div>
        <div slot="appContent">
          <mwc-top-app-bar>
            <mwc-icon-button slot="navigationIcon" icon="menu" @click="${this._toggleDrawer}"></mwc-icon-button>
            <div id="app-title" slot="title">${this._dbInfo?.database?.name || 'Gramps.js'}</div>
            <mwc-icon-button icon="search" slot="actionItems" @click="${() => this._handleTab('search')}"></mwc-icon-button>
          </mwc-top-app-bar>
          <mwc-linear-progress indeterminate ?closed="${!this.progress}">
          </mwc-linear-progress>

        <main>


        ${this._tabHtml(tabs)}

        <grampsjs-view-people class="page" ?active=${this._page === 'people'} .strings="${this._strings}"></grampsjs-view-people>
        <grampsjs-view-families class="page" ?active=${this._page === 'families'} .strings="${this._strings}"></grampsjs-view-families>
        <grampsjs-view-events class="page" ?active=${this._page === 'events'} .strings="${this._strings}"></grampsjs-view-events>
        <grampsjs-view-places class="page" ?active=${this._page === 'places'} .strings="${this._strings}"></grampsjs-view-places>
        <grampsjs-view-sources class="page" ?active=${this._page === 'sources'} .strings="${this._strings}"></grampsjs-view-sources>
        <grampsjs-view-citations class="page" ?active=${this._page === 'citations'} .strings="${this._strings}"></grampsjs-view-citations>
        <grampsjs-view-repositories class="page" ?active=${this._page === 'repositories'} .strings="${this._strings}"></grampsjs-view-repositories>
        <grampsjs-view-notes class="page" ?active=${this._page === 'notes'} .strings="${this._strings}"></grampsjs-view-notes>
        <grampsjs-view-media-objects class="page" ?active=${this._page === 'media'} .strings="${this._strings}"></grampsjs-view-media-objects>

        <grampsjs-view-person class="page" ?active=${this._page === 'person'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-person>
        <grampsjs-view-family class="page" ?active=${this._page === 'family'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-family>
        <grampsjs-view-event class="page" ?active=${this._page === 'event'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-event>
        <grampsjs-view-place class="page" ?active=${this._page === 'place'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-place>
        <grampsjs-view-source class="page" ?active=${this._page === 'source'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-source>
        <grampsjs-view-citation class="page" ?active=${this._page === 'citation'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-citation>
        <grampsjs-view-repository class="page" ?active=${this._page === 'repository'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-repository>
        <grampsjs-view-note class="page" ?active=${this._page === 'note'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-note>
        <grampsjs-view-media class="page" ?active=${this._page === 'mediaobject'} grampsId="${this._pageId}" .strings="${this._strings}"></grampsjs-view-media>
        <grampsjs-view-search class="page" ?active=${this._page === 'search'} .strings="${this._strings}"></grampsjs-view-search>
        <grampsjs-view-recent class="page" ?active=${this._page === 'recent'} .strings="${this._strings}"></grampsjs-view-recent>

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
      return html`<mwc-tab isMinWidthIndicator label="${tabs[key]}" @click="${() => this._handleTab(key)}"></mwc-tab>`
    })}
    </mwc-tab-bar>
  `
  }

  _toggleDrawer() {
    const drawer = this.shadowRoot.getElementById('app-drawer');
    drawer.open = !drawer.open;
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadDbInfo();
  }

  firstUpdated() {
    installRouter((location) => this._loadPage(decodeURIComponent(location.pathname)));
    installMediaQueryWatcher(`(min-width: 768px)`, (matches) => {this.wide = matches});
    this.boundHandleNav = this._handleNav.bind(this);
    this.addEventListener('nav', this.boundHandleNav);
    this.boundProgressOn = this._progressOn.bind(this);
    this.addEventListener('progress:on', this.boundProgressOn);
    this.boundProgressOff = this._progressOff.bind(this);
    this.addEventListener('progress:off', this.boundProgressOff);
    this.addEventListener('user:loggedout', () => {this.loadingState = LOADING_STATE_UNAUTHORIZED});
  }

  _loadDbInfo() {
    apiGet(`/api/metadata/`)
      .then(data => {
        if ('error' in data) {
          this.loadingState = LOADING_STATE_UNAUTHORIZED
          this._showError(data.error)
        }
        if ('data' in data) {
          this._dbInfo = data.data
          if (this.language === '' && this._dbInfo?.locale?.language !== undefined) {
            this.language = this._dbInfo.locale.language
          }
          this.loadingState = LOADING_STATE_READY
        }
      })
  }


  _loadPage(path) {
    if (path === "/") {
      this._page = 'home';
      this._pageId = '';
    } else {
      const pathId = path.slice(1);
      const page = pathId.split('/')[0]
      const pageId = pathId.split('/')[1]
      this._page = page;
      this._pageId = pageId || '';
    }
  }

  _progressOn() {
    this.progress = true
  }

  _progressOff() {
    this.progress = false
  }


  _handleTab(page) {
    if (page !== this._page) {
      const href = `/${page}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
    }
  }

  _handleNav(e) {
    const {path} = e.detail
    const page = path.split('/')[0]
    if (page !== this._page) {
      const href = `/${path}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
    }
  }

  _handleLoginKey(event) {
    if(event.code == 'Enter') {
      this._submitLogin()
    }
  }

  _loadStrings(strings, lang) {
    apiGet(`/api/translations/${lang}?strings=${JSON.stringify(strings)}`)
      .then(data => {
        if ('data' in data) {
          this._strings = data.data.reduce((obj, item) => Object.assign(obj, {[item.original]: item.translation}), {})
          if (lang in additionalStrings) {
            this._strings = Object.assign(additionalStrings[lang], this._strings);
          }
        }
        if ('error' in data) {
          this._showError(data.error)
        }
      })
  }

  async _submitLogin() {
    const userField = this.shadowRoot.getElementById('username')
    const pwField = this.shadowRoot.getElementById('password')
    const submitProgress = this.shadowRoot.getElementById('login-progress')
    submitProgress.parentElement.style.display = 'block';
    submitProgress.closed = false;
    apiGetTokens(userField.value, pwField.value)
      .then((res) => {
        if ('error' in res) {
          submitProgress.parentElement.style.display = 'none';
          submitProgress.closed = true;
          this._showError(res.error)
        } else {
          document.location.href = '/'
        }
      })
  }

  async _resetPw() {
    const userField = this.shadowRoot.getElementById('username')
    if (userField.value === '') {
      this._showError("Username must not be empty.")
      return
    }
    const res = await apiResetPassword(userField.value)
    const innerForm = this.shadowRoot.getElementById('inner-form')
    const divSuccess = this.shadowRoot.getElementById('reset-success')
    if ('error' in res) {
      this._showError(res.error)
    } else {
      divSuccess.style.display = 'block';
      innerForm.style.display = 'none';
    }
  }


  _showError(msg) {
    const snackbar = this.shadowRoot.getElementById('error-snackbar')
    snackbar.labelText = `Error: ${msg}`
    snackbar.show()
  }

  _openUserMenu() {
    const userMenu = this.shadowRoot.getElementById('user-menu')
    userMenu.open = true
  }

  _logoutClicked() {
    doLogout();
    this.loadingState = LOADING_STATE_UNAUTHORIZED;
  }

  _(s) {
    if (s in this._strings) {
      return this._strings[s]
    }
    return s
  }

}
