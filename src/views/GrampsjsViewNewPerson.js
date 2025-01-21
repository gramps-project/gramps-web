import {html} from 'lit'

import '../components/GrampsjsFormName.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'

export class GrampsjsViewNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsViewNewObject
) {
  renderContent() {
    return html`
      <h2>${this._('New Person')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }
}

window.customElements.define('grampsjs-view-new-person', GrampsjsViewNewPerson)
