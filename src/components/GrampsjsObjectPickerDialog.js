import {html, css, LitElement} from 'lit'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/tabs/tabs.js'
import '@material/web/tabs/primary-tab.js'
import '@material/web/textfield/filled-text-field.js'

import {mdiHistory, mdiMagnify, mdiUpdate, mdiBookmarkMultiple} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {
  debounce,
  fireEvent,
  objectIconPath,
  objectTypeToEndpoint,
  objectTypePlural,
} from '../util.js'
import {getRecentObjects, getTreeBookmarks} from '../api.js'
import './GrampsjsSearchResultList.js'
import './GrampsjsButtonToggle.js'
import './GrampsjsIcon.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const FILTERABLE_TYPES = [
  'person',
  'family',
  'event',
  'place',
  'source',
  'citation',
  'repository',
  'note',
  'media',
]

const QUICK_ACCESS_MODES = ['changed', 'recent', 'bookmarks']

const endpointToType = Object.fromEntries(
  Object.entries(objectTypeToEndpoint).map(([k, v]) => [v, k])
)
const SIDEBAR_MODES = ['search', ...QUICK_ACCESS_MODES]

const modeIcon = {
  search: mdiMagnify,
  changed: mdiUpdate,
  recent: mdiHistory,
  bookmarks: mdiBookmarkMultiple,
}

const modeLabel = {
  search: 'Search',
  changed: 'Recently changed',
  recent: 'Recently browsed',
  bookmarks: '_Bookmarks',
}

