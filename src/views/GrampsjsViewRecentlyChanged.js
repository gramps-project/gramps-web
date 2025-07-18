import {html} from 'lit'

import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import '../components/GrampsjsSearchResultList.js'

export class GrampsjsViewRecentlyChanged extends GrampsjsConnectedComponent {
  renderContent() {
    return html` <h3>${this._('Recently changed objects')}</h3>
      ${this._data?.data === undefined || this._data?.data?.length === 0
        ? html` <p>${this._('None')}.</p> `
        : html`
            <grampsjs-search-result-list
              linked
              large
              .data="${this._data.data}"
              .appState="${this.appState}"
              date
              noSep
            ></grampsjs-search-result-list>
          `}`
  }

  renderLoading() {
    return html`
      <h3>${this._('Recently changed objects')}</h3>
      <grampsjs-search-result-list
        .data="${[]}"
        .appState="${this.appState}"
        loading
        numberLoading="8"
        noSep
      ></grampsjs-search-result-list>
    `
  }

  getUrl() {
    if (window._oldSearchBackend) {
      const query = "change:'-1 year to tomorrow'"
      return `/api/search/?sort=-change&query=${query}&locale=${
        this.appState.i18n.lang || 'en'
      }&profile=all&page=1&pagesize=8`
    }

    const now = Math.floor(Date.now() / 1000)
    // round down to nearest 100k seconds to avoid reloading every second (issue 641)
    const roundedNow = now - (now % 100000)
    const ts = roundedNow - 365 * 24 * 60 * 60 // ~1 year ago
    return `/api/search/?sort=-change&query=${encodeURIComponent(
      '*'
    )}&change=${encodeURIComponent(`>${ts}`)}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&page=1&pagesize=8`
  }
}

window.customElements.define(
  'grampsjs-view-recently-changed',
  GrampsjsViewRecentlyChanged
)
