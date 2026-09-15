import {html} from 'lit'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsNewPlaceMixin} from '../mixins/GrampsjsNewPlaceMixin.js'
import {GrampsjsNewObjectTagsMixin} from '../mixins/GrampsjsNewObjectTagsMixin.js'

export class GrampsjsFormNewPlace extends GrampsjsNewObjectTagsMixin(
  GrampsjsNewPlaceMixin(GrampsjsObjectForm)
) {
  _renderCitationForm() {
    return html`
      <h3 class="label">${this._('Citation')}</h3>

      <grampsjs-form-select-object-list
        multiple
        id="object-citation"
        objectType="citation"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>
    `
  }

  get isValid() {
    return this.isFormValid
  }
}

window.customElements.define('grampsjs-form-new-place', GrampsjsFormNewPlace)
