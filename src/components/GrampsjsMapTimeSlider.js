import {html, css, LitElement} from 'lit'
import '@material/web/slider/slider.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/switch/switch'

import {mdiCog} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'
import './GrampsjsTooltip.js'

class GrampsjsMapTimeSlider extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          background-color: var(--md-sys-color-surface-container);
          border-radius: 14px;
          width: 100%;
          position: absolute;
          bottom: 8px;
          height: 24px;
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
          color: var(--grampsjs-body-font-color-60);
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
            <grampsjs-tooltip for="span-button" .appState="${this.appState}"
              >${this._('Span')}</grampsjs-tooltip
            >
            <md-icon
              >${renderIconSvg(mdiCog, 'var(--md-sys-color-primary)')}</md-icon
            >
          </md-icon-button>
        </div>
        <md-switch
          id="filter-switch"
          @input="${this._handleSwitch}"
          ?selected="${this.span > 0}"
        ></md-switch>
        <grampsjs-tooltip for="filter-switch" .appState="${this.appState}"
          >${this._('Toggle time filter for places')}</grampsjs-tooltip
        >
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
