import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import {getEnclosingPlaces} from '../util.js'
import '../components/GrampsjsPlace.js'

export class GrampsjsViewPlace extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'place'
  }

  getUrl() {
    return `/api/places/?gramps_id=${
      this.grampsId
    }&backlinks=true&extend=all&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all`
  }

  // asks the server, as backlinks in this view's data can be stale
  async _deleteBlocked() {
    const {handle} = this._data
    if (!handle) {
      return null
    }
    const enclosing = await getEnclosingPlaces(this.appState, [handle])
    if (enclosing.length === 0) {
      return null
    }
    return {
      title: this._('Cannot delete place.'),
      message: this._(
        'This place is currently referenced by another place. First remove the places it contains.'
      ),
    }
  }

  renderElement() {
    return html`
      <grampsjs-place
        .data=${this._data}
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-place>
    `
  }
}

window.customElements.define('grampsjs-view-place', GrampsjsViewPlace)
