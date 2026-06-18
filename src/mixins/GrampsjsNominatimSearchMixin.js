import {html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/progress/circular-progress.js'

import {mdiDotsHorizontal, mdiMagnify} from '@mdi/js'

import {queryNominatim} from '../api.js'

export const nominatimSearchStyles = css`
  .search-results {
    clear: left;
    padding: 1em 0em;
  }

  .search-results {
    border-top: 1px solid var(--grampsjs-body-font-color-10);
  }

  .search-result {
    padding: 0.5em 0;
    border-bottom: 1px solid var(--grampsjs-body-font-color-10);
  }

  .search-result button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: inherit;
    text-align: left;
    width: 100%;
  }

  .attribution {
    font-size: 0.8em;
    color: var(--grampsjs-body-font-color-40);
    text-align: right;
  }

  .attribution a:link,
  .attribution a:hover,
  .attribution a:visited {
    color: var(--grampsjs-body-font-color-40);
  }
`

export const GrampsjsNominatimSearchMixin = superclass =>
  class extends superclass {
    static get properties() {
      return {
        ...super.properties,
        searchRes: {type: Array},
        searchResLoading: {type: Boolean},
        showMore: {type: Boolean},
        _searchFieldValue: {type: String},
      }
    }

    constructor() {
      super()
      this.searchRes = []
      this.searchResLoading = false
      this.showMore = false
      this._searchFieldValue = ''
    }

    _handleSearchField(e) {
      this._searchFieldValue = e.detail.data
    }

    _handleSearchKey(event) {
      if (event.code === 'Enter') {
        this._executeSearch()
        event.preventDefault()
        event.stopPropagation()
      }
    }

    async _executeSearch() {
      this.showMore = false
      if (this._searchFieldValue) {
        this.searchResLoading = true
        const res = await queryNominatim(this._searchFieldValue)
        this.searchResLoading = false
        this.searchRes = res.data || []
      } else {
        this.searchRes = []
      }
    }

    _handleShowMore() {
      this.showMore = true
    }

    // Override in subclass to handle a selected Nominatim result.
    // eslint-disable-next-line no-unused-vars
    _handleResClick(res) {}

    _renderSearchBox() {
      return html`
        <div>
          <div style="width:calc(100% - 60px);float:left;">
            <grampsjs-form-string
              @formdata:changed="${this._handleSearchField}"
              @keydown="${this._handleSearchKey}"
              id="geocode"
              label="${this._('Search %s', 'OpenStreetMap')}"
              fullwidth
            ></grampsjs-form-string>
          </div>
          <div style="float:left;padding:5px;">
            <md-icon-button
              @click="${this._executeSearch}"
              aria-label="${this._('Search')}"
            >
              <grampsjs-icon path="${mdiMagnify}"></grampsjs-icon>
            </md-icon-button>
          </div>
        </div>
      `
    }

    _renderSearchResults() {
      if (this.searchResLoading) {
        return html`<div class="search-results">
          <md-circular-progress indeterminate></md-circular-progress>
        </div>`
      }
      if (this.searchRes.length === 0) {
        return html`<div class="search-results"></div>`
      }
      return html`<div class="search-results">
        ${this.searchRes
          .slice(0, this.showMore ? this.searchRes.length : 3)
          .map(
            res => html`
              <div class="search-result">
                <button @click=${() => this._handleResClick(res)}>
                  ${res.display_name}
                </button>
              </div>
            `
          )}
        ${this.showMore || this.searchRes.length <= 3
          ? ''
          : html`
              <md-icon-button
                @click="${this._handleShowMore}"
                aria-label="${this._('Show more')}"
              >
                <grampsjs-icon path="${mdiDotsHorizontal}"></grampsjs-icon>
              </md-icon-button>
            `}
        <div class="attribution">
          <a href="https://nominatim.openstreetmap.org/"
            >OpenStreetMap Nominatim</a
          >
        </div>
      </div>`
    }
  }
