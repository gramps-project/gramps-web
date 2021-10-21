import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsNote.js'

const BASE_DIR = ''

export class GrampsjsViewNote extends GrampsjsViewObject {
  constructor () {
    super()
    this._className = 'note'
    this._saveButton = true
  }

  getUrl () {
    const options = {
      link_format: `${BASE_DIR}/{obj_class}/{gramps_id}`
    }
    return `/api/notes/?gramps_id=${this.grampsId}&locale=${this.strings?.__lang__ || 'en'}&profile=all&backlinks=true&extend=all&formats=html&format_options=${encodeURIComponent(JSON.stringify(options))}`
  }

  renderElement () {
    return html`
    <grampsjs-note .data=${this._data} .strings=${this.strings} ?edit="${this.edit}"></grampsjs-note>
    `
  }
}

window.customElements.define('grampsjs-view-note', GrampsjsViewNote)
