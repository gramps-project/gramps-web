import {html, css, LitElement} from 'lit'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list'
import '@material/web/list/list-item'

import {mdiClose, mdiMagnify, mdiMapMarker, mdiMapMarkerOff} from '@mdi/js'
import './GrampsjsIcon.js'

import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {debounce, fireEvent} from '../util.js'

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
          max-height: calc(100vh - 200px);
          font-size: 14px;
          line-height: 20px;
        }

        #panel::-webkit-scrollbar {
          width: 2px;
        }

        #panel::-webkit-scrollbar-thumb {
          background: var(--grampsjs-body-font-color-40);
        }

        .panel-section {
          padding: 15px 20px;
        }

        .hidden {
          display: none;
        }

        @media (max-width: 512px) {
          #container {
            left: 12px;
            right: 12px;
            top: 68px;
            width: auto;
          }

          #panel {
            max-height: 50vh;
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
      _panelState: {type: String},
      _showClearButton: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.data = []
    this.year = -1
    this.yearSpan = -1
    this._panelState = 'empty'
    this._showClearButton = false
  }

  render() {
    const panelEmpty = this._panelState === 'empty'
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
            @input="${debounce(() => this._handleInput(), 500)}"
            .value="${this.value}"
          />
          ${this._showClearButton
            ? html`
                <md-icon-button @click="${this._handleClear}">
                  <grampsjs-icon path="${mdiClose}"></grampsjs-icon>
                </md-icon-button>
              `
            : ''}
        </div>

        ${this._renderChips()}

        <div id="panel" class="${classMap({hidden: panelEmpty})}">
          <div class="${classMap({hidden: this._panelState !== 'results'})}">
            <md-list id="searchresult-list">
              ${this.data.map((obj, i) => this._renderListItem(obj, i))}
            </md-list>
          </div>
          <div
            class="panel-section ${classMap({
              hidden: this._panelState !== 'details',
            })}"
          >
            <slot @slotchange="${this._handleSlotchange}"></slot>
          </div>
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

  _renderListItem(obj, i) {
    return html`
      <md-list-item type="button" @click="${() => this._handleSelected(i)}">
        ${obj.object?.profile?.name || ''}
        <grampsjs-icon
          slot="start"
          path="${obj.object.lat && obj.object.long
            ? mdiMapMarker
            : mdiMapMarkerOff}"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  _handleTimechipClear() {
    fireEvent(this, 'searchbox:timechip-clear')
  }

  _handleSlotchange(e) {
    const childNodes = e.target.assignedNodes({flatten: true})
    if (childNodes.length === 0 && this._panelState === 'details') {
      this._panelState = 'empty'
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
    if (value === '') {
      this.clear()
    } else {
      this._showClearButton = true
      if (value.length >= 2) {
        fireEvent(this, 'mapsearch:input', {value})
      }
    }
  }

  _handleSelected(index) {
    if (this.data.length === 0) return
    fireEvent(this, 'mapsearch:selected', {object: this.data[index].object})
    this._panelState = 'details'
  }

  _handleClear() {
    this.clear()
    this.focus()
  }

  clear() {
    fireEvent(this, 'mapsearch:clear')
    this._panelState = 'empty'
    this._showClearButton = false
    const input = this.shadowRoot.getElementById('searchfield')
    if (input) input.value = ''
  }

  showDetails() {
    this._panelState = 'details'
  }

  firstUpdated() {
    this.focus()
  }

  willUpdate(changed) {
    if (changed.has('data')) {
      if (this.data.length > 0) {
        this._panelState = 'results'
      } else if (this._panelState === 'results') {
        this._panelState = 'empty'
      }
    }
    if (changed.has('value') && this.value.length > 0) {
      this._showClearButton = true
    }
  }

  focus(retry = true) {
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
