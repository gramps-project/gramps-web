import '@material/web/progress/linear-progress.js'
import './dialogBackdrop.js'
import '@material/web/button/filled-button.js'
import {mdiLogout} from '@mdi/js'
import {LitElement, css, html} from 'lit'
import {installMediaQueryWatcher} from 'pwa-helpers/media-query.js'
import {installRouter} from 'pwa-helpers/router.js'
import {
  getSettings,
  getTreeConfig,
  getTreeId,
  getTreeFromToken,
  isTreeMismatch,
  clearMediaCaches,
  cleanOldDrafts,
  getTreeName,
  TREE_CONFIG_PRIMARY_COLOR,
  TREE_CONFIG_SECONDARY_COLOR,
} from './api.js'
import './dayjs_locales.js'
import {
  frontendLanguages,
  getFrontendStrings,
  grampsStrings,
} from './strings.js'
import {
  fireEvent,
  getBrowserLanguage,
  apiVersionAtLeast,
  isKeyEventInInput,
} from './util.js'

import {appStateUpdatePermissions, getInitialAppState} from './appState.js'
import {
  LOADING_STATE_INITIAL,
  LOADING_STATE_UNAUTHORIZED,
  LOADING_STATE_UNAUTHORIZED_NOCONNECTION,
  LOADING_STATE_NO_OWNER,
  LOADING_STATE_DB_SCHEMA_MISMATCH,
  LOADING_STATE_NO_TREE,
  LOADING_STATE_READY,
  selectPreReadyView,
  treeFromPath,
  OBJECT_PAGES,
  PAGE_TITLES,
  pageTitleDetail,
} from './routing.js'
import './components/GrampsjsAppBar.js'
import './components/GrampsjsDnaTabBar.js'
import './components/GrampsjsCreateTree.js'
import './components/GrampsjsFirstRun.js'
import './components/GrampsjsIcon.js'
import './components/GrampsjsFormRegister.js'
import './components/GrampsjsLogin.js'
import {
  DRAWER_EXPANDED,
  DRAWER_MODAL,
  DRAWER_RAIL,
} from './components/GrampsjsNavDrawer.js'
import './components/GrampsjsPages.js'
import './components/GrampsjsTabBar.js'
import './components/GrampsjsSnackbar.js'
import './components/GrampsjsUndoTransaction.js'
import './components/GrampsjsUpdateAvailable.js'
import './components/GrampsjsUpgradeDb.js'
import './components/GrampsjsObjectLink.js'
import './components/GrampsjsObjectPreview.js'
import '@material/web/dialog/dialog.js'
import {sharedStyles} from './SharedStyles.js'
import {applyScheme, DEFAULT_PRIMARY, DEFAULT_SECONDARY} from './theme.js'
import {handleOIDCCallback, handleOIDCComplete} from './oidc.js'

const MINIMUM_API_VERSION = '3.17.0'

