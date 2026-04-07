import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsCitation.js'

export class GrampsjsViewCitation extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'citation'
  }

  getUrl() {
    // Use individual URL once handle is available (correct ETag for PUT),
    // fall back to query URL for initial load when handle is not yet known
    const handle = this._data?.handle
    if (handle) {
      return `/api/citations/${handle}?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=all&backlinks=true&extend=all`
    }
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
