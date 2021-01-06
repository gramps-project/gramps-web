import {html, css} from 'lit-element'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'
import '../components/GrampsjsSearchResults.js'


export class GrampsjsViewRecentlyChanged extends GrampsjsView {


  static get styles() {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }
      `
    ]
  }

  static get properties() {
    return {
      _searchResult: {type: Array}
    }
  }

  constructor() {
    super()
    this._searchResult = []
  }

  renderContent() {
    return html`
    <h2>${this._('Recently changed objects')}</h2>
    ${!this.loading && this._searchResult.length === 0 ? html`
      <p>${this._('No items')}.</p>
      ` : html`
      <grampsjs-search-results
        .data="${this._searchResult}"
        .strings="${this.strings}"
        date
      ></grampsjs-search-results>
    `}`
  }

  async _fetchData() {
    this.loading = true
    const query = 'change:\'-1 year to tomorrow\''
    const data = await apiGet(`/api/search/?sort=-change&query=${query}&locale=${this.strings?.__lang__ || 'en'}&profile=all&page=1&pagesize=8`)
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._searchResult = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  firstUpdated() {
    this._fetchData()
  }
}


window.customElements.define('grampsjs-view-recently-changed', GrampsjsViewRecentlyChanged)
