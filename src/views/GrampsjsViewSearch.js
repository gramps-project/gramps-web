import {html, css} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsSearchResults.js'
import '../components/GrampsjsPagination.js'
import {apiGet} from '../api.js'
import '@material/mwc-textfield'


export class GrampsjsViewSearch extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      #search-field-container {
        text-align: center;
      }

      mwc-textfield#search-field {
        --mdc-shape-small: 28px;
        --mdc-typography-subtitle1-font-size: 22px;
        --mdc-typography-subtitle1-font-weight: 300;
        --mdc-text-field-idle-line-color:	rgba(0, 0, 0, 0.2);
        max-width: 100%;
        min-width: 80%;
        margin: 30px auto;
      }
    `]
  }


  static get properties() {
    return {
      _data: {type: Array},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number}

    }
  }


  constructor() {
    super()
    this._data = []
    this._totalCount = -1
    this._page = 1
    this._pages = -1
  }


  renderContent() {
    return html`
    <h2>Search</h2>

    <div id="search-field-container">
      <mwc-textfield id="search-field" outlined icon="search" @keydown="${this._handleSearchKey}">
      </mwc-textfield>
    </div>

    ${this._totalCount === 0 ? html`<p>No results.</p>` : ''}
    ${this._totalCount > 0 ? html`<p>Total: ${this._totalCount}</p>` : ''}
    <grampsjs-search-results
      .data="${this._data}"
      .strings="${this.strings}"
    ></grampsjs-search-results>

    ${this._totalCount > 0 ? html`
    <grampsjs-pagination
      page="${this._page}"
      pages="${this._pages}"
      @page:changed="${this._handlePageChanged}"
      ></grampsjs-pagination>
    ` : ''}
    `
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
  }

  firstUpdated() {
    this._focus()
  }

  _focus() {
    if (this.active) {
      const el = this.shadowRoot.getElementById('search-field')
      try {
        el.focus()
      }
      catch(e) {
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
    if(event.code === 'Enter') {
      this._executeSearch()
    }
    if(event.code === 'Escape') {
      this._clearBox()
    }
  }

  _executeSearch(page=1) {
    const query = this.shadowRoot.getElementById('search-field').value
    if (query === '') {
      this._clearAll()
      return
    }
    this.loading = true
    this._fetchData(query, page)
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
    const data = await apiGet(`/api/search/?query=${query}&profile=all&page=${page}&pagesize=20`)
    this.loading = false
    if ('data' in data) {
      this._data = data.data
      this._totalCount = data.total_count
      this._pages = Math.ceil(this._totalCount / 20)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

}


window.customElements.define('grampsjs-view-search', GrampsjsViewSearch)
