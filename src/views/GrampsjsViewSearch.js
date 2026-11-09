import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsSearchResultList.js'
import '../components/GrampsjsPagination.js'
import '../components/GrampsjsButtonToggle.js'

import {
  objectTypeToEndpoint,
  objectIconPath,
  debounce,
  prefixSearchQuery,
  primaryObjectTypes,
} from '../util.js'
import '@material/web/textfield/outlined-text-field'
import '@material/web/iconbutton/icon-button.js'
import {mdiClose, mdiMagnify} from '@mdi/js'
import '../components/GrampsjsIcon.js'

function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

const filtrableObjectTypes = primaryObjectTypes

const PAGE_SIZE = 20

// Shorter queries only run on Enter
const MIN_LIVE_QUERY_LENGTH = 2

export class GrampsjsViewSearch extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        md-outlined-text-field#search-field {
          --md-outlined-text-field-container-shape: 28px;
          --md-outlined-text-field-input-text-size: 22px;
          --md-outlined-text-field-input-text-weight: var(
            --grampsjs-body-font-weight
          );
          --md-outlined-text-field-outline-color: var(
            --grampsjs-body-font-color-20
          );
          --md-outlined-text-field-leading-icon-color: var(
            --grampsjs-body-font-color-50
          );
          --md-outlined-text-field-top-space: 12px;
          --md-outlined-text-field-bottom-space: 12px;
          --md-outlined-text-field-leading-space: 24px;
          display: block;
          width: 100%;
          margin: 30px auto;
        }

        md-outlined-text-field#search-field grampsjs-icon[slot='leading-icon'] {
          margin-left: 8px;
        }

        md-outlined-text-field#search-field md-icon-button {
          margin-right: 8px;
        }

        grampsjs-button-toggle {
          margin-right: 0.35em;
          margin-bottom: 0.35em;
          display: inline-block;
        }

        /* Caption of the result list, aligned with its avatars */
        p.result-count {
          font-size: 14px;
          color: var(--grampsjs-body-font-color-50);
          margin: 24px 0 8px 16px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      dbInfo: {type: Object},
      _query: {type: String},
      _data: {type: Array},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number},
      _objectTypes: {type: Object},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
    this._query = ''
    this._data = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
    this._objectTypes = Object.fromEntries(
      filtrableObjectTypes.map(key => [key, false])
    )
    // Incremented per request; responses of older requests are dropped
    this._searchId = 0
    // Parameters of the latest request, to skip repeating it
    this._lastSearch = ''
    this._debouncedSearch = debounce(() => this._executeSearch(), 300)
    // Searches while typing; checks the length when it runs
    this._debouncedLiveSearch = debounce(() => {
      if (this._query.trim().length >= MIN_LIVE_QUERY_LENGTH) {
        this._executeSearch()
      }
    }, 300)
  }

  renderContent() {
    return html`
      <h2>${this._('Search')}</h2>

      <md-outlined-text-field
        id="search-field"
        label="${this._('Search')}"
        type="search"
        .value="${this._query}"
        @input="${this._handleInput}"
        @keydown="${this._handleSearchKey}"
      >
        <grampsjs-icon
          slot="leading-icon"
          path="${mdiMagnify}"
          color="var(--grampsjs-body-font-color-50)"
        ></grampsjs-icon>
        ${this._query
          ? html`<md-icon-button
              slot="trailing-icon"
              aria-label="${this._('Clear')}"
              @click="${this._handleClear}"
            >
              <grampsjs-icon
                path="${mdiClose}"
                color="var(--grampsjs-body-font-color-50)"
              ></grampsjs-icon>
            </md-icon-button>`
          : ''}
      </md-outlined-text-field>

      ${this.renderFilters()}
      ${this._totalCount === 0
        ? html`<p class="result-count">${this._('None')}</p>`
        : ''}
      ${this._totalCount > 0
        ? html`<p class="result-count">
            ${this._('Total')}: ${this._totalCount}
          </p>`
        : ''}
      <grampsjs-search-result-list
        .data="${this._data}"
        .appState="${this.appState}"
        showTags
        large
        noSep
        linked
      ></grampsjs-search-result-list>

      ${this._totalCount > 0
        ? html`
            <grampsjs-pagination
              page="${this._page}"
              pages="${this._pages}"
              total="${this._totalCount}"
              pageSize="${PAGE_SIZE}"
              .appState="${this.appState}"
              @page:changed="${this._handlePageChanged}"
            ></grampsjs-pagination>
          `
        : ''}
    `
  }

  renderFilters() {
    return html`
      <div @grampsjs-button-toggle:toggle="${this._handleFilterToggle}">
        ${Object.keys(this._objectTypes).map(
          key => html`<grampsjs-button-toggle
            ?checked="${this._objectTypes[key]}"
            .iconPath="${objectIconPath[key]}"
            label="${this._(capitalize(objectTypeToEndpoint[key]))}"
            id="toggle-${key}"
          ></grampsjs-button-toggle>`
        )}
      </div>
    `
  }

  _handleFilterToggle(e) {
    const key = e.target.id.split('-', 2)[1]
    this._objectTypes = {...this._objectTypes, [key]: e.detail.checked}
    this._debouncedSearch()
  }

  _handlePageChanged(event) {
    this._executeSearch(event.detail.page)
  }

  _handleInput(event) {
    this._query = event.target.value
    if (this._query.trim() === '') {
      this._clearAll()
    } else {
      this._debouncedLiveSearch()
    }
  }

  _handleClear() {
    this._clearAll()
    this._focus()
  }

  firstUpdated() {
    this._focus()
  }

  _focus() {
    if (!this.active) return
    window.setTimeout(() => {
      if (!this.active) return
      const el = this.shadowRoot?.getElementById('search-field')
      if (el) el.focus()
    }, 0)
  }

  _unfocus() {
    if (this.active) {
      const el = this.shadowRoot.getElementById('search-field')
      try {
        el.blur()
      } catch (e) {
        // retry once
        window.setTimeout(() => this._blur(false), 100)
      }
    }
  }

  _clearAll() {
    this._query = ''
    this._data = []
    this._totalCount = -1
    this._lastSearch = ''
    this._searchId += 1
    this.loading = false
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active')) {
      this._focus()
    }
  }

  _handleSearchKey(event) {
    if (event.code === 'Enter') {
      // repeats an unchanged search, to refresh its results
      this._lastSearch = ''
      this._executeSearch()
    }
    if (event.code === 'Escape') {
      if (this._query === '') {
        this._unfocus()
      } else {
        this._clearAll()
      }
    }
  }

  _executeSearch(page = 1) {
    if (this._query.trim() === '') {
      this._clearAll()
      return
    }
    const params = new URLSearchParams({
      query: prefixSearchQuery(this._query),
      locale: this.appState.i18n.lang || 'en',
      profile: 'all',
      page,
      pagesize: PAGE_SIZE,
      type: this._getSelectedObjectTypes().join(','),
    }).toString()
    if (params === this._lastSearch) return
    this._lastSearch = params
    this._page = page
    this.loading = true
    this._fetchData(params)
  }

  _getSelectedObjectTypes() {
    if (!Object.values(this._objectTypes).some(Boolean)) {
      // no filter selected, search for all
      return Object.keys(this._objectTypes)
    }
    // at least one filter selected, search for selected only
    return Object.keys(this._objectTypes).filter(key => this._objectTypes[key])
  }

  async _fetchData(params) {
    this._searchId += 1
    const searchId = this._searchId
    const data = await this.appState.apiGet(`/api/search/?${params}`)
    if (searchId !== this._searchId) return
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
      this._totalCount = parseInt(data.total_count, 10)
      this._pages = Math.ceil(this._totalCount / PAGE_SIZE)
    } else if ('error' in data) {
      // allow retrying the same search
      this._lastSearch = ''
      this.error = true
      this._errorMessage = data.error
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('nav', event => this._handleNav(event))
  }

  _handleNav(event) {
    if (event.detail.path !== 'search') {
      return
    }
    this._focus()
  }
}

window.customElements.define('grampsjs-view-search', GrampsjsViewSearch)
