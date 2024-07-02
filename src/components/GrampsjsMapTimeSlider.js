import {html, css, LitElement} from 'lit'
import '@material/web/slider/slider.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

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
        }

        div.date {
          display: inline-block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.6);
          white-space: nowrap;
          margin-left: 4px;
          margin-right: 14px;
          line-height: 22px;
          height: 22px;
        }

        .date .year {
          font-weight: 600;
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: Number},
    }
  }

  constructor() {
    super()
    this.value = new Date().getFullYear() - 100
  }

  render() {
    return html`
      <div id="container">
        <md-slider
          @change="${this._handleInput}"
          labeled
          min="1500"
          max="${new Date().getFullYear()}"
          value="${this.value}"
        ></md-slider>
        <div class="date">
          <span class="year">${this.value}</span> &pm;
          <span class="tolerance">10</span>
        </div>
      </div>
    `
  }

  _handleInput() {
    const slider = this.renderRoot.querySelector('md-slider')
    const detail = {value: slider.value}
    this.value = slider.value
    fireEvent(this, 'timeslider:change', detail)
  }
}

window.customElements.define('grampsjs-map-time-slider', GrampsjsMapTimeSlider)
