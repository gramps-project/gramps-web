import {html} from 'lit'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {getRecentObjects, setRecentObjects} from '../api.js'
import '../components/GrampsjsSearchResultList.js'

export class GrampsjsViewRecentObject extends GrampsjsView {
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
    this._boundHandleEvent = this._handleEvent.bind(this)
    window.addEventListener('object:loaded', this._boundHandleEvent)
    this._boundStorageHandler = this._handleStorage.bind(this)
    window.addEventListener('storage', this._boundStorageHandler)
    this._handleStorage()
  }

  _handleLanguageChanged(lang) {
    if (this._hasFirstUpdated) {
      this._fetchData(lang)
    }
  }

  _handleStorage() {
    const recentObjects = getRecentObjects()
    if (recentObjects !== undefined && recentObjects !== null) {
      this._data = recentObjects
      if (this._hasFirstUpdated) {
        this._fetchData(this.appState.i18n.lang)
      }
    }
  }

  _handleEvent(event) {
    this._data = this._data.filter(
      obj =>
        obj.grampsId !== event.detail.grampsId ||
        obj.className !== event.detail.className
    )
    this._data.push(event.detail)
    this._data = this._data.slice(-20)
    setRecentObjects(this._data)
    if (this.active) {
      this._fetchData(this.appState.i18n.lang)
    } else {
      this._isStale = true
    }
  }

  _handleClear() {
    this._data = []
    setRecentObjects(this._data)
  }

  render() {
    return html` <mwc-button
        raised
        label="${this._('Clear')}"
        class="float-right"
        icon="clear_all"
        @click="${this._handleClear}"
        ?disabled=${this._data.length === 0}
      ></mwc-button>
      <h2>${this._('Recently browsed objects')}</h2>
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
    if (this._data.length === 0) {
      this._searchResult = []
      return
    }
    this.loading = true
    const query = this._data
      .map(obj => obj.grampsId.trim().replace(/\s\s+/g, ' OR '))
      .filter(grampsId => grampsId && grampsId.trim())
      .join(' OR ')
    const data = await this.appState.apiGet(
      `/api/search/?query=${query}&locale=${
        lang || 'en'
      }&profile=all&page=1&pagesize=100`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      const dataObject = data.data.reduce((obj, item) => {
        // eslint-disable-next-line no-param-reassign
        obj[item?.object?.gramps_id] = item
        return obj
      }, {})
      this._searchResult = this._data
        .map(obj => dataObject[obj.grampsId])
        .filter(obj => obj !== undefined)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  firstUpdated() {
    this._hasFirstUpdated = true
    if (this.appState.i18n.lang) {
      // don't load before we have strings
      this._fetchData(this.appState.i18n.lang)
    }
  }

  updated(changed) {
    if (changed.has('active') && this.active && this._isStale) {
      this._fetchData(this.appState.i18n.lang)
      this._isStale = false
    }
    if (
      changed.has('appState') &&
      changed.get('appState')?.i18n?.lang !== this.appState.i18n.lang
    ) {
      this._handleLanguageChanged(this.appState.i18n.lang)
    }
  }
}

window.customElements.define('grampsjs-view-recent', GrampsjsViewRecentObject)
