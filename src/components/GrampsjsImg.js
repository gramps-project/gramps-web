/*
An Image thumbnail element.
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {ifDefined} from 'lit/directives/if-defined.js'
import {keyed} from 'lit/directives/keyed.js'
import {mdiImageBroken, mdiPlayCircle} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {getMediaUrl, getThumbnailUrl, getThumbnailUrlCropped} from '../api.js'
import {hasThumbnail, mediaIconPath, normalizeRect} from '../util.js'
import './GrampsjsIcon.js'

class GrampsjsImg extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
        }

        :host([cover]) {
          width: 100%;
          height: 100%;
        }

        img {
          display: block;
          max-width: 100%;
          max-height: var(--grampsjs-img-max-height, 100vh);
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

        .placeholder {
          display: block;
          max-width: 100%;
          height: auto;
          aspect-ratio: 1;
          background-color: var(--grampsjs-color-icon-background);
          fill: var(--grampsjs-color-icon);
        }

        .placeholder.cover {
          width: 100%;
          height: 100%;
          aspect-ratio: unset;
        }

        .video {
          position: relative;
          display: inline-block;
          vertical-align: top;
        }

        :host([cover]) .video {
          display: block;
          width: 100%;
          height: 100%;
        }

        .play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .play svg {
          width: 33%;
          max-width: 72px;
          fill: rgba(255, 255, 255, 0.85);
          filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.5));
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
      _imgGeneration: {type: Number},
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
    this._imgGeneration = 0
    this._handleTokenRefreshed = this._handleTokenRefreshed.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('token:refreshed', this._handleTokenRefreshed)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('token:refreshed', this._handleTokenRefreshed)
  }

  _renderImageFull() {
    return keyed(
      `${this.handle}-${this._imgGeneration}`,
      html`
        <img
          src="${getMediaUrl(this.handle)}"
          data-gen="${this._imgGeneration}"
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

  _renderImage() {
    return keyed(
      `${this.handle}-${this._imgGeneration}`,
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
          data-gen="${this._imgGeneration}"
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
      `${this.handle}-${this._imgGeneration}`,
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
        data-gen="${this._imgGeneration}"
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

  _renderPlaceholder(iconPath, label = '') {
    const size = this.displayHeight || Math.min(this.size || 200, 400)
    return html`<svg
      class=${classMap({
        placeholder: true,
        round: this.circle,
        bordered: this.border,
        cover: this.cover,
      })}
      viewBox="-8 -8 40 40"
      width="${size}"
      height="${size}"
      style="${this.circle ? '' : `border-radius:${this.radius}px`}"
      role="${label ? 'img' : 'presentation'}"
      aria-label="${ifDefined(label || undefined)}"
    >
      <path d="${iconPath}" />
    </svg>`
  }

  // A caller's fallback icon, else the media type's icon, except for images
  // and media of unknown type, whose thumbnail should have loaded. Servers
  // without ffmpeg have no video thumbnails.
  renderBrokenImage() {
    if (this.fallbackIcon) {
      return this._renderPlaceholder(this.fallbackIcon)
    }
    if (!this.mime || this.mime.startsWith('image')) {
      return this._renderPlaceholder(mdiImageBroken, 'Error')
    }
    return this._renderPlaceholder(mediaIconPath(this.mime))
  }

  render() {
    if (this._error) {
      return this.renderBrokenImage()
    }
    const placeholderIcon = this._placeholderIcon()
    if (placeholderIcon) {
      return this._renderPlaceholder(placeholderIcon)
    }
    const img = this.size === 0 ? this._renderFull() : this._renderThumb()
    if (this.mime.startsWith('video')) {
      return html`<span class="video"
        >${img}<span class="play"
          ><svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="${mdiPlayCircle}" /></svg></span
      ></span>`
    }
    return img
  }

  // The icon standing in for media without a thumbnail, or '' for media
  // that have one
  _placeholderIcon() {
    return hasThumbnail(this.mime) ? '' : mediaIconPath(this.mime)
  }

  _renderThumb() {
    const rect = normalizeRect(this.rect)
    return rect ? this._renderImageCropped(rect) : this._renderImage()
  }

  _renderFull() {
    return this._renderImageFull()
  }

  _handleTokenRefreshed() {
    this._error = false
    this._imgGeneration++
  }

  _errorHandler(e) {
    const gen = parseInt(e.currentTarget.dataset.gen, 10)
    if (gen === this._imgGeneration) {
      this._error = true
    }
  }
}

window.customElements.define('grampsjs-img', GrampsjsImg)
