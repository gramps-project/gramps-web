/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectObjectList.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormCitation extends GrampsjsObjectForm {
  renderForm () {
    return html`
      <grampsjs-form-select-object-list
        notDeletable
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="citation"
        .strings="${this.strings}"
        id="citation-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
    `
  }
}

window.customElements.define('grampsjs-form-citation', GrampsjsFormCitation)
