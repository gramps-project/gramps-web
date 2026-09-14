import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPlaceMixin} from '../mixins/GrampsjsNewPlaceMixin.js'

export class GrampsjsViewNewPlace extends GrampsjsNewPlaceMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.postUrl = '/api/places/'
    this.itemPath = 'place'
    this.objClass = 'Place'
  }

  renderContent() {
    return html`
      <h2>${this._('New Place')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
  }
}

window.customElements.define('grampsjs-view-new-place', GrampsjsViewNewPlace)
