/* eslint-disable lit-a11y/click-events-have-key-events */
import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-icon-button'
import '@material/mwc-dialog'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

class GrampsjsRectContainer extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #rect-container {
          display: inline-block;
          position: relative;
          overflow: hidden;
        }

        .draw {
          cursor: crosshair;
        }
      `,
    ]
  }

  static get properties() {
    return {
      draw: {type: Boolean},
      _drawActive: {type: Boolean},
      _drawStart: {type: Array},
      _drawEnd: {type: Array},
    }
  }

  constructor() {
    super()
    this.draw = false
    this._drawActive = false
    this._drawStart = []
    this._drawEnd = []
  }

  render() {
    return html`
      <div
        id="rect-container"
        class="${classMap({draw: this.draw})}"
        @pointerdown="${this._handleDown}"
        @pointerup="${this._handleUp}"
        @pointermove="${this._handleMove}"
        @pointerleave="${this._handleUp}"
      >
        <slot name="image"></slot>
        ${this.draw ? '' : html`<slot></slot>`}
      </div>
    `
  }

  _handleDown(e) {
    e.preventDefault()
    e.stopPropagation()
    this._drawActive = true
    this._drawStart = this._getRelativeCoords(e)
  }

  _handleUp() {
    if (!this._drawActive) {
      return
    }
    this._drawActive = false
  }

  _handleMove(e) {
    if (!this._drawActive) {
      return
    }
    const coords = this._getRelativeCoords(e)
    if (coords && this._drawStart) {
      const [x1, y1] = coords
      const [x0, y0] = this._drawStart
      const left = Math.round(Math.max(0, Math.min(x0, x1)))
      const right = Math.round(Math.min(Math.max(x0, x1), 100))
      const top = Math.round(Math.max(0, Math.min(y0, y1)))
      const bottom = Math.round(Math.min(Math.max(y0, y1), 100))
      fireEvent(this, 'rect:draw', {rect: [left, top, right, bottom]})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getRelativeCoords(e) {
    const img = this.renderRoot.querySelector('#rect-container')
    if (img) {
      const rect = img.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      return [x, y]
    }
    return null
  }
}

window.customElements.define('grampsjs-rect-container', GrampsjsRectContainer)
