import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsRepository.js'

export class GrampsjsViewRepository extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'repository'
  }

  getUrl() {
    // Use individual URL once handle is available (correct ETag for PUT),
    // fall back to query URL for initial load when handle is not yet known
    const handle = this._data?.handle
    if (handle) {
      return `/api/repositories/${handle}?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=all&backlinks=true&extend=all`
    }
    return `/api/repositories/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
      <grampsjs-repository
        .data=${this._data}
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-repository>
    `
  }
}

window.customElements.define('grampsjs-view-repository', GrampsjsViewRepository)
