import {LitElement, css, html} from 'lit-element'
import '@material/mwc-button'

import {sharedStyles} from '../SharedStyles.js'

import './GrampsJsImage.js'
import './GrampsjsLightbox.js'
import '../views/GrampsjsViewMediaLightbox.js'


export class GrampsjsGallery extends LitElement {

  static get styles() {
    return [
      sharedStyles,
      css`
      .tile {
        margin: 3px;
        float: left;
        cursor: pointer;
      }

      .clear {
        clear: both;
        padding-bottom: 2em;
      }
      `
    ]
  }

  static get properties() {
    return {
      mediaRef: {type: Array},
      media: {type: Array},
      strings: {type: Object},
      _lightboxSelected: {type: Number},
    }
  }

  constructor() {
    super()
    this.mediaRef = []
    this.media = []
    this.strings = {}
    this._lightboxSelected = 0
  }

  render() {
    return html`
    ${this.media.map((mediaObj, index) => this._renderThumbnail(index))}

    <div class="clear"></div>

    <grampsjs-view-media-lightbox
      id="gallery-lightbox-view"
      @lightbox:left="${this._handleLeft}"
      @lightbox:right="${this._handleRight}"
      @rect:clicked="${this._handleRectClick}"
      handle="${this.media[this._lightboxSelected]?.handle}"
      ?hideLeftArrow="${this._lightboxSelected === 0}"
      ?hideRightArrow="${this._lightboxSelected === this.media.length - 1}"
      >
    </grampsjs-view-media-lightbox>
    `
  }

  _handleRectClick(event) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: event.detail.target}}))
  }

  _handleClick(i) {
    const lightBoxView = this.shadowRoot.getElementById('gallery-lightbox-view')
    const lightBox = lightBoxView.shadowRoot.getElementById('gallery-lightbox')
    if (lightBox) {
      this._lightboxSelected = i
      lightBox.open = true
    }
  }

  _handleLeft(event) {
    if (event.detail?.id === 'gallery-lightbox') {
      if (this._lightboxSelected > 0) {
        this._lightboxSelected -= 1
      }
    }
  }

  _handleRight(event) {
    if (event.detail?.id === 'gallery-lightbox') {
      if (this._lightboxSelected < this.media.length - 1) {
        this._lightboxSelected += 1
      }
    }
  }

  _renderThumbnail(i) {
    const mediaObj = this.media[i]
    const {handle, mime} = mediaObj
    const {rect} = this.mediaRef[i]
    return html`<div class="tile">
    <grampsjs-img
      handle="${handle}"
      size="200"
      displayHeight="200"
      .rect="${rect || []}"
      mime="${mime}"
      @click="${() => this._handleClick(i)}"
    ></grampsjs-img>
    </div>`
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

window.customElements.define('grampsjs-gallery', GrampsjsGallery)
