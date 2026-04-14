/*
An Image thumbnail element.
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {ifDefined} from 'lit/directives/if-defined.js'
import {keyed} from 'lit/directives/keyed.js'
import {mdiFile, mdiFileMusic, mdiImageBroken} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {getMediaUrl, getThumbnailUrl, getThumbnailUrlCropped} from '../api.js'
import {normalizeRect} from '../util.js'
import './GrampsjsIcon.js'

class GrampsjsImg extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host([cover]) {
          display: block;
          position: absolute;
          inset: 0;
        }

        img {
          max-width: 100%;
          max-height: 100vh;
        }

        img.cover {
          width: 100%;
          height: 100%;
          max-width: unset;
          max-height: unset;
          object-fit: cover;
          display: block;
        }

        .round {
          border-radius: 50%;
        }

        .bordered {
          box-shadow: 0px 0px 4px 0px var(--grampsjs-body-font-color-20);
        }

        img.broken {
          background-color: var(--md-sys-color-surface-container-highest);
        }

        img.file-placeholder {
          background-color: var(--grampsjs-color-shade-230);
        }

        .fallback-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: var(--grampsjs-color-icon-background);
        }
      `,
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      size: {type: Number},
      rect: {type: Array},
      circle: {type: Boolean},
      cover: {type: Boolean},
      square: {type: Boolean},
      mime: {type: String},
      displayHeight: {type: Number},
      border: {type: Boolean},
      radius: {type: Number},
      checksum: {type: String},
      fallbackIcon: {type: String},
      _error: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.rect = []
    this.circle = false
    this.cover = false
    this.square = false
    this.mime = ''
    this.displayHeight = 0
    this.border = false
    this.radius = 0
    this.checksum = null
    this.fallbackIcon = ''
    this._error = false
  }

  _renderImageFull() {
    return keyed(
      this.handle,
      html`
        <img
          src="${getMediaUrl(this.handle)}"
          class=${classMap({
            round: this.circle,
            bordered: this.border,
            cover: this.cover,
          })}
          @error=${this._errorHandler}
          alt=""
          height=${ifDefined(this.displayHeight || undefined)}
          decoding="async"
          style="${this.circle ? '' : `border-radius:${this.radius}px`}"
        />
      `
    )
  }

  willUpdate(changedProps) {
    if (
      changedProps.has('handle') ||
      changedProps.has('mime') ||
      changedProps.has('checksum')
    ) {
      this._error = false
    }
  }

  async reload() {
    this._error = false
    if (this.mime.startsWith('image')) {
      // reload full image if present
      this._reloadImageUrl(getMediaUrl(this.handle))
      // reload thumbnail if present
      this._reloadImageUrl(
        getThumbnailUrl(this.handle, this.size, this.square, this.checksum)
      )
    }
  }

  async _reloadImageUrl(url) {
    await fetch(url, {cache: 'reload', mode: 'no-cors'})
    this.renderRoot.querySelectorAll('img').forEach(img => {
      if (img.src === url) {
        // eslint-disable-next-line no-param-reassign
        img.src = url
      }
    })
  }

  getBBox() {
    const img = this.shadowRoot.querySelector('img')
    if (img === null) {
      return null
    }
    return img.getBoundingClientRect()
  }

  _renderImage() {
    return keyed(
      this.handle,
      html`
        <img
          srcset="
            ${getThumbnailUrl(
              this.handle,
              this.size,
              this.square,
              this.checksum
            )},
            ${getThumbnailUrl(
              this.handle,
              1.5 * this.size,
              this.square,
              this.checksum
            )} 1.5x,
            ${getThumbnailUrl(
              this.handle,
              2 * this.size,
              this.square,
              this.checksum
            )} 2x,
            ${getThumbnailUrl(
              this.handle,
              3 * this.size,
              this.square,
              this.checksum
            )} 3x
          "
          src="${getThumbnailUrl(
            this.handle,
            this.size,
            this.square,
            this.checksum
          )}"
          class=${classMap({
            round: this.circle,
            bordered: this.border,
            cover: this.cover,
          })}
          @error=${this._errorHandler}
          alt=""
          style="${this.circle ? '' : `border-radius:${this.radius}px`}"
          height=${ifDefined(this.displayHeight || undefined)}
          loading="lazy"
          decoding="async"
        />
      `
    )
  }

  _renderImageCropped(rect) {
    return keyed(
      this.handle,
      html`<img
        srcset="
          ${getThumbnailUrlCropped(
            this.handle,
            rect,
            this.size,
            this.square,
            this.checksum
          )},
          ${getThumbnailUrlCropped(
            this.handle,
            rect,
            1.5 * this.size,
            this.square,
            this.checksum
          )} 1.5x,
          ${getThumbnailUrlCropped(
            this.handle,
            rect,
            2 * this.size,
            this.square,
            this.checksum
          )} 2x,
          ${getThumbnailUrlCropped(
            this.handle,
            rect,
            3 * this.size,
            this.square,
            this.checksum
          )} 3x
        "
        src="${getThumbnailUrlCropped(
          this.handle,
          rect,
          this.size,
          this.square,
          this.checksum
        )}"
        class=${classMap({
          round: this.circle,
          bordered: this.border,
          cover: this.cover,
        })}
        style="${this.circle ? '' : `border-radius:${this.radius}px`}"
        @error=${this._errorHandler}
        alt=""
        height=${ifDefined(this.displayHeight || undefined)}
        loading="lazy"
        decoding="async"
      />`
    )
  }

  _renderPlaceholder(iconPath, cssClass, altText = '') {
    const svgSize = this.displayHeight || Math.min(this.size || 200, 400)
    const src = `data:image/svg+xml;base64,${btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36" width="${svgSize}" height="${svgSize}"><path fill-opacity=".5" fill="#808080" d="${iconPath}"/></svg>`
    )}`
    return html`<img
      class=${classMap({
        [cssClass]: true,
        round: this.circle,
        bordered: this.border,
      })}
      height=${ifDefined(this.displayHeight || undefined)}
      style="${this.circle ? '' : `border-radius:${this.radius}px`}"
      src="${src}"
      alt="${altText}"
    />`
  }

  renderBrokenImage() {
    if (this.fallbackIcon) {
      return html`<div
        class=${classMap({
          'fallback-icon': true,
          round: this.circle,
          bordered: this.border,
        })}
        style="${this.circle ? '' : `border-radius:${this.radius}px`}"
      >
        <grampsjs-icon
          path="${this.fallbackIcon}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </div>`
    }
    return this._renderPlaceholder(mdiImageBroken, 'broken', 'Error')
  }

  render() {
    if (this._error) {
      return this.renderBrokenImage()
    }
    if (this.mime.startsWith('audio')) {
      if (this.square) {
        return this._renderPlaceholder(mdiFileMusic, 'file-placeholder')
      }
      return this._renderAudio()
    }
    if (this.mime.startsWith('video')) {
      return this._renderVideo()
    }
    if (
      this.mime !== '' &&
      !this.mime.startsWith('image') &&
      this.mime !== 'application/pdf'
    ) {
      return this._renderPlaceholder(mdiFile, 'file-placeholder')
    }
    return this.size === 0 ? this._renderFull() : this._renderThumb()
  }

  _renderAudio() {
    return html`
      <audio controls>
        <source src="${getMediaUrl(this.handle)}" type="${this.mime}" />
        Your browser does not support the audio element.
      </audio>
    `
  }

  _renderVideo() {
    return html`
      <video
        ?controls=${this.displayHeight === 0}
        height="${this.displayHeight > 0 ? this.displayHeight : 'auto'}"
      >
        <source src="${getMediaUrl(this.handle)}" type="${this.mime}" />
        Your browser does not support the video element.
      </video>
    `
  }

  _renderThumb() {
    const rect = normalizeRect(this.rect)
    return rect ? this._renderImageCropped(rect) : this._renderImage()
  }

  _renderFull() {
    return this._renderImageFull()
  }

  _errorHandler() {
    this._error = true
  }
}

window.customElements.define('grampsjs-img', GrampsjsImg)
