/*
An Image thumbnail element.
*/

import {html, css, LitElement} from 'lit-element'

import {sharedStyles} from '../SharedStyles.js'
import {getMediaUrl, getThumbnailUrl, getThumbnailUrlCropped} from '../api.js'


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
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      size: {type: Number},
      rect: {type: Array},
      circle: {type: Boolean},
      square: {type: Boolean},
      mime: {type: String},
      displayHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.rect = []
    this.circle = false
    this.square = false
    this.mime = ''
    this.displayHeight = 0
  }


  _renderImageFull() {
    const height = this.displayHeight || ''
    return html`
      <img
      src="${getMediaUrl(this.handle)}"
      class="${this.circle ? 'round' : ''}"
      @error=${this._errorHandler}
      alt="" height="${height}"
      >
      `
  }

  _renderImage() {
    const height = this.displayHeight || ''
    return html`
      <img
      srcset="${getThumbnailUrl(this.handle, this.size, this.square)},
      ${getThumbnailUrl(this.handle, 1.5 * this.size, this.square)} 1.5x
      ${getThumbnailUrl(this.handle, 2 * this.size, this.square)} 2x"
      src="${getThumbnailUrl(this.handle, 2 * this.size, this.square)}"
      class="${this.circle ? 'round' : ''}"
      @error=${this._errorHandler}
      alt="" height="${height}"
      >
      `
  }

  _renderImageCropped() {
    const height = this.displayHeight || ''
    return html`<img
    srcset="${getThumbnailUrlCropped(this.handle, this.rect, this.size, this.square)},
    ${getThumbnailUrlCropped(this.handle, this.rect, 1.5 * this.size, this.square)} 1.5x
    ${getThumbnailUrlCropped(this.handle, this.rect, 2 * this.size, this.square)} 2x"
    src="${getThumbnailUrlCropped(this.handle, this.rect, 2 * this.size, this.square)}"
    class="${this.circle ? 'round' : ''}"
    @error=${this._errorHandler} alt="" height="${height}">`
  }

  render() {
    return (this.size === 0) ? this._renderFull() : this._renderThumb()
  }

  _renderThumb() {
    return (this.rect.length === 0) ? this._renderImage() : this._renderImageCropped()
  }

  _renderFull() {
    return (this.rect.length === 0) ? this._renderImageFull() : this._renderImageFull()
  }


  _errorHandler() {
    this.dispatchEvent(new CustomEvent('grampsjs:error',
      {bubbles: true, composed: true, detail: {message: 'Error loading image'}}))
  }

}

window.customElements.define('grampsjs-img', GrampsjsImg)
