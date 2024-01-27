import {html, css, LitElement} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-icon-button'
import '@material/web/textfield/outlined-text-field'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/switch/switch'

import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {debounce, fireEvent} from '../util.js'

class GrampsjsMapSearchbox extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #details,
        #searchbox,
        #searchresult,
        #filter {
          z-index: 999;
          position: absolute;
          left: 20px;
          border-radius: 5px;
          background-color: white;
          box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2),
            0 -1px 0px rgba(0, 0, 0, 0.02);
        }

        #searchbox {
          width: 350px;
          top: 90px;
          padding: 0px;
          --mdc-text-field-outlined-idle-border-color: rgba(0, 0, 0, 0.2);
          --mdc-text-field-outlined-hover-border-color: rgba(0, 0, 0, 0.38);
          --mdc-text-field-outlined-disabled-border-color: rgba(0, 0, 0, 0.06);
        }

        md-outlined-text-field mwc-icon-button {
          color: rgba(0, 0, 0, 0.5);
        }

        #details,
        #searchresult,
        #filter {
          width: 350px;
          font-size: 14px;
          line-height: 20px;
          overflow-x: hidden;
          overflow-y: scroll;
          scrollbar-width: thin;
        }

        #details-content,
        #filter-content {
          padding-left: 20px;
          padding-right: 20px;
        }

        #details,
        #filter {
          top: 155px;
          padding-top: 15px;
          padding-bottom: 15px;
          max-height: calc(100vh - 210px);
        }

        #searchresult {
          top: 150px;
          max-height: calc(100vh - 170px);
        }

        #details::-webkit-scrollbar,
        #searchresult::-webkit-scrollbar {
          width: 2px;
        }

        #details::-webkit-scrollbar-thumb,
        #searchresult::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.4);
        }

        #searchresult-content {
          font-size: 14px;
        }

        #searchresult-content mwc-list-item {
          --mdc-list-item-graphic-margin: 16px;
        }

        .hidden {
          display: none;
        }

        @media (max-width: 512px) {
          #searchbox {
            left: 0;
            top: 70px;
            width: 100%;
          }

          #details,
          #searchresult {
            left: 0;
            width: 100%;
          }

          #details {
            top: 50vh;
            bottom: 0;
          }

          #searchresult {
            top: 130px;
            max-height: calc(100vh - 160px);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: String},
      data: {type: Array},
      resultsOpen: {type: Boolean},
      detailsOpen: {type: Boolean},
      placeFilters: {type: Object},
      _showClearButton: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.data = []
    this.resultsOpen = false
    this.detailsOpen = false
    this.placeFilters = {}
    this._showClearButton = false
  }

  render() {
    const filterHasBadge = Object.values(this.placeFilters).some(value => value)
    return html`
      <div id="container">
        <div id="searchbox">
          <md-outlined-text-field
            id="searchfield"
            placeholder="${this._('Search')}"
            @keydown="${this._handleKeyDown}"
            @input="${debounce(() => this._handleInput(), 500)}"
            value="${this.value}"
          >
            <div slot="trailing-icon">
              ${this._showClearButton
                ? html`
                    <mwc-icon-button
                      icon="clear"
                      @click="${this._handleClear}"
                    ></mwc-icon-button>
                  `
                : html`
                    <mwc-icon-button
                      icon="search"
                      @click="${this._handleInput}"
                    ></mwc-icon-button>
                  `}
              <div style="position: relative; display: inline-block;">
                ${filterHasBadge
                  ? html`
                      <svg
                        width="20"
                        height="20"
                        xmlns="http://www.w3.org/2000/svg"
                        style="position: absolute; top: 7px; right: 7px;"
                      >
                        <circle cx="15" cy="5" r="5" fill="#BA1B1B" />
                      </svg>
                    `
                  : ''}
                <mwc-icon-button
                  icon="filter_alt"
                  @click="${this._handleFilter}"
                ></mwc-icon-button>
              </div>
            </div>
          </md-outlined-text-field>
        </div>
        ${this.resultsOpen ? this._renderResults() : ''}
        ${this._renderDetails()} ${this._renderFilter()}
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderResults() {
    return html`
      <div id="searchresult">
        <div id="searchresult-content">
          <mwc-list id="searchresult-list" @selected="${this._handleSelected}">
            ${this.data.map(this._renderListItem)}
          </mwc-list>
        </div>
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderListItem(obj) {
    return html`
      <mwc-list-item graphic="icon">
        ${obj.object?.profile?.name || ''}
        <mwc-icon slot="graphic"
          >${obj.object.lat && obj.object.long
            ? 'place'
            : 'location_off'}</mwc-icon
        >
      </mwc-list-item>
    `
  }

  _renderDetails() {
    return html`
      <div id="details" class="${classMap({hidden: !this.detailsOpen})}">
        <div id="details-content">
          <slot @slotchange="${this._handleSlotchange}"></slot>
        </div>
      </div>
    </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderFilter() {
    return html`
      <md-dialog id="filter-dialog">
        <div slot="headline">${this._('Filter')}</div>

        <form slot="content" id="form-id" method="dialog">
          <label>
            ${this._('Only places related to events')}
            <md-switch
              @change="${e => this.toggleFilter(e, 'hasEvent')}"
              ?selected="${!!this.placeFilters.hasEvent}"
            ></md-switch>
          </label>
        </form>

        <div slot="actions">
          <md-text-button form="form-id" value="apply"
            >${this._('OK')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  toggleFilter(e, filter) {
    this.placeFilters[filter] = e.target.selected
    fireEvent(this, 'placefilter:changed', this.placeFilters)
  }

  _handleSlotchange(e) {
    const childNodes = e.target.assignedNodes({flatten: true})
    if (childNodes.length === 0) {
      this.detailsOpen = false
    } else {
      this.detailsOpen = true
    }
  }

  _handleKeyDown(event) {
    if (event.code === 'ArrowDown') {
      const lst = this.renderRoot.querySelector(
        '#searchresult-list > mwc-list-item'
      )
      if (lst) {
        lst.focus()
      }
      event.preventDefault()
      event.stopPropagation()
    } else if (event.code === 'Escape') {
      const query = this.shadowRoot.getElementById('searchfield').value
      if (query === '') {
        this.unfocus()
      } else {
        this._clear()
      }
    }
  }

  _handleInput() {
    const searchbox = this.shadowRoot.getElementById('searchfield')
    const {value} = searchbox
    if (value === '') {
      this._clear()
    } else {
      this._showClearButton = true
      if (value.length >= 2) {
        fireEvent(this, 'mapsearch:input', {value})
      }
    }
  }

  _handleSelected(event) {
    if (this.data.length === 0) {
      return
    }
    const {index} = event.detail
    fireEvent(this, 'mapsearch:selected', {object: this.data[index].object})
    this.detailsOpen = true
  }

  _handleClear() {
    this.clear()
    this.focus()
  }

  _handleFilter() {
    const filter = this.renderRoot.querySelector('#filter-dialog')
    filter.open = true
  }

  _clear() {
    fireEvent(this, 'mapsearch:clear')
    this.detailsOpen = false
    this.resultsOpen = false
    this._showClearButton = false
    const searchbox = this.shadowRoot.getElementById('searchfield')
    if (searchbox) {
      searchbox.value = ''
    }
  }

  firstUpdated() {
    this.focus()
  }

  update(changed) {
    super.update(changed)
    if (changed.has('data'))
      if (this.data.length > 0) {
        this.resultsOpen = true
        this.detailsOpen = false
      } else {
        this.resultsOpen = false
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
      // retry once
      if (retry) {
        window.setTimeout(() => this.focus(false), 100)
      }
    }
  }

  unfocus(retry = true) {
    const el = this.shadowRoot.getElementById('searchfield')
    try {
      el.blur()
    } catch (e) {
      // retry once
      if (retry) {
        window.setTimeout(() => this.unfocus(false), 100)
      }
    }
  }
}

window.customElements.define('grampsjs-map-searchbox', GrampsjsMapSearchbox)
