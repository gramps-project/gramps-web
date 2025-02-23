import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsFamily.js'

export class GrampsjsViewFamily extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'family'
  }

  getUrl() {
    return `/api/families/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
      <grampsjs-family
        .data=${this._data}
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-family>
    `
  }
}

window.customElements.define('grampsjs-view-family', GrampsjsViewFamily)
