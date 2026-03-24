import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsSearchResultList.js'
import '../components/GrampsjsPagination.js'
import '../components/GrampsjsButtonToggle.js'

import {objectTypeToEndpoint, objectIcon, debounce} from '../util.js'
import '@material/web/textfield/outlined-text-field'
import '@material/web/iconbutton/icon-button'
import '@material/web/button/text-button'
import {mdiMagnify} from '@mdi/js'
import '../components/GrampsjsIcon.js'

function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

const filtrableObjectTypes = [
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

export class GrampsjsViewSearch extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        #search-field-container {
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          min-width: 80%;
          clear: left;
        }

        .mode-toggle {
          float: right;
          display: flex;
          gap: 4px;
        }

        .mode-toggle md-text-button {
          --md-text-button-label-text-size: 13px;
          --md-text-button-label-text-weight: 500;
          position: relative;
        }

        .mode-toggle md-text-button.active {
          --md-sys-color-primary: var(--mdc-theme-primary);
        }

        .mode-toggle md-text-button.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 12px;
          right: 12px;
          height: 2px;
          background-color: var(--mdc-theme-primary);
          border-radius: 1px;
        }

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
          width: calc(100% - 70px);
          margin: 30px auto;
        }

        #search-field-container md-icon-button {
          --md-icon-button-icon-size: 26px;
          --md-icon-button-state-layer-height: 55px;
          --md-icon-button-state-layer-width: 55px;
          position: relative;
          top: -2px;
        }

        md-outlined-text-field#search-field grampsjs-icon {
          margin-left: 8px;
        }

        grampsjs-button-toggle {
          margin-right: 0.35em;
          margin-bottom: 0.35em;
          display: inline-block;
        }
      `,
    ]
  }

  static get properties() {
    return {
      semantic: {type: Boolean},
      dbInfo: {type: Object},
      _data: {type: Array},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number},
      _objectTypes: {type: Object},
    }
  }

  constructor() {
    super()
    this.semantic = false
    this.dbInfo = {}
    this._data = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
    this._objectTypes = Object.fromEntries(
      filtrableObjectTypes.map(key => [key, false])
    )
  }

  renderContent() {
    return html`
      ${this._semanticEnabled() ? this._renderModeToggle() : ''}

      <h2>${this._('Search')}</h2>

      <div id="search-field-container">
        <md-outlined-text-field
          id="search-field"
          @keydown="${this._handleSearchKey}"
        >
          <grampsjs-icon
            slot="leading-icon"
            path="${mdiMagnify}"
            color="var(--grampsjs-body-font-color-50)"
          ></grampsjs-icon>
        </md-outlined-text-field>
        <md-icon-button @click="${() => this._executeSearch()}">
          <grampsjs-icon
            path="${mdiMagnify}"
            color="var(--grampsjs-body-font-color-50)"
          ></grampsjs-icon>
        </md-icon-button>
      </div>

      ${this.renderFilters()}
      ${this._totalCount === 0 ? html`<p>${this._('None')}</p>` : ''}
      ${this._totalCount > 0 ? html`<p>Total: ${this._totalCount}</p>` : ''}
      <grampsjs-search-result-list
        .data="${this._data}"
        .appState="${this.appState}"
        large
        noSep
        linked
      ></grampsjs-search-result-list>

      ${this._totalCount > 0
        ? html`
            <grampsjs-pagination
              page="${this._page}"
              pages="${this._pages}"
              .appState="${this.appState}"
              @page:changed="${this._handlePageChanged}"
            ></grampsjs-pagination>
          `
        : ''}
    `
  }

  _renderModeToggle() {
    return html`
      <div class="mode-toggle">
        <md-text-button
          class="${!this.semantic ? 'active' : ''}"
          @click="${this._handleModeClick}"
          >${this._('full-text')}</md-text-button
        >
        <md-text-button
          class="${this.semantic ? 'active' : ''}"
          @click="${this._handleModeClick}"
          >${this._('semantic')}</md-text-button
        >
      </div>
    `
  }

  async _handleModeClick() {
    this.semantic = !this.semantic
    this._executeSearch()
  }

  renderFilters() {
    return html`
      <div @grampsjs-button-toggle:toggle="${this._handleFilterToggle}">
        ${Object.keys(this._objectTypes).map(
          key => html`<grampsjs-button-toggle
            ?checked="${this._objectTypes[key]}"
            icon="${objectIcon[key]}"
            id="toggle-${key}"
          >
            ${this._(capitalize(objectTypeToEndpoint[key]))}
          </grampsjs-button-toggle>`
        )}
      </div>
    `
  }

  _semanticEnabled() {
    return (
      !!this.dbInfo?.server?.semantic_search &&
      !!this.dbInfo?.search?.sifts?.count_semantic
    )
  }

  _handleFilterToggle(e) {
    const key = e.target.id.split('-', 2)[1]
    this._objectTypes = {...this._objectTypes, [key]: e.detail.checked}
    this._page = 1
    debounce(() => this._executeSearch(), 500)()
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
  }

  firstUpdated() {
    this._focus()
  }

  _focus(retry = true) {
    if (this.active) {
      const el = this.shadowRoot.getElementById('search-field')
      try {
        el.focus()
      } catch (e) {
        // retry once
        if (retry) {
          window.setTimeout(() => this._focus(false), 100)
        }
      }
    }
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

  _clearBox() {
    this.shadowRoot.getElementById('search-field').value = ''
  }

  _clearAll() {
    this._clearBox()
    this._data = []
    this._totalCount = -1
  }

  _clearPage() {
    this._data = []
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active')) {
      this._focus()
    }
    if (changed.has('_page') && this._totalCount > 0) {
      this.loading = true
      this._executeSearch(this._page)
    }
  }

  _handleSearchKey(event) {
    if (event.code === 'Enter') {
      this._executeSearch()
    }
    if (event.code === 'Escape') {
      const query = this.shadowRoot.getElementById('search-field').value
      if (query === '') {
        this._unfocus()
      } else {
        this._clearBox()
      }
    }
  }

  _executeSearch(page = 1) {
    let query = this.shadowRoot.getElementById('search-field').value
    if (query === '') {
      this._clearAll()
      return
    }
    // apply object type filter if necessary
    if (!Object.values(this._objectTypes).every(Boolean)) {
      if (window._oldSearchBackend) {
        query = this._filterQueryByObjectType(query)
      }
    }
    this.loading = true
    this._fetchData(query, page)
  }

  _getSelectedObjectTypes() {
    if (!Object.values(this._objectTypes).some(Boolean)) {
      // no filter selected, search for all
      return Object.keys(this._objectTypes)
    }
    // at least one filter selected, search for selected only
    return Object.keys(this._objectTypes).filter(key => this._objectTypes[key])
  }

  _filterQueryByObjectType(query) {
    const objectTypes = this._getSelectedObjectTypes()
    return `${query} (${objectTypes.map(key => `type:${key}`).join(' OR ')})`
  }

  _pageFirst() {
    this._page = 1
  }

  _pagePrev() {
    this._page -= 1
  }

  _pageNext() {
    this._page += 1
  }

  _pageLast() {
    this._page = this._pages
  }

  async _fetchData(query, page) {
    let url = `/api/search/?query=${query}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&page=${page}&pagesize=20`
    if (this._semanticEnabled()) {
      url = `${url}&semantic=${this.semantic ? 1 : 0}`
    }
    if (!window._oldSearchBackend) {
      const objectTypes = this._getSelectedObjectTypes()
      url = `${url}&type=${objectTypes.join(',')}`
    }
    const data = await this.appState.apiGet(url)
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
      this._totalCount = parseInt(data.total_count, 10)
      this._pages = Math.ceil(this._totalCount / 20)
    } else if ('error' in data) {
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
