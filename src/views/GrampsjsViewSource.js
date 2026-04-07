import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsSource.js'

export class GrampsjsViewSource extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'source'
  }

  getUrl() {
    // Use individual URL once handle is available (correct ETag for PUT),
    // fall back to query URL for initial load when handle is not yet known
    const handle = this._data?.handle
    if (handle) {
      return `/api/sources/${handle}?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=all&backlinks=true&extend=all`
    }
    return `/api/sources/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
      <grampsjs-source
        .data=${this._data}
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-source>
    `
  }
}

window.customElements.define('grampsjs-view-source', GrampsjsViewSource)
