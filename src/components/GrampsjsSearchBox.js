/*
The search field in the top app bar. While typing, it shows the first
results in a panel below it; Enter, or "Show all", opens the search page with
the query.

Arrow down moves from the field into the results, Escape closes the panel,
and a second Escape clears the field. It fires `search-box:done` once the
user has left for a result or the search page, or has cancelled.
*/

import {LitElement, html, css} from 'lit'
import {mdiMagnify} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  debounce,
  fireEvent,
  objectIconPath,
  objectTypeToEndpoint,
  prefixSearchQuery,
  primaryObjectTypes,
} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsSearchResultList.js'

function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

// The number of results in the panel
const RESULT_COUNT = 8

// Shorter queries only run on Enter, as on the search page
const MIN_QUERY_LENGTH = 2

export class GrampsjsSearchBox extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          position: relative;
          display: block;
        }

        form {
          display: flex;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
          height: 40px;
          padding: 0 16px 0 12px;
          border-radius: 20px;
          background-color: var(--grampsjs-field-color);
          color: var(--md-sys-color-on-surface-variant);
        }

        form:focus-within {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: -2px;
        }

        input {
          flex: 1 1 auto;
          min-width: 0;
          border: none;
          outline: none;
          background: none;
          font: inherit;
          font-size: 15px;
          color: var(--md-sys-color-on-surface);
        }

        input::placeholder {
          color: var(--md-sys-color-on-surface-variant);
        }

        input::-webkit-search-cancel-button {
          display: none;
        }

        .panel {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 1;
          box-sizing: border-box;
          width: 440px;
          min-width: 100%;
          max-width: calc(100vw - 16px);
          max-height: min(70vh, 600px);
          overflow-y: auto;
          padding: 4px 0;
          border-radius: 12px;
          background-color: var(--grampsjs-popover-color);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12),
            0 1px 3px rgba(0, 0, 0, 0.08);
          --md-list-container-color: transparent;
        }

        /* on small screens, the panel spans the window below the bar */
        :host([fullwidth]) .panel {
          position: fixed;
          top: calc(var(--grampsjs-app-bar-height, 56px) + 4px);
          left: 8px;
          right: 8px;
          width: auto;
          max-width: none;
        }

        /* the object types to search, all when none is selected */
        .types {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 4px 8px 8px 8px;
        }

        .types button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 32px;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: none;
          color: var(--grampsjs-text-secondary-color);
          cursor: pointer;
          outline: none;
        }

        .types button:hover {
          background-color: var(--grampsjs-body-font-color-5);
        }

        .types button[aria-pressed='true'] {
          background-color: var(--grampsjs-tonal-color);
          color: var(--grampsjs-on-tonal-color);
        }

        .types button:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: -2px;
        }

        a.all,
        a.all:link,
        a.all:visited {
          display: block;
          padding: 10px 16px;
          border-radius: 8px;
          margin: 0 4px;
          font-size: 14px;
          font-weight: var(--grampsjs-font-weight-medium);
          color: var(--grampsjs-on-tonal-color);
          text-decoration: none;
          outline: none;
        }

        a.all:hover,
        a.all:focus-visible {
          background-color: var(--grampsjs-body-font-color-5);
        }

        a.all:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: -2px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      fullwidth: {type: Boolean, reflect: true},
      _query: {state: true},
      _results: {state: true},
      _total: {state: true},
      _loading: {state: true},
      _open: {state: true},
      _types: {state: true},
    }
  }

  constructor() {
    super()
    this.fullwidth = false
    this._query = ''
    this._results = []
    this._total = -1
    this._loading = false
    this._open = false
    // the selected object types, kept from one search to the next
    this._types = []
    // Incremented per request; responses of older requests are dropped
    this._searchId = 0
    this._debouncedSearch = debounce(() => this._search(), 300)
  }

  render() {
    return html`
      <form
        role="search"
        @submit="${this._handleSubmit}"
        @focusout="${this._handleFocusOut}"
      >
        <grampsjs-icon
          path="${mdiMagnify}"
          color="currentColor"
          height="20"
          width="20"
        ></grampsjs-icon>
        <input
          id="search-input"
          type="search"
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          placeholder="${this._('Search')}"
          aria-label="${this._('Search')}"
          aria-expanded="${this._open ? 'true' : 'false'}"
          aria-controls="results"
          .value="${this._query}"
          @input="${this._handleInput}"
          @focus="${this._handleFocus}"
          @keydown="${this._handleInputKey}"
        />
      </form>
      ${this._open ? this._renderPanel() : ''}
    `
  }

  _renderPanel() {
    return html`
      <div
        class="panel"
        id="results"
        @click="${this._handlePanelClick}"
        @keydown="${this._handlePanelKey}"
        @focusout="${this._handleFocusOut}"
      >
        ${this._renderTypes()}
        <grampsjs-search-result-list
          .data="${this._results}"
          .appState="${this.appState}"
          ?loading="${this._loading && this._results.length === 0}"
          numberLoading="3"
          textEmpty="${this._total === 0 ? this._('None') : ''}"
          linked
        ></grampsjs-search-result-list>
        ${this._total > this._results.length
          ? html`<a class="all" href="/search" @click="${this._handleShowAll}"
              >${this._('Show all')} (${this._total})</a
            >`
          : ''}
      </div>
    `
  }

  _renderTypes() {
    return html`
      <div class="types" role="group" aria-label="${this._('Filter')}">
        ${primaryObjectTypes.map(type => {
          const label = this._(capitalize(objectTypeToEndpoint[type]))
          return html`<button
            type="button"
            title="${label}"
            aria-label="${label}"
            aria-pressed="${this._types.includes(type) ? 'true' : 'false'}"
            @click="${() => this._toggleType(type)}"
          >
            <grampsjs-icon
              path="${objectIconPath[type]}"
              color="currentColor"
              height="18"
              width="18"
            ></grampsjs-icon>
          </button>`
        })}
      </div>
    `
  }

  _toggleType(type) {
    this._types = this._types.includes(type)
      ? this._types.filter(selected => selected !== type)
      : [...this._types, type]
    if (this._hasQuery) {
      this._loading = true
      this._search()
    }
  }

  focus() {
    this.renderRoot.getElementById('search-input')?.focus()
  }

  get _hasQuery() {
    return this._query.trim().length >= MIN_QUERY_LENGTH
  }

  _handleInput(event) {
    this._query = event.target.value
    if (this._hasQuery) {
      this._loading = true
      this._open = true
      this._debouncedSearch()
    } else {
      this._reset(false)
    }
  }

  _handleFocus() {
    if (this._hasQuery && (this._results.length || this._loading)) {
      this._open = true
    }
  }

  // Closes the panel once the focus has left the field and the results; the
  // focus may still be moving between them when the event fires
  _handleFocusOut() {
    window.setTimeout(() => {
      if (!this.matches(':focus-within')) {
        this._open = false
        if (!this._query) {
          fireEvent(this, 'search-box:done')
        }
      }
    })
  }

  _handleInputKey(event) {
    if (event.key === 'Escape') {
      if (this._open) {
        this._open = false
      } else {
        this._reset(true)
        event.target.blur()
        fireEvent(this, 'search-box:done')
      }
    } else if (event.key === 'ArrowDown' && this._open) {
      event.preventDefault()
      this._focusFirstResult()
    }
  }

  _handlePanelKey(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      this._open = false
      this.focus()
    }
  }

  async _focusFirstResult() {
    const list = this.renderRoot.querySelector('grampsjs-search-result-list')
    await list?.updateComplete
    const item = list?.renderRoot.querySelector('md-list-item[type="link"]')
    if (item) {
      item.focus()
    } else {
      this.renderRoot.querySelector('a.all')?.focus()
    }
  }

  // A result is a link the router follows; the search is done then
  _handlePanelClick(event) {
    const followed = event
      .composedPath()
      .some(el => el.localName === 'md-list-item' && el.type === 'link')
    if (followed) {
      this._reset(true)
      fireEvent(this, 'search-box:done')
    }
  }

  _handleShowAll(event) {
    event.preventDefault()
    this._openSearchPage()
  }

  _handleSubmit(event) {
    event.preventDefault()
    this._openSearchPage()
  }

  // Opens the search page with the query, and leaves the field empty for the
  // next search
  _openSearchPage() {
    const query = this._query.trim()
    this._reset(true)
    this.renderRoot.getElementById('search-input')?.blur()
    fireEvent(this, 'nav', {path: 'search'})
    if (query) {
      fireEvent(window, 'search:query', {query, types: this._types})
    }
    fireEvent(this, 'search-box:done')
  }

  _reset(clearQuery) {
    if (clearQuery) {
      this._query = ''
    }
    this._searchId += 1
    this._results = []
    this._total = -1
    this._loading = false
    this._open = false
  }

  async _search() {
    if (!this._hasQuery) {
      return
    }
    this._searchId += 1
    const searchId = this._searchId
    const params = new URLSearchParams({
      query: prefixSearchQuery(this._query),
      locale: this.appState.i18n.lang || 'en',
      profile: 'all',
      page: 1,
      pagesize: RESULT_COUNT,
      type: (this._types.length ? this._types : primaryObjectTypes).join(','),
    })
    const data = await this.appState.apiGet(`/api/search/?${params}`)
    if (searchId !== this._searchId) {
      return
    }
    this._loading = false
    if ('data' in data) {
      this._results = data.data
      this._total = parseInt(data.total_count, 10)
    } else {
      this._results = []
      this._total = 0
    }
  }
}

window.customElements.define('grampsjs-search-box', GrampsjsSearchBox)
