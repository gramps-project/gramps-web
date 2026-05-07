/*
Form for adding a new person reference
*/

import {html} from 'lit'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormPersonRef extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="person"
        .appState="${this.appState}"
        id="person-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
    `
  }
}

window.customElements.define('grampsjs-form-personref', GrampsjsFormPersonRef)
