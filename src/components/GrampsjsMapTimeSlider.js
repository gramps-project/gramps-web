import {html, css, LitElement} from 'lit'
import '@material/web/slider/slider.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

// Selects the year of the map view: the date of the historical map and the
// centre of the time filter. Shows the filtered range while the time filter is
// on, the year otherwise. Disabled while neither uses the year.
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
          font-weight: 600;
          color: var(--grampsjs-body-font-color-60);
          white-space: nowrap;
          margin-left: 4px;
          margin-right: 12px;
          line-height: 24px;
          height: 24px;
          min-width: 75px;
          text-align: right;
        }

        :host([disabled]) div.date {
          opacity: 0.38;
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: Number},
      span: {type: Number},
      timeFilter: {type: Boolean},
      disabled: {type: Boolean, reflect: true},
      min: {type: Number},
    }
  }

  constructor() {
    super()
    this.min = 1500
    this.value = new Date().getFullYear() - 50
    this.span = 50
    this.timeFilter = false
    this.disabled = false
  }

  render() {
    return html`
      <div id="container">
        <md-slider
          @input="${this._handleInput}"
          labeled
          ?disabled="${this.disabled}"
          min="${this.min}"
          max="${new Date().getFullYear()}"
          value="${this.value}"
        ></md-slider>
        <div class="date">
          ${this.timeFilter
            ? `${this.value - this.span}–${this.value + this.span}`
            : this.value}
        </div>
      </div>
    `
  }

  _handleInput() {
    const slider = this.renderRoot.querySelector('md-slider')
    fireEvent(this, 'timeslider:change', {value: slider.value})
  }
}

window.customElements.define('grampsjs-map-time-slider', GrampsjsMapTimeSlider)
