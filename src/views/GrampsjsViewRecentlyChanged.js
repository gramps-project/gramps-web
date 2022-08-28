import {html} from 'lit'

import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import '../components/GrampsjsSearchResults.js'

export class GrampsjsViewRecentlyChanged extends GrampsjsConnectedComponent {
  renderContent() {
    return html` <h2>${this._('Recently changed objects')}</h2>
      ${this._data.data.length === 0
        ? html` <p>${this._('No items')}.</p> `
        : html`
            <grampsjs-search-results
              .data="${this._data.data}"
              .strings="${this.strings}"
              date
            ></grampsjs-search-results>
          `}`
  }

  renderLoading() {
    return html`
      <h2>${this._('Recently changed objects')}</h2>
      <grampsjs-search-results
        .data="${this._data.data}"
        .strings="${this.strings}"
        loading
        date
      ></grampsjs-search-results>
    `
  }

  getUrl() {
    const query = "change:'-1 year to tomorrow'"
    return `/api/search/?sort=-change&query=${query}&locale=${
      this.strings.__lang__ || 'en'
    }&profile=all&page=1&pagesize=8`
  }
}

window.customElements.define(
  'grampsjs-view-recently-changed',
  GrampsjsViewRecentlyChanged
)
