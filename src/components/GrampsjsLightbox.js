import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {chevronLeftIcon, chevronRightIcon, closeIcon} from '../icons.js'

class GrampsjsLightbox extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        #lightbox-container {
          background-color: black;
          position: fixed;
          left: 0;
          top: 0;
          right: 0;
          min-height: 100vh;
          width: 100vw;
          z-index: 10000;
          overflow: auto;
        }

        #lightbox {
          width: 100%;
          position: fixed;
          overflow: hidden;
          top: 0;
          left: 0;
          bottom: 70px;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        #text {
          position: absolute;
          box-sizing: border-box;
          width: 100%;
          top: calc(100vh - 70px);
          left: 0;
          background-color: white;
          z-index: 10002;
          min-height: 70px;
          overflow-x: hidden;
          margin: 0;
        }

        #description-container {
          font-family: var(--grampsjs-heading-font-family);
          height: 70px;
          font-size: 22px;
          line-height: 30px;
          font-weight: 400;
          overflow: hidden;
          padding: 20px;
          text-overflow: ellipsis;
        }

        #button-container {
          float: right;
          height: 70px;
          width: 300px;
          font-size: 22px;
          line-height: 30px;
          font-weight: 400;
          overflow: hidden;
          padding: 20px;
          text-overflow: ellipsis;
          text-align: right;
        }

        #detail-container {
          clear: right;
        }

        .lightbox-nav {
          z-index: 10001;
        }

        .lightbox-nav svg {
          height: 2em;
          width: 2em;
        }

        .lightbox-nav:hover svg path {
          fill: #ffffff;
        }

        .lightbox-nav svg path {
          fill: #aaaaaa;
        }

        #close-lightbox {
          position: fixed;
          right: 1.5em;
          top: 1.5em;
        }

        .arrow {
          position: fixed;
          top: calc(50vh - 45px);
        }

        .arrow-left {
          left: 5vw;
        }

        .arrow-right {
          right: 5vw;
        }

        #media-container {
          position: absolute;
          width: 100%;
          height: 100%;
          text-align: center;
        }
      `,
    ]
  }

  static get properties() {
    return {
      open: {type: Boolean},
      _translateX: {type: Number},
      hideLeftArrow: {type: Boolean},
      hideRightArrow: {type: Boolean},
      disableTouch: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.open = false
    this._translateX = 0
    this.hideLeftArrow = false
    this.hideRightArrow = false
    this.disableTouch = false
  }

  render() {
    if (!this.open) {
      return html``
    }
    return html`
      <div id="lightbox-container" @keydown="${this._handleKeyPress}">
        <div class="lightbox-nav" id="close-lightbox" tabindex="0">
          <span @click="${this._close}" class="link" @keydown=""
            >${closeIcon}</span
          >
        </div>
        ${!this.hideLeftArrow
          ? html`
              <div class="lightbox-nav arrow arrow-left">
                <span @click="${this._handleLeft}" class="link" @keydown=""
                  >${chevronLeftIcon}</span
                >
              </div>
            `
          : ''}
        ${!this.hideRightArrow
          ? html`
              <div class="lightbox-nav arrow arrow-right">
                <span @click="${this._handleRight}" class="link" @keydown=""
                  >${chevronRightIcon}</span
                >
              </div>
            `
          : ''}
        <div
          id="lightbox"
          tabindex="0"
          style="transform: translateX(${this._translateX}px);"
          @touchstart="${this._handleTouchStart}"
          @touchmove="${this._handleTouchMove}"
          @touchend="${this._handleTouchEnd}"
        >
          <slot
            name="image"
            @rect:draw-start="${this._handleRectStart}"
            @rect:draw-end="${this._handleRectEnd}"
          ></slot>
        </div>
        <div id="text" tabindex="0">
          <div id="button-container">
            <slot name="button"></slot>
          </div>
          <div id="description-container">
            <slot name="description"></slot>
          </div>
          <div id="detail-container">
            <slot name="details"></slot>
          </div>
        </div>
      </div>
    `
  }

  _close() {
    this.open = false
  }

  _handleLeft() {
    this.dispatchEvent(
      new CustomEvent('lightbox:left', {
        bubbles: true,
        composed: true,
        detail: {id: this.id},
      })
    )
  }

  _handleRight() {
    this.dispatchEvent(
      new CustomEvent('lightbox:right', {
        bubbles: true,
        composed: true,
        detail: {id: this.id},
      })
    )
  }

  _handleKeyPress(event) {
    if (event.code === 'Escape') {
      this._close()
    } else if (event.key === 'ArrowRight' || event.key === 'Right') {
      this._handleRight()
    } else if (event.key === 'ArrowLeft' || event.key === 'Left') {
      this._handleLeft()
    }
  }

  _handleRectStart(e) {
    this.disableTouch = true
    e.preventDefault()
    e.stopPropagation()
  }

  _handleRectEnd(e) {
    this.disableTouch = false
    e.preventDefault()
    e.stopPropagation()
  }

  _handleTouchStart(e) {
    if (!this.disableTouch) {
      this._touchStartX = e.touches[0].pageX
      this._touchMoveX = this._touchStartX
    }
  }

  _handleTouchMove(e) {
    if (!this.disableTouch) {
      this._touchMoveX = e.touches[0].pageX
      this._translateX = this._touchMoveX - this._touchStartX
    }
  }

  _handleTouchEnd() {
    if (!this.disableTouch) {
      this._translateX = 0
      const movedX = this._touchMoveX - this._touchStartX
      if (movedX < -10) {
        this._handleRight()
      } else if (movedX > 10) {
        this._handleLeft()
      }
    }
  }

  _focus() {
    if (this.open) {
      const lightBox = this.shadowRoot.getElementById('lightbox')
      lightBox.focus()
    }
  }

  updated() {
    this._focus()
  }
}

window.customElements.define('grampsjs-lightbox', GrampsjsLightbox)
