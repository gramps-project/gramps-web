import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsPlace.js'


export class GrampsjsViewPlace extends GrampsjsViewObject {

  getUrl() {
    return `/api/places/?gramps_id=${this.grampsId}&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-place .data=${this._data} .strings=${this.strings}></grampsjs-place>
    `
  }

}

window.customElements.define('grampsjs-view-place', GrampsjsViewPlace);
