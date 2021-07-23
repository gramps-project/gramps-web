import {html, css} from 'lit'
import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsJsImage.js'

import '@material/mwc-icon'


export class GrampsjsMediaObject extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }

      grampsjs-img {
        margin: 30px 0;
      }

      dl::after {
        content: "";
        display: block;
        clear: both;
      }
    `]
  }

  renderProfile() {
    return html`
    <h2><mwc-icon>photo</mwc-icon>
    ${this.data.desc || this._('Media Object')}</h2>

    <dl>
    ${this.data?.profile?.date ? html`
    <div>
      <dt>
        ${this._('Date')}
      </dt>
      <dd>
      ${this.data.profile.date}
      </dd>
    </div>
    ` : ''}
    </dl>

    <grampsjs-img
      handle="${this.data.handle}"
      size="1000"
      class="link"
      border
      mime="${this.data.mime}"
      @click=${this._handleClick}
    ></grampsjs-img>


    <grampsjs-view-media-lightbox
      id="obj-lightbox-view"
      @rect:clicked="${this._handleRectClick}"
      handle="${this.data.handle}"
      hideLeftArrow
      hideRightArrow
      >
    </grampsjs-view-media-lightbox>

    `
  }


  _handleClick() {
    const lightBoxView = this.shadowRoot.getElementById('obj-lightbox-view')
    const lightBox = lightBoxView.shadowRoot.getElementById('gallery-lightbox')
    lightBox.open = true
  }

  _handleRectClick(event) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: event.detail.target}}))
  }
}


window.customElements.define('grampsjs-media-object', GrampsjsMediaObject)
