import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-icon-button'
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
        #searchresult {
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

        #searchbox mwc-textfield {
          width: 100%;
        }

        #searchbutton {
          z-index: 1000;
          position: absolute;
          right: 10px;
          top: 5px;
        }

        #searchbutton {
          color: rgba(0, 0, 0, 0.4);
        }

        #details,
        #searchresult {
          width: 350px;
          font-size: 14px;
          line-height: 20px;
          overflow-x: hidden;
          overflow-y: scroll;
          scrollbar-width: thin;
        }

        #details-content {
          padding-left: 20px;
          padding-right: 20px;
        }

        #details {
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
      _showClearButton: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.value = ''
    this.data = []
    this.resultsOpen = false
    this.detailsOpen = false
    this._showClearButton = false
  }

  render() {
    return html`
      <div id="container">
        <div id="searchbox">
          <mwc-textfield
            id="searchfield"
            outlined
            @keydown="${this._handleKeyDown}"
            @input="${debounce(() => this._handleInput(), 500)}"
            value="${this.value}"
          ></mwc-textfield>
          <div id="searchbutton">
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
          </div>
        </div>
        ${this.resultsOpen ? this._renderResults() : ''}
        ${this._renderDetails()}
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

  // eslint-disable-next-line class-methods-use-this
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
    } else if (event.code === 'Escape') {
      const query = this.shadowRoot.getElementById('searchfield').value
      if (query === '') {
        this.unfocus()
      } else {
        this._clear()
      }
    } else {
      return
    }
    event.preventDefault()
    event.stopPropagation()
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
    this._clear()
    this.focus()
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