export class GrampsJs extends LitElement {
  static get properties() {
    return {
      appState: {type: Object},
      wide: {type: Boolean},
      progress: {type: Boolean},
      _saving: {type: Boolean},
      _saveComplete: {type: Boolean},
      _pageTitle: {state: true},
      loadingState: {type: Number},
      _homePersonDetails: {type: Object},
      _homePersonMissing: {type: Boolean},
      _showShortcuts: {type: Boolean},
      _shortcutPressed: {type: String},
      _firstRunToken: {type: String},
      _loadingStrings: {type: Boolean},
      _drawerOpen: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.appState = getInitialAppState()
    this.progress = false
    this._saving = false
    this._saveComplete = false
    this._saveCompleteTimer = null
    // {page, pageId, title} reported by a view whose title comes from its data
    this._pageTitle = null
    this.loadingState = LOADING_STATE_INITIAL
    this._homePersonDetails = {}
    this._homePersonMissing = false
    this._homePersonFetchingId = null
    this._homePersonLoadedId = null
    this._showShortcuts = false
    this._shortcutPressed = ''
    this._firstRunToken = ''
    this._loadingStrings = false
    this._searchIndexBuilding = false
    this._drawerOpen = false
    this._metadataConfirmed = false
  }

  get canUseChat() {
    return (
      this.appState.permissions.canUseChat && this.appState.dbInfo?.server?.chat
    )
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          min-height: 100%;
          --grampsjs-app-bar-height: 64px;
          --grampsjs-drawer-width: 256px;
          --grampsjs-rail-width: 72px;
          /* the height left below the app bar, for views that fill the window */
          --grampsjs-content-height: calc(
            100dvh - var(--grampsjs-app-bar-height)
          );
        }

        @media (max-width: 599px) {
          :host {
            --grampsjs-app-bar-height: 56px;
          }
        }

        .shell {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          min-height: 100dvh;
        }

        /* the containing block for views that position elements absolutely,
           such as the map's search box and time slider */
        .content {
          position: relative;
          min-width: 0;
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

        md-linear-progress {
          --md-linear-progress-active-indicator-color: var(
            --grampsjs-color-page-loading-progress
          );
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

        .shortcut-content section {
          display: flex;
          flex-direction: row;
          gap: 24px;
        }

        .shortcut-content h4 {
          margin-top: 0.5em;
          font-weight: 400;
          font-size: 1em;
        }

        .shortcut-content dl {
          display: grid;
          grid-template-columns: max-content auto;
          row-gap: 6px;
          margin: 0.5em 0em;
        }

        .shortcut-content dt {
          grid-column-start: 1;
          margin-right: 1.2em;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .shortcut-content dt span {
          font-family: var(--grampsjs-mono-font-family);
          font-size: 13px;
          font-weight: 700;
          display: inline-block;
          min-width: 0.75em;
          padding: 4px 6px;
          text-align: center;
          border: 1px solid var(--grampsjs-body-font-color-20);
          color: var(--grampsjs-text-secondary-color);
          border-radius: 6px;
        }

        .shortcut-content dd {
          grid-column-start: 2;
          padding: 0;
          display: flex;
          align-items: center;
        }

        @media print {
          :host {
            height: auto !important;
            overflow: visible !important;
          }

          .shell {
            display: block;
            min-height: 0;
          }

          grampsjs-nav-drawer,
          grampsjs-app-bar,
          grampsjs-tab-bar,
          grampsjs-dna-tab-bar {
            display: none !important;
          }
        }
      `,
    ]
  }

  render() {
    return html`
      ${this.renderContent()} ${this._renderKeyboardShortcuts()}
      <grampsjs-snackbar
        id="app-snackbar"
        .appState="${this.appState}"
      ></grampsjs-snackbar>
      <grampsjs-undo-transaction
        .appState="${this.appState}"
      ></grampsjs-undo-transaction>
      <grampsjs-update-available
        @pwa-update-available="${this._handleUpdateAvailable}"
      ></grampsjs-update-available>
      <grampsjs-object-preview
        .appState="${this.appState}"
      ></grampsjs-object-preview>
    `
  }

  // Reloads the metadata once the search index task of a build has finished,
  // so that it no longer reports the build
  _handleTaskDone(e) {
    if (
      this._searchIndexBuilding &&
      e.detail?.status?.taskName === 'searchReindexFull'
    ) {
      this._loadDbInfo(false)
    }
  }

  _renderKeyboardShortcuts() {
    return html`
      <md-dialog
        quick
        style="max-height: 90vh; max-width: 90vw;"
        ?open="${this._showShortcuts}"
        @cancel="${() => {
          this._showShortcuts = false
        }}"
        @close="${() => {
          this._showShortcuts = false
        }}"
      >
        <div slot="headline">${this._('Keyboard Shortcuts')}</div>
        <div slot="content" class="shortcut-content">
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
                <dd>${this._('Home')}</dd>
                <dt><span>g</span> <span>b</span></dt>
                <dd>${this._('Blog')}</dd>
                <dt><span>g</span> <span>c</span></dt>
                <dd>${this._('Family Tree')}</dd>
                <dt><span>g</span> <span>t</span></dt>
                <dd>${this._('Timeline')}</dd>
                <dt><span>g</span> <span>m</span></dt>
                <dd>${this._('Map')}</dd>
                ${this.appState.frontendConfig.hideDNALink
                  ? ''
                  : html`<dt><span>g</span> <span>d</span></dt>
                      <dd>${this._('DNA')}</dd>`}
                <dt><span>g</span> <span>l</span></dt>
                <dd>${this._('Lists')}</dd>
                <dt><span>g</span> <span>i</span></dt>
                <dd>${this._('Media')}</dd>
                ${this.canUseChat
                  ? html`<dt><span>g</span> <span>a</span></dt>
                      <dd>${this._('Assistant')}</dd>`
                  : ''}
                <dt><span>g</span> <span>r</span></dt>
                <dd>${this._('History')}</dd>
                <dt><span>g</span> <span>f</span></dt>
                <dd>${this._('_Bookmarks')}</dd>
                <dt><span>g</span> <span>j</span></dt>
                <dd>${this._('Tasks')}</dd>
                <dt><span>g</span> <span>e</span></dt>
                <dd>${this._('Export')}</dd>
                <dt><span>g</span> <span>s</span></dt>
                <dd>${this._('Settings')}</dd>
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
            <div>
              <h4>${this._('Family Tree')}</h4>
              <dl>
                <dt><span>+</span></dt>
                <dd>${this._('Zoom in')}</dd>
                <dt><span>-</span></dt>
                <dd>${this._('Zoom out')}</dd>
                <dt>
                  <span>←</span> <span>↑</span> <span>→</span> <span>↓</span>
                </dt>
                <dd>${this._('Move the chart')}</dd>
                <dt><span>0</span></dt>
                <dd>${this._('Fit to window')}</dd>
              </dl>
            </div>
          </section>
        </div>
      </md-dialog>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderInitial() {
    return html`<div class="center-xy">
      <div>
        <md-linear-progress indeterminate></md-linear-progress>
      </div>
    </div> `
  }

