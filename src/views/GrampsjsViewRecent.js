import { html } from 'lit-element';
import '@material/mwc-button'

import { GrampsjsView } from './GrampsjsView.js'
import { apiGet } from '../api.js'
import '../components/GrampsjsSearchResults.js'


export class GrampsjsViewRecentObject extends GrampsjsView {

  static get properties() {
    return {
      _data: { type: Array },
      _searchResult: { type: Array },
    };
  }

  constructor() {
    super();
    this._searchResult = []
    this._data = [];
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundHandleEvent = this._handleEvent.bind(this)
    window.addEventListener('object:loaded', this._boundHandleEvent)
    this._boundStorageHandler = this._handleStorage.bind(this)
    window.addEventListener('storage', this._boundStorageHandler)
    this._handleStorage()
  }

  _handleStorage() {
    const recentObjects = JSON.parse(window.localStorage.getItem('recentObjects'))
    if (recentObjects !== undefined) {
      this._data = recentObjects

      this._fetchData()
    }
  }

  _handleEvent(event) {
    this._data.push(event.detail)
    this._data = this._data.slice(-10)
    window.localStorage.setItem('recentObjects', JSON.stringify(this._data))
    this._fetchData()
  }

  _handleClear() {
    this._data = []
    window.localStorage.setItem('recentObjects', JSON.stringify(this._data))
  }

  render() {
    return html`
    <mwc-button
      raised
      label="${this._('Clear')}"
      class="float-right"
      icon="clear_all"
      @click="${this._handleClear}"
      ?disabled=${this._data.length === 0}
    ></mwc-button>
    <h2>${this._('Recently browsed objects')}</h2>
    ${this._data.length === 0 ? html`
      <p>${this._('No items')}.</p>
      ` : html`
      <grampsjs-search-results
        .data="${this._searchResult}"
        .strings="${this.strings}"
        total="99"
      ></grampsjs-search-results>
    `}`
  }

  async _fetchData() {
    if (this._data.length === 0) {
      this._searchResult = []
      return
    }
    this.loading = true;
    const query = this._data.map(obj => obj.grampsId).filter(grampsId => grampsId !== undefined).join(' OR ')
    const data = await apiGet(`/api/search/?query=${query}&profile=self&page=1&pagesize=100`);
    this.loading = false;
    if ('data' in data) {
      const dataObject = data.data.reduce((obj, item) => {
        // eslint-disable-next-line no-param-reassign
        obj[item?.object?.gramps_id] = item
        return obj
      }, {})
      this._searchResult = this._data.map(obj => dataObject[obj.grampsId]).filter(obj => obj !== undefined)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  firstUpdated() {
    this._fetchData()
  }
}


window.customElements.define('grampsjs-view-recent', GrampsjsViewRecentObject);
