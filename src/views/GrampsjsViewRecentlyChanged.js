import {html} from 'lit'

import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import '../components/GrampsjsSearchResultList.js'

export class GrampsjsViewRecentlyChanged extends GrampsjsConnectedComponent {
  renderContent() {
    return html` <h3>${this._('Recently changed objects')}</h3>
      ${this._data.data.length === 0
        ? html` <p>${this._('No items')}.</p> `
        : html`
            <grampsjs-search-result-list
              linked
              large
              .data="${this._data.data}"
              .strings="${this.strings}"
              date
              noSep
            ></grampsjs-search-result-list>
          `}`
  }

  renderLoading() {
    return html`
      <h3>${this._('Recently changed objects')}</h3>
      <grampsjs-search-result-list
        .data="${this._data.data}"
        .strings="${this.strings}"
        loading
        numberLoading="8"
        noSep
      ></grampsjs-search-result-list>
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
