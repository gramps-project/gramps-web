import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsPlace.js'


export class GrampsjsViewPlace extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'place'
  }

  getUrl() {
    return `/api/places/?gramps_id=${this.grampsId}&backlinks=true&extend=all&locale=${this.strings?.__lang__ || 'en'}&profile=all`
  }

  renderElement() {
    return html`
    <grampsjs-place .data=${this._data} .strings=${this.strings}></grampsjs-place>
    `
  }

}

window.customElements.define('grampsjs-view-place', GrampsjsViewPlace);
