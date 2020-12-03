/*
An Image thumbnail element.
*/

import { html, css, LitElement } from 'lit-element';

import { sharedStyles } from '../SharedStyles.js';
import { getThumbnailUrl, getThumbnailUrlCropped } from '../api.js'


class GrampsjsImg extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`

      img {
        max-height:100vh;
      }

      .round {
        border-radius: 50%;
      }

      `
    ];
  }

  static get properties() {
    return {
      handle: { type: String },
      size: { type: Number },
      rect: { type: Array },
      circle: { type: Boolean },
      square: { type: Boolean },
      nolink: { type: Boolean },
      mime: {type: String}
  }
}

  constructor() {
    super()
    this.rect = [];
    this.circle = false;
    this.square = false;
    this.nolink = false;
    this.mime = '';
  }

  _renderImage() {
    return html`
      <img
      srcset="${getThumbnailUrl(this.handle, this.size, this.square)},
      ${getThumbnailUrl(this.handle, 1.5 * this.size, this.square)} 1.5x
      ${getThumbnailUrl(this.handle, 2 * this.size, this.square)} 2x"
      src="${getThumbnailUrl(this.handle, 2 * this.size, this.square)}"
      class="${this.circle ? 'round' : ''}"
      @error=${this._errorHandler} alt="">
      `
  }

  _renderImageCropped() {
    return html`
    <img
    srcset="${getThumbnailUrlCropped(this.handle, this.size, this.square)},
    ${getThumbnailUrl(this.handle, 1.5 * this.size, this.square)} 1.5x
    ${getThumbnailUrl(this.handle, 2 * this.size, this.square)} 2x"
    src="${getThumbnailUrl(this.handle, 2 * this.size, this.square)}"
    class="${this.circle ? 'round' : ''}"
    @error=${this._errorHandler} alt="">
    `
  }

  render() {
    const img = (this.rect.length === 0) ? this._renderImage() : this._renderImageCropped()
    return this.nolink ? img : html`<span @click="${this._clickHandler}" class="link">${img}</span>`
  }

  _clickHandler() {
    window.dispatchEvent(new CustomEvent("img:clicked",
      {bubbles: true, composed: true, detail: {handle: this.handle}}))
  }

  _errorHandler() {
    this.dispatchEvent(new CustomEvent('img:error',
      {bubbles: true, composed: true, detail: {handle: this.handle}}));
  }


}

window.customElements.define('grampsjs-img', GrampsjsImg);
