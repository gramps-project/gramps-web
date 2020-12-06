import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsNote.js'


export class GrampsjsViewNote extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'note'
  }

  getUrl() {
    return `/api/notes/?gramps_id=${this.grampsId}&profile=all&backlinks=true&extend=all&formats=html`
  }

  renderElement() {
    return html`
    <grampsjs-note .data=${this._data} .strings=${this.strings}></grampsjs-note>
    `
  }

}


window.customElements.define('grampsjs-view-note', GrampsjsViewNote)
