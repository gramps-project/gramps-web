import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsNote.js'


export class GrampsjsViewNote extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'note'
  }

  getUrl() {
    const options = {
      link_format: '/{obj_class}/{gramps_id}'
    }
    return `/api/notes/?gramps_id=${this.grampsId}&locale=${this.strings?.__lang__ || 'en'}&profile=all&backlinks=true&extend=all&formats=html&format_options=${encodeURIComponent(JSON.stringify(options))}`
  }

  renderElement() {
    return html`
    <grampsjs-note .data=${this._data} .strings=${this.strings}></grampsjs-note>
    `
  }

}


window.customElements.define('grampsjs-view-note', GrampsjsViewNote)
