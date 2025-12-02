import '@material/mwc-button'
import '@material/mwc-drawer'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-linear-progress'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-menu'
import '@material/mwc-snackbar'
import '@material/mwc-textfield'
import '@material/mwc-top-app-bar'
import {LitElement, css, html} from 'lit'
import {installMediaQueryWatcher} from 'pwa-helpers/media-query.js'
import {installRouter} from 'pwa-helpers/router.js'
import {getSettings} from './api.js'
import './dayjs_locales.js'
import {
  frontendLanguages,
  getFrontendStrings,
  grampsStrings,
} from './strings.js'
import {fireEvent, getBrowserLanguage} from './util.js'

import {appStateUpdatePermissions, getInitialAppState} from './appState.js'
import './components/GrampsjsAppBar.js'
import './components/GrampsjsDnaTabBar.js'
import './components/GrampsjsFirstRun.js'
import './components/GrampsjsFormRegister.js'
import './components/GrampsJsListItem.js'
import './components/GrampsjsLogin.js'
import './components/GrampsjsMainMenu.js'
import './components/GrampsjsPages.js'
import './components/GrampsjsTabBar.js'
import './components/GrampsjsUndoTransaction.js'
import './components/GrampsjsUpdateAvailable.js'
import './components/GrampsjsUpgradeDb.js'
import {sharedStyles} from './SharedStyles.js'
import {applyTheme} from './theme.js'
import {handleOIDCCallback, handleOIDCComplete} from './oidc.js'

const LOADING_STATE_INITIAL = 0
const LOADING_STATE_UNAUTHORIZED = 1
const LOADING_STATE_UNAUTHORIZED_NOCONNECTION = 2
const LOADING_STATE_NO_OWNER = 3
const LOADING_STATE_DB_SCHEMA_MISMATCH = 4
// const LOADING_STATE_MISSING_SETTINGS = 5
const LOADING_STATE_READY = 10

const BASE_DIR = ''

const MINIMUM_API_VERSION = '3.3.0'

export class GrampsJs extends LitElement {
  static get properties() {
    return {
      appState: {type: Object},
      wide: {type: Boolean},
      progress: {type: Boolean},
      loadingState: {type: Number},
      _homePersonDetails: {type: Object},
      _showShortcuts: {type: Boolean},
      _shortcutPressed: {type: String},
      _firstRunToken: {type: String},
      _loadingStrings: {type: Boolean},
      reindexNeeded: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.appState = getInitialAppState()
    this.progress = false
    this.loadingState = LOADING_STATE_INITIAL
    this._homePersonDetails = {}
    this._showShortcuts = false
    this._shortcutPressed = ''
    this._firstRunToken = ''
    this._loadingStrings = false
    this._reindexNeeded = false
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          height: 100%;
        }

        main {
          padding: 0;
        }

        .page {
          display: none;
        }

        .page[active] {
          display: block;
        }

        mwc-drawer {
          --mdc-drawer-width: 230px;
          --mdc-typography-headline6-font-family: var(
            --grampsjs-heading-font-family
          );
          --mdc-typography-headline6-font-weight: 400;
          --mdc-typography-headline6-font-size: 19px;
        }

        mwc-drawer[open]:not([type='modal']) {
          --mdc-top-app-bar-width: calc(100% - var(--mdc-drawer-width, 256px));
        }

        mwc-linear-progress {
          --mdc-theme-primary: var(--grampsjs-color-page-loading-progress);
        }

        #user-menu mwc-button {
          margin: 0.5em 1em;
        }

