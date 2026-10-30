/*
An audio or video player for a media object.
*/

import {html, css, LitElement} from 'lit'

import {getMediaUrl} from '../api.js'
import './GrampsjsImg.js'

// Whether `mime` is played by grampsjs-media-player
export function isPlayableMime(mime) {
  return Boolean(mime?.startsWith('audio/') || mime?.startsWith('video/'))
}

class GrampsjsMediaPlayer extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      video {
        display: block;
        max-width: 100%;
        max-height: var(--grampsjs-media-player-max-height, 80vh);
      }

      .audio {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: min(400px, 100%);
      }

      audio {
        width: 100%;
      }
    `
  }

  static get properties() {
    return {
      handle: {type: String},
      mime: {type: String},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.mime = ''
  }

  render() {
    if (!this.handle) {
      return ''
    }
    // src on the element itself, so the player reloads when the handle changes
    const src = getMediaUrl(this.handle)
    if (this.mime.startsWith('video/')) {
      return html`<video controls src="${src}"></video>`
    }
    if (this.mime.startsWith('audio/')) {
      return html`<div class="audio">
        <grampsjs-img
          handle="${this.handle}"
          mime="${this.mime}"
          size="400"
        ></grampsjs-img>
        <audio controls src="${src}"></audio>
      </div>`
    }
    return ''
  }
}

window.customElements.define('grampsjs-media-player', GrampsjsMediaPlayer)
