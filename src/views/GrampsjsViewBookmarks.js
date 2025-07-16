import {html} from 'lit'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {getTreeBookmarks} from '../api.js'
import {objectTypeToEndpoint} from '../util.js'
import '../components/GrampsjsSearchResultList.js'

export class GrampsjsViewBookmarks extends GrampsjsView {
  static get properties() {
    return {
      _data: {type: Array},
      _searchResult: {type: Array},
      _isStale: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._searchResult = []
    this._data = []
    this._isStale = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundStorageHandler = this._handleStorage.bind(this)
    window.addEventListener('bookmark:changed', this._boundStorageHandler)
    window.addEventListener('storage', this._boundStorageHandler)
    this._handleStorage()
  }

  _handleStorage() {
    const bookmarks = getTreeBookmarks()
    if (bookmarks !== undefined && bookmarks !== null) {
      this._data = bookmarks
      if (this._hasFirstUpdated) {
        if (this.active) {
          this._fetchData(this.appState.i18n.lang)
        } else {
          this._isStale = true
        }
      }
    }
  }

  render() {
    return html` <h2>${this._('_Bookmarks')}</h2>
      ${this._data.length === 0
        ? html` <p>${this._('None')}.</p> `
        : html`
            <grampsjs-search-result-list
              .data="${this._searchResult.slice().reverse()}"
              .appState="${this.appState}"
              large
              noSep
              linked
            ></grampsjs-search-result-list>
          `}`
  }

  async _fetchData(lang) {
    const endpointToObjectType = Object.fromEntries(
      Object.entries(objectTypeToEndpoint).map(([k, v]) => [v, k])
    )
    // set placeholders for loading animation before actually fetching data
    this._searchResult = Object.entries(this._data).flatMap(([key, values]) =>
      values.map(value => ({
        object_type: endpointToObjectType[key],
        object: {handle: value},
        loading: true,
      }))
    )
    this._searchResult.forEach(result =>
      this._fetchDataObject(lang, result.object_type, result.object.handle)
    )
  }

  async _fetchDataObject(lang, objectType, handle) {
    const endpoint = objectTypeToEndpoint[objectType]
    const data = await this.appState.apiGet(
      `/api/${endpoint}/${handle}?locale=${lang || 'en'}&profile=self`
    )
    if ('data' in data) {
      const objResult = {object_type: objectType, object: data.data}
      this._searchResult = [
        ...this._searchResult.map(result =>
          result.object?.handle === handle ? objResult : result
        ),
      ]
    }
  }

  firstUpdated() {
    this._hasFirstUpdated = true
    if (this.appState.i18n.lang) {
      // don't load before we have strings
      this._fetchData(this.appState.i18n.lang)
    }
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active && this._isStale) {
      this._fetchData(this.appState.i18n.lang)
      this._isStale = false
    }
  }
}

window.customElements.define('grampsjs-view-bookmarks', GrampsjsViewBookmarks)
