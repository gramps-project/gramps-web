import { html, css } from 'lit-element';

import { GrampsjsView } from './GrampsjsView.js'
import '../components/GrampsjsSearchResults.js'
import { apiGet } from '../api.js'
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
        --mdc-text-field-idle-line-color 	rgba(0, 0, 0, 0.2);
        max-width: 100%;
        min-width: 80%;
        margin: 30px auto;
      }

      .paging {
        text-align: center;
        padding-right: 1em;
        line-height: 48px;
      }

      .paging span {
        color: rgba(0, 0, 0, 0.9);
        padding: 0 0.5em;
      }

    `];
  }


  static get properties() {
    return {
      _data: { type: Array },
      _totalCount: {type: Number },
      _page: {type: Number},
      _pages: {type: Number}

    };
  }


  constructor() {
    super();
    this._data = [];
    this._totalCount = -1;
    this._page = 1;
    this._pages = -1;
  }


  renderContent() {
    return html`
    <h2>Search</h2>

    <div id="search-field-container">
      <mwc-textfield id="search-field" outlined icon="search" @keydown="${this._handleSearchKey}">
      </mwc-textfield>
    </div>

    ${this._totalCount == 0 ? html`<p>No results.</p>` : ''}
    ${this._totalCount > 0 ? html`<p>Total: ${this._totalCount}</p>` : ''}
    <grampsjs-search-results
      .data="${this._data}"
      .strings="${this.strings}"
    ></grampsjs-search-results>

    ${this._totalCount > 0 ? html`
    <div class="paging">
      <mwc-icon-button icon="first_page" ?disabled=${this._page === 1} @click="${this._pageFirst}"></mwc-icon-button>
      <mwc-icon-button icon="navigate_before" ?disabled=${this._page === 1} @click="${this._pagePrev}"></mwc-icon-button>
      <span>Page ${this._page} / ${this._pages}</span>
      <mwc-icon-button icon="navigate_next" ?disabled=${this._page === this._pages} @click="${this._pageNext}"></mwc-icon-button>
      <mwc-icon-button icon="last_page" ?disabled=${this._page === this._pages} @click="${this._pageLast}"></mwc-icon-button>
    <div>
    ` : ''}
    `
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
    this._totalCount = -1;
  }

  _clearPage() {
    this._data = []
  }

  update(changed) {
    super.update(changed);
    if (changed.has('active')) {
      this._focus()
    }
    if (changed.has('_page') && this._totalCount > 0) {
      this.loading = true;
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
    this.loading = true;
    this._fetchData(query, page)
  }

  _pageFirst() {
    this._page = 1;
  }
  _pagePrev() {
    this._page -= 1;
  }
  _pageNext() {
    this._page += 1;
  }
  _pageLast() {
    this._page = this._pages;
  }

  async _fetchData(query, page) {
    const data = await apiGet(`/api/search/?query=${query}&profile=self&page=${page}&pagesize=20`);
    this.loading = false;
    if ('data' in data) {
      this._data = data.data;
      this._totalCount = data.total_count;
      this._pages = Math.ceil(this._totalCount / 20);
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

}


window.customElements.define('grampsjs-view-search', GrampsjsViewSearch);
