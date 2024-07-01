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
      `,
    ]
  }

  render() {
    return html`
      <div id="container">
        <md-slider
          @change="${this._handleInput}"
          range
          labeled
          min="1500"
          max="2024"
          value-start="1924"
          value-end="2024"
        ></md-slider>
      </div>
    `
  }

  _handleInput() {
    const slider = this.renderRoot.querySelector('md-slider')
    const detail = {start: slider.valueStart, end: slider.valueEnd}
    fireEvent(this, 'timeslider:change', detail)
  }
}

window.customElements.define('grampsjs-map-time-slider', GrampsjsMapTimeSlider)
