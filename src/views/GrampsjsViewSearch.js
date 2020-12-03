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

      :host i {
        color: rgba(1, 0, 0, 0.2);
      }

    `];
  }


  static get properties() {
    return {
      _data: { type: Array },
      _totalCount: {type: Number }
    };
  }


  constructor() {
    super();
    this._data = [];
    this._totalCount = 0;
  }


  renderContent() {
    return html`
    <h2>Search</h2>

    <div id="search-field-container">
      <mwc-textfield id="search-field" outlined icon="search" @keydown="${this._handleSearchKey}">
      </mwc-textfield>
    </div>

    <grampsjs-search-results
      .data="${this._data}"
      .strings="${this.strings}"
      total="${this._totalCount}"
    ></grampsjs-search-results>
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
    this._totalCount = 0;
  }

  update(changed) {
    super.update(changed);
    if (changed.has('active')) {
        this._focus()

        this._clearAll()
    }
  }

  _handleSearchKey(event) {
    if(event.code == 'Enter') {
      this._executeSearch()
    }
    if(event.code == 'Escape') {
      this._clearBox()
    }
  }

  _executeSearch() {
    const query = this.shadowRoot.getElementById('search-field').value
    if (query === '') {
      this._data = []
      return
    }
    this.loading = true;
    this._fetchData(query)
  }

  async _fetchData(query) {
    const data = await apiGet(`/api/search/?query=${query}`);
    this.loading = false;
    if ('data' in data) {
      this._data = data.data;
      this._totalCount = data.total_count;
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
}

}


window.customElements.define('grampsjs-view-search', GrampsjsViewSearch);
