import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsEvent.js'

export class GrampsjsViewEvent extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'event'
  }

  getUrl() {
    return `/api/events/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
      <grampsjs-event
        .data=${this._data}
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-event>
    `
  }
}

window.customElements.define('grampsjs-view-event', GrampsjsViewEvent)
