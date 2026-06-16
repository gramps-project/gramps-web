import {html, css, LitElement} from 'lit'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list'
import '@material/web/list/list-item'

import {
  mdiAccount,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiEarth,
  mdiMagnify,
  mdiMapMarker,
  mdiMapMarkerOff,
} from '@mdi/js'
import './GrampsjsIcon.js'
import './GrampsjsButtonToggle.js'

import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {debounce, fireEvent} from '../util.js'

const PANEL_EMPTY = 'empty'
const PANEL_RESULTS = 'results'
const PANEL_DETAILS = 'details'

export const TYPE_PERSON = 'person'
export const TYPE_PLACE = 'place'
export const TYPE_EXTERNAL = 'external'
export const DEFAULT_SEARCH_FILTER = `${TYPE_PLACE},${TYPE_PERSON}`

class GrampsjsMapSearchbox extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          position: absolute;
          left: 20px;
          top: 90px;
          z-index: 999;
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        #searchbar {
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: 9999px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          padding: 0 4px 0 16px;
          height: 48px;
          gap: 4px;
        }

        #searchfield {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          outline: none;
          font-size: 16px;
          font-family: inherit;
          color: var(--md-sys-color-on-surface);
          caret-color: var(--md-sys-color-primary);
        }

        #searchfield::placeholder {
          color: var(--md-sys-color-on-surface-variant);
          opacity: 0.7;
        }

        #searchfield::-webkit-search-cancel-button {
          display: none;
        }

        #chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 4px;
        }

        #filter-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 12px 16px 4px;
          position: sticky;
          top: 0;
          background: var(--md-sys-color-surface-container-high);
          z-index: 1;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid var(--md-sys-color-outline);
          background: transparent;
          color: var(--md-sys-color-on-surface-variant);
          transition: background 0.1s;
          line-height: 1;
        }

        .chip:hover {
          background: var(--md-sys-color-surface-variant);
        }

        .chip.active {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          border-color: transparent;
        }

        .chip-close {
          font-size: 15px;
          line-height: 1;
          margin-left: 2px;
          opacity: 0.7;
        }

        #panel {
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.08);
          overflow-x: hidden;
          overflow-y: auto;
          scrollbar-width: thin;
          max-height: calc(100vh - 240px);
          font-size: 14px;
          line-height: 20px;
        }

        #panel::-webkit-scrollbar {
          width: 2px;
        }

        #panel::-webkit-scrollbar-thumb {
          background: var(--grampsjs-body-font-color-40);
        }

        .attribution {
          font-size: 0.8em;
          color: var(--md-sys-color-on-surface-variant);
          text-align: right;
          padding: 6px 16px 10px;
          opacity: 0.6;
        }

        .attribution a:link,
        .attribution a:hover,
        .attribution a:visited {
          color: inherit;
        }

        .panel-section {
          padding: 15px 20px;
        }

        .hidden {
          display: none;
        }

        #collapse-toggle {
          display: none;
        }

        @media (max-width: 512px) {
          #container {
            left: 12px;
            right: 12px;
            top: 68px;
            width: auto;
            z-index: 4;
          }

          #panel {
            max-height: 50vh;
            transition: max-height 0.25s ease;
          }

          #panel.collapsed {
            max-height: 0;
            overflow: hidden;
          }

          #collapse-toggle {
            display: flex;
            justify-content: center;
            padding: 2px 0;
          }

          #collapse-toggle.hidden {
            display: none;
          }

          #collapse-toggle button {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            background: var(--md-sys-color-surface-container-high);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: String},
      data: {type: Array},
      year: {type: Number},
      yearSpan: {type: Number},
      _activeFilter: {type: String},
      _panelState: {type: String},
      _collapsed: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.data = []
    this.year = -1
    this.yearSpan = -1
    this._activeFilter = DEFAULT_SEARCH_FILTER
    this._panelState = PANEL_EMPTY
    this._collapsed = false
    this._debouncedHandleInput = debounce(() => this._handleInput(), 500)
  }

  render() {
    const panelEmpty = this._panelState === PANEL_EMPTY
    const showClearButton = this.value.length > 0
    return html`
      <div id="container">
        <div id="searchbar">
          <grampsjs-icon
            path="${mdiMagnify}"
            color="var(--md-sys-color-on-surface-variant)"
          ></grampsjs-icon>
          <input
            id="searchfield"
            type="search"
            placeholder="${this._('Search')}"
            @keydown="${this._handleKeyDown}"
            @input="${this._debouncedHandleInput}"
            .value="${this.value}"
          />
          ${showClearButton
            ? html`
                <md-icon-button @click="${this._handleClear}">
                  <grampsjs-icon path="${mdiClose}"></grampsjs-icon>
                </md-icon-button>
              `
            : ''}
        </div>

        ${this._renderChips()}

        <div
          id="panel"
          class="${classMap({hidden: panelEmpty, collapsed: this._collapsed})}"
        >
          <div
            class="${classMap({hidden: this._panelState !== PANEL_RESULTS})}"
          >
            ${this._renderFilterPills()}
            ${this.data.length === 0
              ? html`<div class="panel-section">${this._('Not found')}</div>`
              : html`<md-list id="searchresult-list">
                  ${this.data.map((obj, i) => this._renderListItem(obj, i))}
                </md-list>`}
            ${this._activeFilter === TYPE_EXTERNAL && this.data.length > 0
              ? html`<div class="attribution">
                  <a href="https://nominatim.openstreetmap.org/"
                    >OpenStreetMap Nominatim</a
                  >
                </div>`
              : ''}
          </div>
          <div
            class="panel-section ${classMap({
              hidden: this._panelState !== PANEL_DETAILS,
            })}"
          >
            <slot @slotchange="${this._handleSlotchange}"></slot>
          </div>
        </div>
        <div
          id="collapse-toggle"
          class="${classMap({hidden: this._panelState !== PANEL_DETAILS})}"
        >
          <button
            aria-label="${this._collapsed
              ? this._('Expand')
              : this._('Collapse')}"
            @click="${() => {
              this._collapsed = !this._collapsed
            }}"
          >
            <grampsjs-icon
              path="${this._collapsed ? mdiChevronDown : mdiChevronUp}"
              color="var(--md-sys-color-on-surface-variant)"
            ></grampsjs-icon>
          </button>
        </div>
      </div>
    `
  }

  _renderChips() {
    const timeActive = this.year > 0 && this.yearSpan > 0
    if (!timeActive) return ''
    return html`
      <div id="chips">
        <button class="chip active" @click="${this._handleTimechipClear}">
          ${this.year} &pm;${this.yearSpan}
          <span class="chip-close">&times;</span>
        </button>
      </div>
    `
  }

  _renderFilterPills() {
    return html`
      <div id="filter-pills">
        <grampsjs-button-toggle
          label="${this._('Places')}"
          .iconPath="${mdiMapMarker}"
          ?checked="${this._activeFilter.split(',').includes(TYPE_PLACE)}"
          .appState="${this.appState}"
          @grampsjs-button-toggle:toggle="${() =>
            this._handleFilterToggle(TYPE_PLACE)}"
        ></grampsjs-button-toggle>
        <grampsjs-button-toggle
          label="${this._('People')}"
          .iconPath="${mdiAccount}"
          ?checked="${this._activeFilter.split(',').includes(TYPE_PERSON)}"
          .appState="${this.appState}"
          @grampsjs-button-toggle:toggle="${() =>
            this._handleFilterToggle(TYPE_PERSON)}"
        ></grampsjs-button-toggle>
        <grampsjs-button-toggle
          label="${this._('External')}"
          .iconPath="${mdiEarth}"
          ?checked="${this._activeFilter === TYPE_EXTERNAL}"
          .appState="${this.appState}"
          @grampsjs-button-toggle:toggle="${() =>
            this._handleFilterToggle(TYPE_EXTERNAL)}"
        ></grampsjs-button-toggle>
      </div>
    `
  }

  _handleFilterToggle(type) {
    let filter
    if (type === TYPE_EXTERNAL) {
      filter =
        this._activeFilter === TYPE_EXTERNAL
          ? DEFAULT_SEARCH_FILTER
          : TYPE_EXTERNAL
    } else {
      const active = new Set(this._activeFilter.split(',').filter(Boolean))
      active.delete(TYPE_EXTERNAL)
      if (active.has(type)) {
        active.delete(type)
      } else {
        active.add(type)
      }
      filter = active.size === 0 ? DEFAULT_SEARCH_FILTER : [...active].join(',')
    }
    this._activeFilter = filter
    fireEvent(this, 'mapsearch:filter-change', {filter})
  }

  _listItemMeta(obj) {
    if (obj.object_type === TYPE_PERSON) {
      return {
        label:
          [obj.object?.profile?.name_given, obj.object?.profile?.name_surname]
            .filter(Boolean)
            .join(' ') ||
          obj.object?.profile?.name ||
          '',
        supportingText: '',
        iconPath: mdiAccount,
      }
    }
    if (obj.object_type === TYPE_EXTERNAL) {
      return {
        label: obj.object?.name || obj.object?.display_name || '',
        supportingText: obj.object?.name ? obj.object.display_name : '',
        iconPath: mdiEarth,
      }
    }
    return {
      label: obj.object?.profile?.name || '',
      supportingText: '',
      iconPath:
        obj.object?.profile?.lat != null && obj.object?.profile?.long != null
          ? mdiMapMarker
          : mdiMapMarkerOff,
    }
  }

  _renderListItem(obj, i) {
    const {label, supportingText, iconPath} = this._listItemMeta(obj)
    return html`
      <md-list-item type="button" @click="${() => this._handleSelected(i)}">
        ${label}
        <grampsjs-icon slot="start" path="${iconPath}"></grampsjs-icon>
        ${supportingText
          ? html`<span slot="supporting-text">${supportingText}</span>`
          : ''}
      </md-list-item>
    `
  }

  _handleTimechipClear() {
    fireEvent(this, 'searchbox:timechip-clear')
  }

  _handleSlotchange(e) {
    const childNodes = e.target.assignedNodes({flatten: true})
    if (childNodes.length === 0 && this._panelState === PANEL_DETAILS) {
      this._panelState = PANEL_EMPTY
    }
  }

  _handleKeyDown(event) {
    if (event.code === 'ArrowDown') {
      const lst = this.renderRoot.querySelector(
        '#searchresult-list > md-list-item'
      )
      if (lst) {
        lst.focus()
      }
      event.preventDefault()
      event.stopPropagation()
    } else if (event.code === 'Escape') {
      const input = this.shadowRoot.getElementById('searchfield')
      if (input.value === '') {
        this.unfocus()
      } else {
        this.clear()
      }
    }
  }

  _handleInput() {
    const input = this.shadowRoot.getElementById('searchfield')
    const {value} = input
    this.value = value
    if (value === '') {
      this.clear()
    } else {
      if (value.length >= 2) {
        fireEvent(this, 'mapsearch:input', {value})
      }
    }
  }

  _handleSelected(index) {
    if (this.data.length === 0) return
    const item = this.data[index]
    fireEvent(this, 'mapsearch:selected', {
      object: item.object,
      object_type: item.object_type,
    })
    this._panelState =
      item.object_type === TYPE_EXTERNAL ? PANEL_EMPTY : PANEL_DETAILS
  }

  _handleClear() {
    this.clear()
    this.focus()
  }

  setResults(results) {
    this.data = results
    if (results.length > 0) this._collapsed = false
    this._panelState = PANEL_RESULTS
  }

  clear() {
    fireEvent(this, 'mapsearch:clear')
    this.value = ''
    this.data = []
    this._activeFilter = DEFAULT_SEARCH_FILTER
    this._panelState = PANEL_EMPTY
    this._collapsed = false
  }

  showDetails() {
    this._panelState = PANEL_DETAILS
  }

  firstUpdated() {
    this.focus()
  }

  focus(retry = true) {
    // No-op on touch devices to avoid popping the on-screen keyboard;
    // pointer: fine is the best available proxy for "has a physical keyboard".
    if (!window.matchMedia?.('(pointer: fine)').matches) return
    const el = this.shadowRoot.getElementById('searchfield')
    try {
      el.focus()
    } catch (e) {
      if (retry) window.setTimeout(() => this.focus(false), 100)
    }
  }

  unfocus(retry = true) {
    const el = this.shadowRoot.getElementById('searchfield')
    try {
      el.blur()
    } catch (e) {
      if (retry) window.setTimeout(() => this.unfocus(false), 100)
    }
  }
}

window.customElements.define('grampsjs-map-searchbox', GrampsjsMapSearchbox)
