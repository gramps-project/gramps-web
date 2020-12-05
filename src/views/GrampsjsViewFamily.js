import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsFamily.js'


export class GrampsjsViewFamily extends GrampsjsViewObject {


  getUrl() {
    return `/api/families/?gramps_id=${this.grampsId}&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-family .data=${this._data} .strings=${this.strings}></grampsjs-family>
    `
  }

}


window.customElements.define('grampsjs-view-family', GrampsjsViewFamily)
