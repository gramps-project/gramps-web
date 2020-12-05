import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsCitation.js'


export class GrampsjsViewCitation extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'citation'
  }

  getUrl() {
    return `/api/citations/?gramps_id=${this.grampsId}&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-citation .data=${this._data} .strings=${this.strings}></grampsjs-citation>
    `
  }

}


window.customElements.define('grampsjs-view-citation', GrampsjsViewCitation)
