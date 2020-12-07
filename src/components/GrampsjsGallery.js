import { LitElement, css, html } from 'lit-element';
import '@material/mwc-button'

import { sharedStyles } from '../SharedStyles.js';

import './GrampsJsImage.js'
import './GrampsjsLightbox.js'


export class GrampsjsGallery extends LitElement {

  static get styles() {
    return [
      sharedStyles,
      css`
      .tile {
        margin: 3px;
        float: left;
      }

      .clear {
        clear: both;
        padding-bottom: 2em;
      }
      `
    ];
  }

  static get properties() {
    return {
      mediaRef: {type: Array},
      media: {type: Array},
      strings: {type: Object},
      _lightboxSelected: {type: Number},
    };
  }

  constructor() {
    super();
    this.mediaRef = [];
    this.media = [];
    this.strings = {};
    this._lightboxSelected = 0;
  }

  render() {
    return html`
    ${this.media.map((mediaObj, index) => this._renderThumbnail(index))}

    <div class="clear"></div>

    <grampsjs-lightbox
      id="gallery-lightbox"
      @lightbox:left="${this._handleLeft}"
      @lightbox:right="${this._handleRight}"
      >
      <div slot="image">
        ${this._renderImage(this._lightboxSelected)}
      </div>
      <span slot="description">${this.media[this._lightboxSelected]?.desc || ''}</span>
      <span slot="button">
        <mwc-button unelevated label="${this._("Show Details")}"
         @click="${this._handleButtonClick}>
        </mwc-button>
      </span>
      <span slot="details"></span>
    </grampsjs-lightbox>
    `
  }

  _handleClick(i) {
    const lightBox = this.shadowRoot.getElementById('gallery-lightbox')
    this._lightboxSelected = i;
    lightBox.open = true;
  }

  _handleButtonClick() {
    console.log(`mediaobject/${this.media[this._lightboxSelected]?.gramps_id}`)
    this.dispatchEvent(new CustomEvent('nav', {
      bubbles: true, composed: true, detail: {
        path: `mediaobject/${this.media[this._lightboxSelected]?.gramps_id}`
      }
    }));
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
    const handle = mediaObj.handle
    const rect = this.mediaRef[i].rect
    const mime = mediaObj.mime
    return html`<div class="tile">
    <grampsjs-img
      handle="${handle}"
      size="160"
      displayHeight="160"
      .rect="${rect || []}"
      mime="${mime}"
      @click="${() => this._handleClick(i)}"
    ></grampsjs-img>
    </div>`
  }

  _renderImage(i) {
    const mediaObj = this.media[i]
    const {handle, mime} = mediaObj
    return html`<div class="tile">
    <grampsjs-img
      handle="${handle}"
      size="0"
      mime="${mime}"
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

window.customElements.define('grampsjs-gallery', GrampsjsGallery);
