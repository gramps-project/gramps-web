import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsEvent.js'

export class GrampsjsViewEvent extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'event'
  }

  getUrl() {
    // Use individual URL once handle is available (correct ETag for PUT),
    // fall back to query URL for initial load when handle is not yet known
    const handle = this._data?.handle
    if (handle) {
      return `/api/events/${handle}?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=all&backlinks=true&extend=all`
    }
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