  _renderNoConn() {
    return html`<div class="center-xy">
      <div>
        ${this._('No connection')}<br /><br />
        <md-filled-button @click=${this._handleReload}
          >${this._('Try again')}</md-filled-button
        >
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
        tree="${treeFromPath(this.appState.path)}"
      ></grampsjs-login>
    `
  }

  _renderRegister() {
    return html`
      <grampsjs-form-register
        .appState="${this.appState}"
        tree="${treeFromPath(this.appState.path)}"
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

  _renderCreateTree() {
    return html`
      <grampsjs-create-tree
        .appState="${this.appState}"
        @tree:created="${this._handleTreeCreated}"
      ></grampsjs-create-tree>
    `
  }

  _renderNoTreeWait() {
    return html`<div class="center-xy">
      <div>
        ${this._('Waiting for an administrator to set up your family tree.')}
        <br /><br />
        <md-filled-button @click=${() => this.appState.signout()}>
          <grampsjs-icon
            slot="icon"
            .path="${mdiLogout}"
            color="currentColor"
          ></grampsjs-icon>
          ${this._('Log out')}
        </md-filled-button>
      </div>
    </div>`
  }

  // Turn a selectPreReadyView() decision into navigation side-effects + render.
  _renderPreReadyView(decision) {
    if (decision.redirect) {
      window.location.href = decision.redirect
    }
    if (decision.navigateTo) {
      window.history.pushState({}, '', decision.navigateTo)
    }
    switch (decision.view) {
      case 'initial':
        return this._renderInitial()
      case 'noconn':
        return this._renderNoConn()
      case 'register':
        return this._renderRegister()
      case 'login':
        return this._renderLogin()
      case 'firstrun':
        return this._renderFirstRun()
      case 'create-tree':
        return this._renderCreateTree()
      case 'no-tree-wait':
        return this._renderNoTreeWait()
      default:
        return html``
    }
  }

  renderContent() {
    const decision = selectPreReadyView(this.loadingState, {
      page: this.appState.path.page,
      permissions: this.appState.permissions,
      frontendConfig: this.appState.frontendConfig,
    })
    if (decision.view !== 'continue') {
      return this._renderPreReadyView(decision)
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
    if (this.appState.path.page === 'login' && this._metadataConfirmed) {
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
      !this._loadingStrings &&
      'gramps_webapi' in (this.appState.dbInfo ?? {})
    ) {
      this._loadStrings(grampsStrings, this.appState.settings.lang)
    }
    const drawerMode = this._drawerMode
    return html`
      <div class="shell">
        <grampsjs-nav-drawer
          .appState="${this.appState}"
          mode="${drawerMode}"
          ?open="${this._drawerOpen}"
          @drawer:close="${this._closeDrawer}"
        ></grampsjs-nav-drawer>
        <div class="content">
          <grampsjs-app-bar
            .appState="${this.appState}"
            ?saving="${this._saving}"
            ?saveComplete="${this._saveComplete}"
            ?progress="${this.progress}"
            ?menuButton="${drawerMode === DRAWER_MODAL}"
            ?showTreeName="${drawerMode === DRAWER_RAIL}"
            .pageTitle="${this._pageTitle}"
          ></grampsjs-app-bar>

          <main>
            <grampsjs-tab-bar .appState="${this.appState}"></grampsjs-tab-bar>
            <grampsjs-dna-tab-bar
              .appState="${this.appState}"
            ></grampsjs-dna-tab-bar>
            <grampsjs-pages
              .appState="${this.appState}"
              .dbInfo="${this.appState.dbInfo}"
              .homePersonDetails=${this._homePersonDetails}
              .homePersonMissing=${this._homePersonMissing}
              .settings="${this.appState.settings}"
              .page="${this.appState.path.page}"
              .pageId="${this.appState.path.pageId}"
              .pageId2="${this.appState.path.pageId2}"
            >
            </grampsjs-pages>
          </main>
        </div>
      </div>
    `
  }

  // Small screens show the drawer as a modal sheet. Elsewhere it is expanded
  // or an icon rail, as the user last chose; until they choose, medium
  // screens start with the rail.
  get _drawerMode() {
    const {screenSize} = this.appState
    if (screenSize === 'small') {
      return DRAWER_MODAL
    }
    const collapsed =
      this.appState.settings.drawerCollapsed ?? screenSize === 'medium'
    return collapsed ? DRAWER_RAIL : DRAWER_EXPANDED
  }

  _toggleDrawer() {
    if (this._drawerMode === DRAWER_MODAL) {
      this._drawerOpen = !this._drawerOpen
    } else {
      this.appState.updateSettings({
        drawerCollapsed: this._drawerMode === DRAWER_EXPANDED,
      })
    }
  }

  _closeDrawer() {
    this._drawerOpen = false
  }

  _setScreenSize(screenSize) {
    if (screenSize !== this.appState.screenSize) {
      this._drawerOpen = false
      this._updateAppState({screenSize})
    }
  }

  _handleReload() {
    this._metadataConfirmed = false
    this.loadingState = LOADING_STATE_INITIAL
    this._loadDbInfo()
  }

  // eslint-disable-next-line class-methods-use-this
  _firstRunDone() {
    document.location.href = '/'
  }

  _handleTreeCreated() {
    this.loadingState = LOADING_STATE_INITIAL
    this._loadDbInfo()
  }

  connectedCallback() {
    super.connectedCallback()

    // Clean up old editor drafts (older than 7 days)
    cleanOldDrafts()

    window.addEventListener('storage', event => this._handleStorage(event))
    window.addEventListener('settings:changed', () => this._handleSettings())
    window.addEventListener('treeconfig:changed', () =>
      this._handleTreeConfig()
    )
    window.addEventListener(
      'requests:changed',
      this._handleRequestsChanged.bind(this)
    )
    window.addEventListener('db:changed', () => this._loadDbInfo(false))
    window.addEventListener('task:complete', e => this._handleTaskDone(e))
    window.addEventListener('task:error', e => this._handleTaskDone(e))
    window.addEventListener('tree:missing', () => {
      this.loadingState = LOADING_STATE_NO_TREE
    })
    this.addEventListener('drawer:toggle', this._toggleDrawer)
    window.addEventListener('keydown', event => this._handleKey(event))
    window.addEventListener('shortcuts:show', event =>
      this._handleShowShortcuts(event)
    )
    document.addEventListener('visibilitychange', () =>
      this._handleVisibilityChange()
    )
    window.addEventListener('online', () => this._handleOnline())
    window.addEventListener('token:refresh', () => this._handleRefresh(true))

    if (window.location.pathname.includes('/oidc/complete')) {
      return
    }

    if (this.appState.auth.refreshToken) {
      this.loadingState = LOADING_STATE_READY
      this.progress = true
    }

    this._loadDbInfo()

    const browserLang = getBrowserLanguage()
    if (browserLang && !this.appState.settings.lang) {
      this.appState.updateSettings({lang: browserLang})
      this._loadFrontendStrings(browserLang)
    } else if (this.appState.settings.lang) {
      this._loadFrontendStrings(this.appState.settings.lang)
    }

    this._applyColorScheme()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => this._applyColorScheme())
  }

  _applyColorScheme() {
    const treeConfig = getTreeConfig()
    try {
      applyScheme(
        treeConfig[TREE_CONFIG_PRIMARY_COLOR] || DEFAULT_PRIMARY,
        treeConfig[TREE_CONFIG_SECONDARY_COLOR] || DEFAULT_SECONDARY,
        this.appState.settings.theme
      )
    } catch {
      applyScheme(
        DEFAULT_PRIMARY,
        DEFAULT_SECONDARY,
        this.appState.settings.theme
      )
    }
  }

  firstUpdated() {
    installRouter((location, event) => {
      this._loadPage(decodeURIComponent(location.pathname))
      // a link opens its page at the top; back and forward keep the
      // position the browser restores
      if (event?.type === 'click') {
        window.scrollTo(0, 0)
      }
    })
    installMediaQueryWatcher('(max-width: 991px)', matches => {
      if (matches) this._setScreenSize('small')
    })
    installMediaQueryWatcher(
      '(min-width: 992px) and (max-width: 1199px)',
      matches => {
        if (matches) this._setScreenSize('medium')
      }
    )
    installMediaQueryWatcher('(min-width: 1200px)', matches => {
      if (matches) this._setScreenSize('large')
    })
    this.addEventListener('nav', this._handleNav.bind(this))
    this.addEventListener('page-title:changed', event => {
      this._pageTitle = event.detail
      this._updateTitle()
    })
    this.addEventListener('grampsjs:error', this._handleError.bind(this))
    this.addEventListener(
      'grampsjs:notification',
      this._handleNotification.bind(this)
    )
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
        } else if (data.errorDetail?.status >= 500) {
          this._showError(data.error)
          // A failed background refresh keeps the loaded app usable
          if (setReady) {
            this.loadingState = LOADING_STATE_UNAUTHORIZED_NOCONNECTION
          }
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
        if (!getTreeId()) {
          this.setPermissions()
          this.loadingState = LOADING_STATE_NO_TREE
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
    const [major, minor, patch] = MINIMUM_API_VERSION.split('.').map(Number)
    if (!apiVersionAtLeast(this.appState.dbInfo, major, minor, patch)) {
      this._showError(`${this._('outdated backend')} (${apiVersion})`)
    }
  }

  _checkSearch() {
    // The API builds a missing index in a background task and reports it as
    // building until it is done; loading the active tasks shows its progress
    this._searchIndexBuilding = this.appState.dbInfo?.search?.building === true
    if (this._searchIndexBuilding) {
      this.appState.loadActiveTasks()
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
    this.appState
      .apiPost(url, payload, {
        dbChanged: false,
        saving: false,
        skipAuth: true,
      })
      .then(data => {
        if (!('error' in data) && data?.data?.access_token) {
          this.loadingState = LOADING_STATE_NO_OWNER
          this._firstRunToken = data?.data?.access_token
        } else {
          if (this.appState.path.page === 'firstrun') {
            // 405 means users already exist
            if (data.errorDetail?.status === 405) {
              this._showMessage(
                this._(
                  'This Gramps Web instance has already been set up. Log in with an existing account.'
                )
              )
            } else {
              this._showError(data.error)
            }
          }
          this.loadingState = LOADING_STATE_UNAUTHORIZED
        }
      })
  }

  _loadHomePersonInfo() {
    const grampsId = this.appState.settings.homePerson
    if (!grampsId || grampsId === this._homePersonFetchingId) {
      return
    }
    this._homePersonFetchingId = grampsId
    this._homePersonMissing = false
    this.appState
      .apiGet(
        `/api/people/?gramps_id=${grampsId}&profile=self&extend=media_list`
      )
      .then(data => {
        if (grampsId !== this._homePersonFetchingId) {
          return
        }
        this._homePersonFetchingId = null
        if ('error' in data) {
          this._showError(data.error)
          this._homePersonLoadedId = null
          this._homePersonDetails = {}
          this._homePersonMissing = true
        } else if ('data' in data) {
          this._homePersonLoadedId = grampsId
          this._homePersonDetails = data.data[0] ?? {}
          // an empty result means the person no longer exists in the tree
          this._homePersonMissing = data.data.length === 0
        }
      })
  }

  _setReady() {
    this._metadataConfirmed = true
    this.loadingState = LOADING_STATE_READY
    this.progress = false
    this.setPermissions()
    this._loadTreeConfig()
    this.appState.loadActiveTasks()
  }

  _loadTreeConfig() {
    this.appState.apiGet('/api/trees/-/config').then(data => {
      if ('data' in data) {
        this.appState.cacheTreeConfig(data.data)
      }
    })
  }

  _loadPage(path) {
    this._disableEditMode()

    if (path.includes('/oidc/callback')) {
      handleOIDCCallback(msg => this._showError(msg))
      return
    }

    if (path.includes('/oidc/complete')) {
      handleOIDCComplete(msg => this._showError(msg), this.appState)
      return
    }

    if (path === '/') {
      this._updateAppState({path: {page: 'home', pageId: '', pageId2: ''}})
    } else {
      const [page, pageId, pageId2] = path.slice(1).split('/')
      this._updateAppState({
        path: {page, pageId: pageId ?? '', pageId2: pageId2 ?? ''},
      })
    }

    this._closeDrawer()
  }

  _updateTitle() {
    const {page, pageId} = this.appState.path
    const suffix = getTreeName(this.appState) || 'Gramps Web'
    if (OBJECT_PAGES.has(page) && pageId) {
      document.title = `${pageId} · ${suffix}`
      return
    }
    const detail = pageTitleDetail(this.appState.path, this._pageTitle)
    if (detail) {
      document.title = `${this._(detail)} · ${suffix}`
      return
    }
    const pageTitle = PAGE_TITLES[page]
    if (pageTitle) {
      document.title = `${this._(pageTitle)} · ${suffix}`
    } else {
      document.title = suffix
    }
  }

  _handleRequestsChanged(e) {
    this.progress = e.detail.activeGet > 0
    const wasSaving = this._saving
    this._saving = e.detail.activeSave > 0
    if (wasSaving && !this._saving && e.detail.lastSaveSucceeded) {
      this._saveComplete = true
      clearTimeout(this._saveCompleteTimer)
      this._saveCompleteTimer = setTimeout(() => {
        this._saveComplete = false
      }, 3000)
    } else if (this._saving) {
      clearTimeout(this._saveCompleteTimer)
      this._saveComplete = false
    }
  }

  _handleTab(page) {
    if (page !== this.appState.path.page) {
      const href = `/${page}`
      this._loadPage(href)
      window.history.pushState({}, '', href)
      this._disableEditMode()
    }
  }

  // Goes to `path`, which adds an entry to the browser history, or with
  // `replace`, replaces the current one
  _handleNav(e) {
    const {path, replace = false} = e.detail
    const page = path.split('/')[0]
    const pageId = path.split('/')[1]
    const pageId2 = path.split('/')[2]
    const appPath = this.appState.path
    if (
      page !== appPath.page ||
      pageId !== appPath.pageId ||
      pageId2 !== appPath.pageId2
    ) {
      const href = `/${path}`
      this._loadPage(href)
      if (replace) {
        window.history.replaceState({}, '', href)
      } else {
        window.history.pushState({}, '', href)
        window.scrollTo(0, 0)
      }
      this._disableEditMode()
    }
  }

  _disableEditMode() {
    fireEvent(this, 'edit-mode:off', {})
  }

  _handleError(e) {
    const {message, silent = false, source = 'api', detail = {}} = e.detail
    this.appState.addNotification({type: 'error', message, source, detail})
    if (!silent) {
      this._showMessage(`${this._('Error')}: ${message}`, {
        action: {
          label: this._('Details'),
          handler: () => fireEvent(this, 'nav', {path: 'notifications'}),
        },
        dismissible: true,
      })
    }
  }

  // detail: {message, action, timeout, dismissible}, see grampsjs-snackbar
  _handleNotification(e) {
    const {message, ...options} = e.detail
    this._showMessage(message, options)
  }

  _handleUpdateAvailable(e) {
    const updateAvailable = e.target
    this._showMessage(this._('A new version of the app is available.'), {
      action: {
        label: this._('Refresh'),
        handler: () => updateAvailable.applyUpdate(),
      },
      timeout: 0,
    })
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

  _handleShowShortcuts() {
    this._showShortcuts = true
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
        this.appState.settings.lang !== this.appState.i18n.lang &&
        'gramps_webapi' in (this.appState.dbInfo ?? {})
      ) {
        this._loadStrings(grampsStrings, this.appState.settings.lang)
      }
      // Re-run on any path change (covers _loadPage() and internal redirects)
      if (changed.get('appState')?.path !== this.appState.path) {
        this._updateTitle()
      }
      // Re-run whenever strings are replaced (frontend + backend load separately)
      if (
        changed.get('appState')?.i18n?.strings !== this.appState.i18n.strings
      ) {
        this._updateTitle()
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
    const apiVersion = this.appState.dbInfo?.gramps_webapi?.version
    const versionParam = apiVersion
      ? `?v=${encodeURIComponent(apiVersion)}`
      : ''
    const data = await this.appState.apiPost(
      `/api/translations/${lang}${versionParam}`,
      {strings},
      {dbChanged: false, saving: false}
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
    this._showMessage(`${this._('Error')}: ${msg}`)
  }

  _showMessage(message, options = {}) {
    const snackbar = this.shadowRoot.getElementById('app-snackbar')
    snackbar.show({message, ...options})
  }

  _handleLogout(e) {
    this._metadataConfirmed = false
    // On an OIDC logout the browser is about to leave for the identity
    // provider; showing the login view here would re-enter the OIDC flow
    // before that happens (#1325).
    if (!e?.detail?.redirecting) {
      this.loadingState = LOADING_STATE_UNAUTHORIZED
    }
    this.appState.auth.unpinTree()
    clearMediaCaches()
  }

  _handleStorage(e) {
    // Another tab moved the shared token to a different tree. This tab's
    // loaded data and its URL both belong to the old tree, and it would keep
    // repopulating the origin-wide media caches with it, so reload into the
    // new tree from the home page.
    if (
      e?.key === 'access_token' &&
      isTreeMismatch(this.appState.auth.tabTreeId, getTreeFromToken(e.newValue))
    ) {
      clearMediaCaches()
      window.location.href = '/'
      return
    }
    if (e?.key === 'grampsjs_tree_config') {
      this._handleTreeConfig()
    }
    this._handleSettings()
  }

  _handleTreeConfig() {
    this._updateAppState({treeConfig: getTreeConfig()})
    this._updateTitle()
    this._applyColorScheme()
  }

  _handleSettings() {
    this._updateAppState({settings: getSettings()})
    if (
      this.appState.settings?.homePerson &&
      this.appState.settings.homePerson !== this._homePersonLoadedId
    ) {
      this._loadHomePersonInfo()
    }
  }

  _handleKey(e) {
    if (isKeyEventInInput(e)) {
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
        fireEvent(this, 'nav', {path: 'timeline'})
      } else if (e.key === 'j') {
        fireEvent(this, 'nav', {path: 'tasks'})
      } else if (e.key === 'e') {
        fireEvent(this, 'nav', {path: 'export'})
      } else if (e.key === 'i') {
        fireEvent(this, 'nav', {path: 'medialist'})
      } else if (e.key === 'd') {
        if (!this.appState.frontendConfig.hideDNALink) {
          fireEvent(this, 'nav', {path: 'dna-matches'})
        }
      } else if (e.key === 'a') {
        if (this.canUseChat) {
          fireEvent(this, 'nav', {path: 'chat'})
        }
      } else if (e.key === 's') {
        fireEvent(this, 'nav', {path: 'settings'})
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
      fireEvent(window, 'search:focus')
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
