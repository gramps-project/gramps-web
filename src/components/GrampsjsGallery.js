import { LitElement, css, html } from 'lit-element';

import { sharedStyles } from '../SharedStyles.js';

import './GrampsJsImage.js'

function _renderImage(handle, rect, mime) {
  return html`<div class="tile">
  <grampsjs-img
    handle="${handle}"
    size="160"
    displayHeight="160"
    .rect="${rect || []}"
    mime="${mime}"
  ></grampsjs-img>
  </div>`
}

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
      mediaRef: { type: Array },
      media: { type: Array },
      strings : {type: Object}
    };
  }

  constructor() {
    super();
    this.mediaRef = [];
    this.media = [];
    this.strings = {};
  }

  render() {
    return html`
    ${this.media.map((mediaObj, index) => {
      return _renderImage(
        mediaObj.handle,
        this.mediaRef[index].rect,
        mediaObj.mime
      )
    })}
    <div class="clear"></div>
    `
  }


  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

window.customElements.define('grampsjs-gallery', GrampsjsGallery);
