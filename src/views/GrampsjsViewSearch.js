import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsSearchResultList.js'
import '../components/GrampsjsPagination.js'
import '../components/GrampsjsButtonToggle.js'
import {apiGet} from '../api.js'
import {objectTypeToEndpoint, objectIcon, debounce} from '../util.js'
import '@material/mwc-textfield'

function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

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
        }

        mwc-textfield#search-field {
          --mdc-shape-small: 28px;
          --mdc-typography-subtitle1-font-size: 22px;
          --mdc-typography-subtitle1-font-weight: 300;
          --mdc-text-field-idle-line-color: rgba(0, 0, 0, 0.2);
          width: calc(100% - 70px);
          margin: 30px auto;
        }

        #search-field-container mwc-icon-button {
          color: rgba(0, 0, 0, 0.5);
          --mdc-icon-size: 26px;
          --mdc-icon-button-size: 55px;
          position: relative;
          top: -2px;
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
      _data: {type: Array},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number},
      _objectTypes: {type: Object},
    }
  }

  constructor() {
    super()
    this._data = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
    this._objectTypes = Object.fromEntries(
      Object.keys(objectTypeToEndpoint)
        .filter(key => key !== 'tag')
        .map(key => [key, true])
    )
  }

  renderContent() {
    return html`
      <h2>Search</h2>

      <div id="search-field-container">
        <mwc-textfield
          id="search-field"
          outlined
          icon="search"
          @keydown="${this._handleSearchKey}"
        >
        </mwc-textfield>
        <mwc-icon-button icon="search" @click="${() => this._executeSearch()}">
        </mwc-icon-button>
      </div>

      ${this.renderFilters()}
      ${this._totalCount === -1 &&
      !Object.values(this._objectTypes).some(Boolean)
        ? html`<p>${this._('Select at least one object type')}</p>`
        : ''}
      ${this._totalCount === 0 ? html`<p>${this._('No items')}</p>` : ''}
      ${this._totalCount > 0 ? html`<p>Total: ${this._totalCount}</p>` : ''}
      <grampsjs-search-result-list
        .data="${this._data}"
        .strings="${this.strings}"
        large
        noSep
        linked
      ></grampsjs-search-result-list>

      ${this._totalCount > 0
        ? html`
            <grampsjs-pagination
              page="${this._page}"
              pages="${this._pages}"
              .strings="${this.strings}"
              @page:changed="${this._handlePageChanged}"
            ></grampsjs-pagination>
          `
        : ''}
    `
  }

  renderFilters() {
    return html`
      <div @grampsjs-button-toggle:toggle="${this._handleFilterToggle}">
        <grampsjs-button-toggle
          ?checked="${Object.values(this._objectTypes).every(Boolean)}"
          icon=""
          id="toggle-all"
        >
          ${this._('All')}
        </grampsjs-button-toggle>
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

  _handleFilterToggle(e) {
    const key = e.target.id.split('-', 2)[1]
    if (key === 'all') {
      this._objectTypes = Object.fromEntries(
        Object.keys(this._objectTypes).map(key_ => [key_, e.detail.checked])
      )
    } else {
      this._objectTypes = {...this._objectTypes, [key]: e.detail.checked}
    }
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
      if (!Object.values(this._objectTypes).some(Boolean)) {
        // all deselected - do nothing
        this._data = []
        this._totalCount = -1
        return
      }
      query = this._filterQueryByObjectType(query)
    }
    this.loading = true
    this._fetchData(query, page)
  }

  _filterQueryByObjectType(query) {
    const objectTypes = Object.keys(this._objectTypes).filter(
      key => this._objectTypes[key]
    )
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
    const data = await apiGet(
      `/api/search/?query=${query}&locale=${
        this.strings?.__lang__ || 'en'
      }&profile=all&page=${page}&pagesize=20`
    )
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
