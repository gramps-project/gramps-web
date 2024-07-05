import {html, css, LitElement} from 'lit'
import '@material/web/slider/slider.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/switch/switch'

import {mdiCog} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'

class GrampsjsMapTimeSlider extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          z-index: 999;
          background-color: #ffffff;
          border-radius: 14px;
          width: calc(100% - 150px);
          position: absolute;
          bottom: 25px;
          height: 28px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        md-slider {
          width: 100%;
          --md-slider-active-track-color: var(--md-sys-color-primary);
          --md-slider-inactive-track-color: var(--md-sys-color-primary);
        }

        div.date {
          display: inline-block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.6);
          white-space: nowrap;
          margin-left: 4px;
          margin-right: 8px;
          line-height: 24px;
          height: 24px;
          min-width: 75px;
          text-align: right;
        }

        .date .year {
          font-weight: 600;
        }

        .control {
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-height: 22px;
          --md-icon-button-state-layer-width: 22px;
          height: 22px;
          width: 22px;
          display: inline-block;
        }

        md-menu {
          --md-menu-item-one-line-container-height: 48px;
        }

        md-switch {
          transform: scale(0.5);
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: Number},
      span: {type: Number},
      min: {type: Number},
      filterMap: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.min = 1500
    this.value = new Date().getFullYear() - 50
    this.span = 50
    this.filterMap = false
  }

  render() {
    return html`
      <div id="container">
        <md-slider
          @input="${this._handleInput}"
          ?disabled="${!this.filterMap && this.span < 0}"
          labeled
          min="${this.min}"
          max="${new Date().getFullYear()}"
          value="${this.value}"
        ></md-slider>
        <div class="date">
          ${!this.filterMap && this.span < 0
            ? ''
            : html` <span class="year">${this.value}</span>`}
          ${this.span > 0
            ? html`&pm; <span class="span">${this.span}</span>`
            : ''}
        </div>
        <div class="control">
          <md-icon-button
            id="span-button"
            @click="${this._handleSpanClick}"
            ?disabled="${this.span < 0}"
          >
            <md-icon
              >${renderIconSvg(mdiCog, 'var(--md-sys-color-primary)')}</md-icon
            >
          </md-icon-button>
        </div>
        <md-switch
          @input="${this._handleSwitch}"
          ?selected="${this.span > 0}"
        ></md-switch>
      </div>
      <md-menu
        positioning="fixed"
        id="span-menu"
        anchor="span-button"
        skip-restore-focus
      >
        ${[1, 10, 25, 50, 100].map(
          years => html`
            <md-menu-item @click="${() => this._handleSpanYearsClick(years)}">
              <div slot="headline">&pm;&nbsp;${years}</div>
            </md-menu-item>
          `
        )}
      </md-menu>
    `
  }

  _fireEvent() {
    const detail = {
      value: this.value,
      span: this.span,
    }
    fireEvent(this, 'timeslider:change', detail)
  }

  connectedCallback() {
    super.connectedCallback()
    this._fireEvent()
  }

  _handleSwitch() {
    const el = this.renderRoot.querySelector('md-switch')
    if (el.selected !== this.span > 0) {
      this.span = -this.span
    }
    this._fireEvent()
  }

  _handleSpanYearsClick(years) {
    this.span = years
    this._fireEvent()
  }

  _handleSpanClick() {
    const menu = this.renderRoot.querySelector('#span-menu')
    menu.open = true
  }

  _handleInput() {
    const slider = this.renderRoot.querySelector('md-slider')
    this.value = slider.value
    this._fireEvent()
  }
}

window.customElements.define('grampsjs-map-time-slider', GrampsjsMapTimeSlider)