class GrampsjsObjectPickerDialog extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-dialog {
          min-width: min(860px, 95vw);
          max-height: 85vh;
          --md-list-container-color: var(--md-sys-color-surface-container-high);
          --md-dialog-content-block-start-space: 12px;
        }

        md-filled-text-field {
          --md-filled-text-field-container-shape: 12px;
          --md-filled-text-field-active-indicator-color: transparent;
          --md-filled-text-field-hover-active-indicator-color: transparent;
          --md-filled-text-field-focus-active-indicator-color: transparent;
          width: 100%;
          margin-bottom: 8px;
        }

        /* --- mobile tab bar (default) --- */
        .tab-bar {
          margin-bottom: 8px;
        }

        /* --- body: sidebar + main panel side by side --- */
        .dialog-body {
          display: flex;
          height: min(300px, calc(80vh - 200px));
          overflow: hidden;
          margin-top: 8px;
        }

        /* --- sidebar (desktop only) --- */
        .sidebar {
          display: none;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px 10px 9px;
          border-left: 3px solid transparent;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.3;
          color: var(--md-sys-color-on-surface-variant);
          user-select: none;
        }

        .sidebar-item:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        .sidebar-item.active {
          border-left-color: var(--md-sys-color-primary);
          color: var(--md-sys-color-primary);
          font-weight: 500;
        }

        /* --- main panel --- */
        .main-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        /* --- type filter pills --- */
        .pills {
          flex-shrink: 0;
          margin-bottom: 8px;
        }

        grampsjs-button-toggle {
          margin-right: 0.35em;
          margin-bottom: 0.35em;
          display: inline-block;
        }

        /* --- only the result list scrolls --- */
        grampsjs-search-result-list {
          flex: 1;
          overflow-y: auto;
          display: block;
        }

        /* --- desktop: swap tab bar for sidebar --- */
        @media (min-width: 600px) {
          .tab-bar {
            display: none;
          }

          /* no tab bar on desktop, less overhead to subtract */
          .dialog-body {
            height: min(480px, calc(80vh - 150px));
          }

          .sidebar {
            display: block;
            width: 210px;
            flex-shrink: 0;
            border-inline-end: 1px solid var(--md-sys-color-outline-variant);
            padding: 12px 0 4px;
            margin-inline-end: 16px;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      objectType: {type: String},
      excludeHandles: {type: Array},
      _data: {type: Array},
      _mode: {type: String},
      _query: {type: String},
      _loading: {type: Boolean},
      _error: {type: Boolean},
      _typeFilters: {type: Object},
      _tabIndex: {type: Number},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.excludeHandles = []
    this._data = []
    this._mode = 'changed'
    this._query = ''
    this._loading = false
    this._error = false
    this._tabIndex = 0
    this._fetchId = 0
    this._typeFilters = Object.fromEntries(
      FILTERABLE_TYPES.map(key => [key, false])
    )
  }

  render() {
    return html`
      <md-dialog>
        <div slot="content" class="content-wrapper">
          <md-filled-text-field
            id="textfield"
            type="search"
            label="${this._('Search')}"
            @input="${debounce(() => this._handleInput(), 500)}"
          >
            <grampsjs-icon
              slot="leading-icon"
              path="${mdiMagnify}"
              color="var(--md-sys-color-on-surface-variant)"
            ></grampsjs-icon>
          </md-filled-text-field>

          ${this._renderTabBar()}

          <div class="dialog-body">
            ${this._renderSidebar()}
            <div class="main-panel">
              ${this._renderPills()}
              <grampsjs-search-result-list
                selectable
                .data="${this._data}"
                .appState="${this.appState}"
                .textEmpty="${this._renderEmptyState()}"
                ?loading="${this._loading && !this._data.length}"
                numberLoading="6"
                @search-result:clicked="${this._handleSelected}"
              ></grampsjs-search-result-list>
            </div>
          </div>
        </div>

        <div slot="actions">
          <md-text-button @click="${this._handleCancel}">
            ${this._('Cancel')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _renderSidebar() {
    return html`
      <div class="sidebar">
        ${SIDEBAR_MODES.map(
          mode => html`
            <div
              class="sidebar-item ${this._mode === mode ? 'active' : ''}"
              tabindex="0"
              role="button"
              @click="${() => this._setMode(mode)}"
              @keydown="${e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  this._setMode(mode)
                }
              }}"
            >
              <grampsjs-icon
                path="${modeIcon[mode]}"
                height="18"
                width="18"
                color="${this._mode === mode
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-on-surface-variant)'}"
              ></grampsjs-icon>
              ${this._(modeLabel[mode])}
            </div>
          `
        )}
      </div>
    `
  }

  _renderTabBar() {
    return html`
      <div class="tab-bar">
        <md-tabs
          .activeTabIndex="${this._tabIndex}"
          @change="${this._handleTabChange}"
        >
          ${SIDEBAR_MODES.map(
            (mode, index) => html`
              <md-primary-tab has-icon>
                <grampsjs-icon
                  slot="icon"
                  path="${modeIcon[mode]}"
                  height="18"
                  width="18"
                  color="${this._tabIndex === index
                    ? 'var(--md-sys-color-primary)'
                    : 'var(--md-sys-color-on-surface-variant)'}"
                ></grampsjs-icon>
                ${this._(modeLabel[mode])}
              </md-primary-tab>
            `
          )}
        </md-tabs>
      </div>
    `
  }

  _renderPills() {
    if (this.objectType) return ''
    return html`
      <div
        class="pills"
        @grampsjs-button-toggle:toggle="${this._handleFilterToggle}"
      >
        ${FILTERABLE_TYPES.map(
          key => html`
            <grampsjs-button-toggle
              ?checked="${this._typeFilters[key]}"
              .iconPath="${objectIconPath[key]}"
              label="${this._(objectTypePlural[key])}"
              id="toggle-${key}"
            ></grampsjs-button-toggle>
          `
        )}
      </div>
    `
  }

  _renderEmptyState() {
    if (this._loading) return ''
    if (this._error) return this._('Error')
    if (this._mode === 'search' && !this._query) return ''
    return this._('Not found')
  }

  open(initialQuery = '') {
    const textField = this.renderRoot.getElementById('textfield')
    if (textField) textField.value = initialQuery
    this._query = initialQuery
    if (initialQuery) {
      this._mode = 'search'
      this._tabIndex = SIDEBAR_MODES.indexOf('search')
    } else if (this._mode === 'search') {
      this._mode = 'changed'
      this._tabIndex = SIDEBAR_MODES.indexOf('changed')
    }
    this._fetchData()
    const dialog = this.renderRoot.querySelector('md-dialog')
    dialog?.show()
    dialog?.addEventListener('opened', () => textField?.focus(), {once: true})
  }

  _setMode(mode) {
    this._mode = mode
    const textField = this.renderRoot.getElementById('textfield')
    if (mode === 'search') {
      this._tabIndex = 0
      textField?.focus()
      if (!textField?.value) {
        this._fetchId += 1
        this._data = []
        this._loading = false
        return
      }
    } else {
      this._tabIndex = SIDEBAR_MODES.indexOf(mode)
      if (textField) textField.value = ''
      this._query = ''
    }
    this._fetchData()
  }

  _handleTabChange(e) {
    const idx = e.target.activeTabIndex
    if (idx >= 0 && idx < SIDEBAR_MODES.length) {
      this._setMode(SIDEBAR_MODES[idx])
    }
  }

  _handleInput() {
    const textField = this.renderRoot.getElementById('textfield')
    const value = textField?.value ?? ''
    this._query = value
    if (value) {
      this._mode = 'search'
      this._tabIndex = SIDEBAR_MODES.indexOf('search')
    } else {
      this._mode = 'changed'
      this._tabIndex = SIDEBAR_MODES.indexOf('changed')
    }
    this._fetchData()
  }

  _handleFilterToggle(e) {
    const key = e.target.id.replace('toggle-', '')
    this._typeFilters = {...this._typeFilters, [key]: e.detail.checked}
    this._fetchData()
  }

  async _fetchData() {
    this._fetchId += 1
    const fetchId = this._fetchId
    this._loading = true
    this._error = false
    this._data = []
    if (this._mode === 'recent') {
      await this._fetchRecentData(fetchId)
    } else if (this._mode === 'bookmarks') {
      await this._fetchBookmarksData(fetchId)
    } else {
      await this._fetchSearchData(
        this._mode === 'search' ? this._query : '',
        fetchId
      )
    }
    if (this._fetchId === fetchId) this._loading = false
  }

  async _fetchSearchData(value, fetchId) {
    const url = this._getFetchUrl(value)
    const data = await this.appState.apiGet(url)
    if (this._fetchId !== fetchId) return
    if ('data' in data) {
      this._data = data.data.filter(
        obj => !this.excludeHandles.includes(obj.handle ?? obj.object?.handle)
      )
    } else if ('error' in data) {
      this._data = []
      this._error = true
    }
  }

  async _fetchRecentData(fetchId) {
    const recentObjects = getRecentObjects() || []
    const activeTypes = this._getActiveTypes()
    let filtered = recentObjects
    if (activeTypes.length) {
      filtered = recentObjects.filter(obj =>
        activeTypes.includes(obj.className?.toLowerCase())
      )
    }
    if (filtered.length === 0) return
    this._data = filtered
      .filter(obj => !this.excludeHandles.includes(obj.handle))
      .reverse()
      .map(obj => ({
        object_type: obj.className?.toLowerCase(),
        object: {gramps_id: obj.grampsId},
        loading: true,
      }))
    const query = filtered
      .map(obj => obj.grampsId?.trim())
      .filter(Boolean)
      .join(' OR ')
    const url = `/api/search/?query=${encodeURIComponent(query)}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&page=1&pagesize=100`
    const data = await this.appState.apiGet(url)
    if (this._fetchId !== fetchId) return
    if ('data' in data) {
      const byId = Object.fromEntries(
        data.data.map(item => [item?.object?.gramps_id, item])
      )
      this._data = this._data
        .map(placeholder => byId[placeholder.object?.gramps_id] ?? placeholder)
        .filter(obj => !this.excludeHandles.includes(obj.object?.handle))
    } else {
      this._data = []
      this._error = true
    }
  }

  async _fetchBookmarksData(fetchId) {
    const bookmarks = getTreeBookmarks() || {}
    const activeTypes = this._getActiveTypes()
    const pairs = Object.entries(bookmarks)
      .filter(
        ([endpoint]) =>
          !activeTypes.length || activeTypes.includes(endpointToType[endpoint])
      )
      .flatMap(([endpoint, handles]) =>
        (handles || [])
          .filter(handle => !this.excludeHandles.includes(handle))
          .map(handle => ({objectType: endpointToType[endpoint], handle}))
      )
    if (pairs.length === 0) {
      this._data = []
      return
    }
    this._data = pairs.map(({objectType, handle}) => ({
      object_type: objectType,
      object: {handle},
      loading: true,
    }))
    pairs.forEach(({objectType, handle}) =>
      this._fetchBookmarkObject(objectType, handle, fetchId)
    )
  }

  async _fetchBookmarkObject(objectType, handle, fetchId) {
    const endpoint = objectTypeToEndpoint[objectType]
    if (!endpoint) return
    const data = await this.appState.apiGet(
      `/api/${endpoint}/${handle}?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=self`
    )
    if (this._fetchId !== fetchId) return
    if ('data' in data) {
      const updated = {
        object_type: objectType,
        object: data.data,
        handle: data.data.handle,
      }
      this._data = this._data.map(item =>
        item.object?.handle === handle ? updated : item
      )
    }
  }

  _getFetchUrl(value) {
    const typeParam = this._buildTypeParam()
    const lang = this.appState.i18n.lang || 'en'
    if (window._oldSearchBackend) {
      const typeClause = this.objectType ? ` AND type:${this.objectType}` : ''
      return value
        ? `/api/search/?locale=${lang}&profile=all&query=${encodeURIComponent(
            `${value}*${typeClause}`
          )}&page=1&pagesize=20`
        : `/api/search/?sort=-change&locale=${lang}&profile=all&query=${encodeURIComponent(
            `type:${this.objectType || '*'}`
          )}&page=1&pagesize=20`
    }
    let url = `/api/search/?locale=${lang}&profile=all&page=1&pagesize=20`
    if (value) {
      url = `${url}&query=${encodeURIComponent(`${value}*`)}`
    } else {
      url = `${url}&sort=-change&query=${encodeURIComponent('*')}`
    }
    return `${url}${typeParam}`
  }

  _getActiveTypes() {
    if (this.objectType) return [this.objectType]
    return Object.entries(this._typeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k)
  }

  _buildTypeParam() {
    const types = this._getActiveTypes()
    return types.length ? `&type=${types.join(',')}` : ''
  }

  _handleSelected(e) {
    if (e.detail.loading) return
    this._close()
    fireEvent(this, 'select-object:selected', e.detail)
  }

  _handleCancel() {
    this._close()
  }

  _close() {
    this.renderRoot.querySelector('md-dialog')?.close()
  }
}

window.customElements.define(
  'grampsjs-object-picker-dialog',
  GrampsjsObjectPickerDialog
)
