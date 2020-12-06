import { html, css, LitElement } from 'lit-element';

import { sharedStyles } from '../SharedStyles.js';
import { closeIcon } from '../icons.js';


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
        pointer-events: none;
      }

      #text {
        position: absolute;
        box-sizing: border-box;
        width: 100%;
        top: calc(100vh - 70px);
        left: 0;
        background-color: white;
        z-index: 10001;
        min-height: 70px;
        overflow-x: hidden;
        padding: 20px;
        margin: 0;
      }

      #description-container {
        height: 70px;
        font-size: 22px;
        line-height: 30px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
      }


      #button-container {
        float: right;
        height: 70px;
        width: 200px;
        font-size: 22px;
        line-height: 30px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #detail-container {
        clear: right;
      }

      #close-lightbox svg {
        height: 2em;
        width: 2em;
      }

      #close-lightbox:hover svg path {
        fill: #ffffff;
      }

      #close-lightbox svg path {
        fill: #aaaaaa;
      }

      #close-lightbox {
        position: fixed;
        right: 1.5em;
        top: 1.5em;
      }
      `
    ]
  }

  static get properties() {
    return {
      open: { type: Boolean }
    }
  }

  constructor() {
    super();
    this.open = false;
  }

  render() {
    if (!this.open) {
      return html``
    }
    return html`
    <div id="lightbox-container" @keydown="${this._handleKeyPress}">
      <div id="close-lightbox" tabindex="0">
        <span @click="${this._close}" class="link">${closeIcon}</span>
      </div>
      <div id="lightbox" tabindex="0">
        <slot name="image"></slot>
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
    this.open = false;
  }

  _handleKeyPress(event) {
    if(event.code === 'Escape') {
        this._close()
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

window.customElements.define('grampsjs-lightbox', GrampsjsLightbox);