        #app-title:first-letter {
          text-transform: capitalize;
        }

        .center-xy {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto;
          height: 100vh;
        }

        .center-xy div {
          display: block;
          width: 20%;
          text-align: center;
        }

        mwc-list {
          --mdc-list-item-graphic-margin: 20px;
          --mdc-list-side-padding: 20px;
        }

        #shortcut-overlay-container {
          background-color: var(--grampsjs-body-font-color-10);
          position: fixed;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          min-height: 100vh;
          width: 100vw;
          z-index: 10001;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        #shortcut-overlay {
          font-size: 16px;
          background-color: var(--md-sys-color-surface-container-high);
          padding: 0.5em 1.5em;
          position: absolute;
          top: 15vh;
          overflow-y: auto;
          max-width: 100vw;
          max-height: 75vh;
          border-radius: 8px;
        }

        #shortcut-overlay section {
          display: flex;
          flex-direction: row;
          gap: 24px;
        }

        #shortcut-overlay h3 {
          margin-top: 0.5em;
          font-size: 1.3em;
          font-weight: 400;
        }

        #shortcut-overlay h4 {
          margin-top: 0.5em;
          font-weight: 400;
          font-size: 1em;
        }

        #shortcut-overlay dl {
          display: grid;
          grid-template-columns: max-content auto;
          margin: 0.5em 0em;
        }

        #shortcut-overlay dt {
          grid-column-start: 1;
          margin-right: 1.2em;
        }

        #shortcut-overlay dt span {
          font-family: var(--grampsjs-heading-font-family);
          font-size: 11px;
          font-weight: 400;
          display: inline-block;
          min-width: 0.75em;
          padding: 4px 6px;
          text-align: center;
          border: 1px solid var(--grampsjs-body-font-color-20);
          color: var(--grampsjs-body-font-color-70);
          border-radius: 6px;
          margin-bottom: 4px;
        }

        #shortcut-overlay dd {
          grid-column-start: 2;
          padding: 0;
        }
      `,
    ]
  }

  render() {
    return html`
      ${this.renderContent()} ${this._renderKeyboardShortcuts()}
      <mwc-snackbar id="error-snackbar" leading></mwc-snackbar>
      <mwc-snackbar id="notification-snackbar" leading></mwc-snackbar>
      ${this._reindexNeeded ? this._renderReindexSnackbar() : ''}
      <grampsjs-undo-transaction
        .appState="${this.appState}"
      ></grampsjs-undo-transaction>
      <grampsjs-update-available>
        <mwc-snackbar
          leading
          open
          timeoutMs="-1"
          labelText="${this._('A new version of the app is available.')}"
        >
          <mwc-button slot="action" @click=${this._postUpdateMessage}
            >${this._('Refresh')}</mwc-button
          >
        </mwc-snackbar>
      </grampsjs-update-available>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderReindexSnackbar() {
    return html`<mwc-snackbar
      id="reindex-snackbar"
      leading
      open
      timeoutMs="-1"
      labelText="${this._('The search index needs to be rebuilt.')}"
    >
      ${this.appState.permissions.canManageUsers
        ? html`
            <mwc-button slot="action" @click="${this._handleReindexButton}"
              >${this._('Settings')}</mwc-button
            >
          `
        : ''}
      ></mwc-snackbar
    >`
  }

  _handleReindexButton(e) {
    fireEvent(this, 'nav', {path: 'settings/administration'})
    e.preventDefault()
    e.stopPropagation()
  }

  _renderKeyboardShortcuts() {
    if (!this._showShortcuts) {
      return ''
    }
    return html`
      <div id="shortcut-overlay-container">
        <div id="shortcut-overlay">
          <h3>${this._('Keyboard Shortcuts')}</h3>
          <section>
            <div>
              <h4>${this._('Global')}</h4>
              <dl>
                <dt><span>?</span></dt>
                <dd>${this._('Show this dialog')}</dd>
                <dt><span>s</span></dt>
                <dd>${this._('Search')}</dd>
                <dt><span>e</span></dt>
                <dd>${this._('Edit')}</dd>
              </dl>
            </div>
            <div>
              <h4>${this._('Navigation')}</h4>
              <dl>
                <dt><span>g</span> <span>h</span></dt>
                <dd>${this._('Home Page')}</dd>
                <dt><span>g</span> <span>b</span></dt>
                <dd>${this._('Blog')}</dd>
                <dt><span>g</span> <span>l</span></dt>
                <dd>${this._('Lists')}</dd>
                <dt><span>g</span> <span>m</span></dt>
                <dd>${this._('Map')}</dd>
                <dt><span>g</span> <span>c</span></dt>
                <dd>${this._('Family Tree')}</dd>
                <dt><span>g</span> <span>r</span></dt>
                <dd>${this._('History')}</dd>
                <dt><span>g</span> <span>f</span></dt>
                <dd>${this._('_Bookmarks')}</dd>
                <dt><span>g</span> <span>t</span></dt>
                <dd>${this._('Tasks')}</dd>
                <dt><span>g</span> <span>e</span></dt>
                <dd>${this._('Export')}</dd>
              </dl>
            </div>
            <div>
              <h4>${this._('New')}</h4>
              <dl>
                <dt><span>n</span> <span>p</span></dt>
                <dd>${this._('Person')}</dd>
                <dt><span>n</span> <span>f</span></dt>
                <dd>${this._('Family')}</dd>
                <dt><span>n</span> <span>e</span></dt>
                <dd>${this._('Event')}</dd>
                <dt><span>n</span> <span>l</span></dt>
                <dd>${this._('Place')}</dd>
                <dt><span>n</span> <span>s</span></dt>
                <dd>${this._('Source')}</dd>
                <dt><span>n</span> <span>c</span></dt>
                <dd>${this._('Citation')}</dd>
                <dt><span>n</span> <span>r</span></dt>
                <dd>${this._('Repository')}</dd>
                <dt><span>n</span> <span>n</span></dt>
                <dd>${this._('Note')}</dd>
                <dt><span>n</span> <span>m</span></dt>
                <dd>${this._('Media Object')}</dd>
                <dt><span>n</span> <span>t</span></dt>
                <dd>${this._('Task')}</dd>
              </dl>
            </div>
          </section>
        </div>
      </div>
    `
  }

  _postUpdateMessage() {
    fireEvent(this, 'update:reload')
  }

  // eslint-disable-next-line class-methods-use-this
  _renderInitial() {
    return html`<div class="center-xy">
      <div>
        <mwc-linear-progress indeterminate></mwc-linear-progress>
      </div>
    </div> `
  }

  _renderNoConn() {
    return html`<div class="center-xy">
      <div>
        No connection<br /><br />
        <mwc-button raised @click=${this._handleReload}>Reload</mwc-button>
      </div>
    </div> `
  }

  _renderSchemaMismatch() {
    return html`<grampsjs-upgrade-db
      .appState="${this.appState}"
      @dbupgrade:complete="${this._handleDbUpgradeComplete}"
    ></grampsjs-upgrade-db>`
  }

  _renderLogin() {
    return html`
      <grampsjs-login
        .appState="${this.appState}"
        tree="${this.appState.path.pageId}"
      ></grampsjs-login>
    `
  }

  _renderRegister() {
    return html`
      <grampsjs-form-register
        .appState="${this.appState}"
        tree="${this.appState.path.pageId}"
      ></grampsjs-form-register>
    `
  }

  _renderFirstRun() {
    return html`
      <grampsjs-first-run
        .appState="${this.appState}"
        token="${this._firstRunToken}"
        @firstrun:done="${this._firstRunDone}"
      ></grampsjs-first-run>
    `
  }

  renderContent() {
    if (this.loadingState === LOADING_STATE_INITIAL) {
      return this._renderInitial()
    }
    if (this.loadingState === LOADING_STATE_UNAUTHORIZED_NOCONNECTION) {
      return this._renderNoConn()
    }
    if (this.loadingState === LOADING_STATE_UNAUTHORIZED) {
      const {loginRedirect} = this.appState.frontendConfig
      if (
        loginRedirect &&
        this.appState.path.page !== 'login' &&
        this.appState.path.page !== 'register'
      ) {
        window.location.href = loginRedirect
      }
      if (this.appState.path.page === 'register') {
        return this._renderRegister()
      }
      if (this.appState.path.page !== 'login') {
        window.history.pushState({}, '', 'login')
      }
      return this._renderLogin()
    }
    if (this.loadingState === LOADING_STATE_NO_OWNER) {
      window.history.pushState({}, '', 'firstrun')
      return this._renderFirstRun()
    }
    if (!this.appState.settings.lang) {
      // this can only happen if the user has not set the language
      // AND the browser's language was not detected for some reason.
      // In that case, we fall back to English.
      this.appState.updateSettings({
        lang: 'en',
      })
    }
    if (this.loadingState === LOADING_STATE_DB_SCHEMA_MISMATCH) {
      return this._renderSchemaMismatch()
    }
    if (this.appState.path.page === 'login') {
      window.history.pushState({}, '', '')
      this._updateAppState({path: {page: 'home', pageId: '', pageId2: ''}})
    }
    if (this.appState.path.page === 'settings' && !this.appState.path.pageId) {
      // needed for backwards compatibility
      window.history.pushState({}, '', 'settings/user')
      this._updateAppState({
        path: {page: 'settings', pageId: 'user', pageId2: ''},
      })
    }
    if (
      this.appState.settings.lang &&
      !this._backendStringsLoaded() &&
      !this._loadingStrings
    ) {
      this._loadStrings(grampsStrings, this.appState.settings.lang)
    }
    return html`
      <mwc-drawer
        type="${this.appState.screenSize !== 'small' ? 'dismissible' : 'modal'}"
        id="app-drawer"
        ?open="${this.appState.screenSize !== 'small'}"
      >
        <div>
          <grampsjs-main-menu .appState="${this.appState}"></grampsjs-main-menu>
        </div>
        <div slot="appContent">
          <grampsjs-app-bar .appState="${this.appState}"></grampsjs-app-bar>
          <mwc-linear-progress indeterminate ?closed="${!this.progress}">
          </mwc-linear-progress>

          <main>
            <grampsjs-tab-bar .appState="${this.appState}"></grampsjs-tab-bar>
            <grampsjs-dna-tab-bar
              .appState="${this.appState}"
            ></grampsjs-dna-tab-bar>
            <grampsjs-pages
              .appState="${this.appState}"
              .dbInfo="${this.appState.dbInfo}"
              .homePersonDetails=${this._homePersonDetails}
              .settings="${this.appState.settings}"
              .page="${this.appState.path.page}"
              .pageId="${this.appState.path.pageId}"
              .pageId2="${this.appState.path.pageId2}"
            >
            </grampsjs-pages>
          </main>
        </div>
      </mwc-drawer>
    `
  }

  _toggleDrawer() {
    const drawer = this.shadowRoot.getElementById('app-drawer')
    if (drawer !== null) {
      drawer.open = !drawer.open
    }
  }

  _closeDrawer() {
    const drawer = this.shadowRoot.getElementById('app-drawer')
    if (drawer !== null && drawer.open) {
      drawer.open = false
    }
  }

  _handleReload() {
    this.loadingState = LOADING_STATE_INITIAL
    this._loadDbInfo()
  }

  // eslint-disable-next-line class-methods-use-this
  _firstRunDone() {
    document.location.href = '/'
  }

  connectedCallback() {
    super.connectedCallback()

    window.addEventListener('storage', () => this._handleStorage())
    window.addEventListener('settings:changed', () => this._handleSettings())
    window.addEventListener('db:changed', () => this._loadDbInfo(false))
    this.addEventListener('drawer:toggle', this._toggleDrawer)
    window.addEventListener('keydown', event => this._handleKey(event))
    document.addEventListener('visibilitychange', () =>
      this._handleVisibilityChange()
    )
    window.addEventListener('online', () => this._handleOnline())
    window.addEventListener('token:refresh', () => this._handleRefresh(true))

    if (window.location.pathname.includes('/oidc/complete')) {
      return
    }

    this._loadDbInfo()

    const browserLang = getBrowserLanguage()
    if (browserLang && !this.appState.settings.lang) {
      this.appState.updateSettings({lang: browserLang})
      this._loadFrontendStrings(browserLang)
    } else if (this.appState.settings.lang) {
      this._loadFrontendStrings(this.appState.settings.lang)
    }

    applyTheme(this.appState.settings.theme)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () =>
      applyTheme(this.appState.settings.theme)
    )
  }

  firstUpdated() {
    installRouter(location =>
      this._loadPage(decodeURIComponent(location.pathname))
    )
    installMediaQueryWatcher('(max-width: 991px)', matches => {
      if (matches && this.appState.screenSize !== 'small') {
        this._updateAppState({screenSize: 'small'})
      }
    })
    installMediaQueryWatcher(
      '(min-width: 992px) and (max-width: 1199px)',
      matches => {
        if (matches && this.appState.screenSize !== 'medium') {
          this._updateAppState({screenSize: 'medium'})
        }
      }
    )
    installMediaQueryWatcher('(min-width: 1200px)', matches => {
      if (matches && this.appState.screenSize !== 'large') {
        this._updateAppState({screenSize: 'large'})
      }
    })
    this.addEventListener('nav', this._handleNav.bind(this))
    this.addEventListener('grampsjs:error', this._handleError.bind(this))
    this.addEventListener(
      'grampsjs:notification',
      this._handleNotification.bind(this)
    )
    this.addEventListener('progress:on', this._progressOn.bind(this))
    this.addEventListener('progress:off', this._progressOff.bind(this))
    window.addEventListener('user:loggedout', this._handleLogout.bind(this))
  }

  async _loadFrontendStrings(lang) {
    const additionalStrings = await getFrontendStrings(lang)
    const strings = {...this.appState.i18n.strings, ...additionalStrings}
    this._updateAppState({i18n: {strings, lang}})
  }

  _loadDbInfo(setReady = true) {
    this.appState.apiGet('/api/metadata/').then(data => {
      if ('error' in data) {
        if (data.error === 'Network error') {
          this.loadingState = LOADING_STATE_UNAUTHORIZED_NOCONNECTION
        } else {
          this._fetchOnboardingToken()
        }
        return
      }
      if ('data' in data) {
        this._updateAppState({dbInfo: data.data})
        this._checkSearch()
        this._checkApiVersion()
        if (this.appState.dbInfo?.locale?.language !== undefined) {
          this.appState.updateSettings({
            serverLang: this.appState.dbInfo.locale.language,
          })
        }
        if (!this._checkDbSchema()) {
          this.setPermissions()
          return
        }
        if (setReady) {
          this._setReady()
        }
        this._loadHomePersonInfo()
      }
    })
  }

  _checkApiVersion() {
    const apiVersion = this.appState.dbInfo?.gramps_webapi?.version
    if (!apiVersion) {
      return
    }
    const apiVersionParts = apiVersion.split('.')
    const minApiVersionParts = MINIMUM_API_VERSION.split('.')
    const len = Math.min(minApiVersionParts.length, apiVersionParts.length)
    for (let i = 0; i < len; i += 1) {
      if (apiVersionParts[i] > minApiVersionParts[i]) {
        // API has higher version: no action right now
        return
      }
      if (apiVersionParts[i] < minApiVersionParts[i]) {
        // API has lower version
        this._showError(`${this._('outdated backend')} (${apiVersion})`)
      }
    }
  }

  _checkSearch() {
    const searchVersion = this.appState.dbInfo?.search?.sifts?.version
    if (searchVersion === undefined) {
      window._oldSearchBackend = true
      return
    }
    window._oldSearchBackend = false
    const searchCount = this.appState.dbInfo?.search?.sifts?.count ?? 0
    const objCounts = this.appState.dbInfo?.object_counts ?? {}
    const objCount = Object.values(objCounts).reduce(
      (sum, value) => sum + value,
      0
    )
    if (searchCount === 0 && objCount > 0) {
      this._reindexNeeded = true
    } else {
      this._reindexNeeded = false
    }
  }

  _checkDbSchema() {
    if (this.appState.dbInfo?.database?.actual_schema) {
      const actualSchema = parseInt(
        this.appState.dbInfo.database.actual_schema,
        10
      )
      const requiredSchema = parseInt(
        this.appState.dbInfo.database.schema.split('.')[0],
        10
      )
      if (actualSchema < requiredSchema) {
        this.loadingState = LOADING_STATE_DB_SCHEMA_MISMATCH
        return false
      }
    }
    return true
  }

  _fetchOnboardingToken() {
    const hasTree =
      this.appState.path.page === 'firstrun' && this.appState.path.pageId
    const url = '/api/token/create_owner/'
    const payload = hasTree ? {tree: this.appState.path.pageId} : {}
    this.appState.apiPost(url, payload, {dbChanged: false}).then(data => {
      if (!('error' in data) && data?.data?.access_token) {
        this.loadingState = LOADING_STATE_NO_OWNER
        this._firstRunToken = data?.data?.access_token
      } else {
        this.loadingState = LOADING_STATE_UNAUTHORIZED
      }
    })
  }

  _loadHomePersonInfo() {
    const grampsId = this.appState.settings.homePerson
    if (!grampsId) {
      return
    }
    this.appState
      .apiGet(
        `/api/people/?gramps_id=${grampsId}&profile=self&extend=media_list`
      )
      .then(data => {
        if ('data' in data) {
          ;[this._homePersonDetails] = data.data
        } else if ('error' in data) {
          this._showError(data.error)
        }
      })
  }

  _setReady() {
    this.loadingState = LOADING_STATE_READY
    this.setPermissions()
  }

  _loadPage(path) {
    this._disableEditMode()

    if (path.includes('/oidc/callback')) {
      handleOIDCCallback(msg => this._showError(msg))
      return
    }

    if (path.includes('/oidc/complete')) {
      handleOIDCComplete(msg => this._showError(msg))
      return
    }

    if (path === '/' || path === `${BASE_DIR}/`) {
      this._updateAppState({path: {page: 'home', pageId: '', pageId2: ''}})
    } else if (BASE_DIR === '') {
      const pathId = path.slice(1)
      const page = pathId.split('/')[0]
      const pageId = pathId.split('/')[1]
      const pageId2 = pathId.split('/')[2]
      this._updateAppState({
        path: {page, pageId: pageId ?? '', pageId2: pageId2 ?? ''},
      })
    } else if (path.split('/')[0] === BASE_DIR.split('/')[0]) {
      const pathId = path.slice(1)
      const page = pathId.split('/')[1]
      const pageId = pathId.split('/')[2]
      const pageId2 = pathId.split('/')[3]
      this._updateAppState({
        path: {page, pageId: pageId ?? '', pageId2: pageId2 ?? ''},
      })
    }

    if (this.appState.screenSize === 'small') {
      this._closeDrawer()
    }
  }

  _progressOn() {
    this.progress = true
  }

  _progressOff() {
    this.progress = false
  }

  _handleTab(page) {
    if (page !== this.appState.path.page) {
      const href = `${BASE_DIR}/${page}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
      this._disableEditMode()
    }
  }

  _handleNav(e) {
    const {path} = e.detail
    const page = path.split('/')[0]
    const pageId = path.split('/')[1]
    const pageId2 = path.split('/')[2]
    const appPath = this.appState.path
    if (
      page !== appPath.page ||
      pageId !== appPath.pageId ||
      pageId2 !== appPath.pageId2
    ) {
      const href = `${BASE_DIR}/${path}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
      this._disableEditMode()
    }
  }

  _disableEditMode() {
    fireEvent(this, 'edit-mode:off', {})
  }

  _handleError(e) {
    const {message} = e.detail
    this._showError(message)
  }

  _handleNotification(e) {
    const {message} = e.detail
    this._showToast(message)
  }

  _handleDbUpgradeComplete() {
    this._handleReload()
  }

  // eslint-disable-next-line class-methods-use-this
  _handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this._handleRefresh()
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _handleOnline() {
    this._handleRefresh()
  }

  // eslint-disable-next-line class-methods-use-this
  async _handleRefresh(force = false) {
    await this.appState.refreshTokenIfNeeded(force)
    this.setPermissions()
  }

  updated(changed) {
    if (
      changed.has('appState') &&
      this.loadingState > LOADING_STATE_UNAUTHORIZED_NOCONNECTION
    ) {
      if (
        this.appState.settings.lang &&
        this.appState.settings.lang !== this.appState.i18n.lang
      ) {
        this._loadStrings(grampsStrings, this.appState.settings.lang)
      }
    }
  }

  _backendStringsLoaded() {
    // to find out if we have already fetched the translations
    // from the backend, we just check for the first string
    return Boolean(grampsStrings[0] in this.appState.i18n.strings)
  }

  async _loadStrings(strings, lang) {
    this._loadingStrings = true
    const data = await this.appState.apiPost(
      `/api/translations/${lang}`,
      {strings},
      {dbChanged: false}
    )
    let _strings
    if ('data' in data) {
      _strings = data.data.reduce(
        (obj, item) => Object.assign(obj, {[item.original]: item.translation}),
        {}
      )
      if (frontendLanguages.includes(lang)) {
        const additionalStrings = await getFrontendStrings(lang)
        _strings = Object.assign(additionalStrings, _strings)
      }
      this._updateAppState({i18n: {strings: _strings, lang}})
    }
    this._loadingStrings = false
    if ('error' in data) {
      this._showError(data.error)
    }
  }

  _showError(msg) {
    const snackbar = this.shadowRoot.getElementById('error-snackbar')
    snackbar.labelText = `${this._('Error')}: ${msg}`
    snackbar.show()
  }

  _showToast(msg) {
    const snackbar = this.shadowRoot.getElementById('notification-snackbar')
    snackbar.labelText = msg
    snackbar.show()
  }

  _openUserMenu() {
    const userMenu = this.shadowRoot.getElementById('user-menu')
    userMenu.open = true
  }

  _handleLogout() {
    this.loadingState = LOADING_STATE_UNAUTHORIZED
  }

  _handleStorage() {
    this._handleSettings()
  }

  _handleSettings() {
    this._updateAppState({settings: getSettings()})
    if (
      this.appState.settings?.homePerson &&
      this.appState.settings.homePerson !== this._homePersonDetails.gramps_id
    ) {
      this._loadHomePersonInfo()
    }
  }

  _handleKey(e) {
    const target = e.composedPath()[0]
    if (
      ['input', 'textarea', 'select', 'option', 'mwc-list-item'].includes(
        target.tagName.toLowerCase()
      ) ||
      target.getAttribute('contenteditable')
    ) {
      return
    }
    if (
      e
        .composedPath()
        .some(el => el.tagName?.toLowerCase() === 'md-filled-select')
    ) {
      return
    }
    if (this._showShortcuts) {
      this._showShortcuts = false
    }
    if (this._shortcutPressed === 'g') {
      if (e.key === 'h') {
        fireEvent(this, 'nav', {path: ''})
      } else if (e.key === 'b') {
        fireEvent(this, 'nav', {path: 'blog'})
      } else if (e.key === 'l') {
        fireEvent(this, 'nav', {path: 'people'})
      } else if (e.key === 'm') {
        fireEvent(this, 'nav', {path: 'map'})
      } else if (e.key === 'c') {
        fireEvent(this, 'nav', {path: 'tree'})
      } else if (e.key === 'r') {
        fireEvent(this, 'nav', {path: 'recent'})
      } else if (e.key === 'f') {
        fireEvent(this, 'nav', {path: 'bookmarks'})
      } else if (e.key === 't') {
        fireEvent(this, 'nav', {path: 'tasks'})
      } else if (e.key === 'e') {
        fireEvent(this, 'nav', {path: 'export'})
      }
      this._shortcutPressed = ''
    } else if (this._shortcutPressed === 'n') {
      if (e.key === 'p') {
        fireEvent(this, 'nav', {path: 'new_person'})
      } else if (e.key === 'f') {
        fireEvent(this, 'nav', {path: 'new_family'})
      } else if (e.key === 'e') {
        fireEvent(this, 'nav', {path: 'new_event'})
      } else if (e.key === 'l') {
        fireEvent(this, 'nav', {path: 'new_place'})
      } else if (e.key === 's') {
        fireEvent(this, 'nav', {path: 'new_source'})
      } else if (e.key === 'c') {
        fireEvent(this, 'nav', {path: 'new_citation'})
      } else if (e.key === 'r') {
        fireEvent(this, 'nav', {path: 'new_repository'})
      } else if (e.key === 'n') {
        fireEvent(this, 'nav', {path: 'new_note'})
      } else if (e.key === 'm') {
        fireEvent(this, 'nav', {path: 'new_media'})
      } else if (e.key === 't') {
        fireEvent(this, 'nav', {path: 'new_task'})
      }
      this._shortcutPressed = ''
    } else if (e.key === 'g') {
      this._shortcutPressed = 'g'
    } else if (e.key === 'n') {
      this._shortcutPressed = 'n'
    } else if (e.key === 's') {
      fireEvent(this, 'nav', {path: 'search'})
    } else if (e.key === 'e') {
      fireEvent(this, 'edit-mode:toggle')
    } else if (e.key === '?') {
      this._showShortcuts = true
    } else {
      return
    }
    e.preventDefault()
    e.stopPropagation()
  }

  setPermissions() {
    this.appState = appStateUpdatePermissions(this.appState)
  }

  _(s) {
    let t = s
    if (t in this.appState.i18n.strings) {
      t = this.appState.i18n.strings[t]
    }
    t = t.replace('_', '')
    return t
  }

  _updateAppState(obj) {
    this.appState = {...this.appState, ...obj}
  }
}
