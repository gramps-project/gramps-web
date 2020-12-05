import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsMediaObject.js'


export class GrampsjsViewMedia extends GrampsjsViewObject {


  getUrl() {
    return `/api/media/?gramps_id=${this.grampsId}&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-media-object .data=${this._data} .strings=${this.strings}></grampsjs-media-object>
    `
  }

}


window.customElements.define('grampsjs-view-media', GrampsjsViewMedia)
