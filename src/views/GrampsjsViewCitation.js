import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsCitation.js'

export class GrampsjsViewCitation extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'citation'
  }

  getUrl() {
    return `/api/citations/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
      <grampsjs-citation
        .data=${this._data}
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-citation>
    `
  }
}

window.customElements.define('grampsjs-view-citation', GrampsjsViewCitation)
