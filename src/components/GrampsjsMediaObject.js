import {html, css} from 'lit-element'
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
    `]
  }

  renderProfile() {
    return html`
    <h2><mwc-icon>photo</mwc-icon>
    ${this.data.desc || this._('Media Object')}</h2>

    <grampsjs-img
      handle="${this.data.handle}"
      size="0"
      mime="${this.data.mime}"
    ></grampsjs-img>

    `
  }
}


window.customElements.define('grampsjs-media-object', GrampsjsMediaObject)
