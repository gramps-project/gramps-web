/*
Form for adding a new event reference
*/

import {html} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-icon'
import '@material/mwc-button'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEventRef extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="event"
        .strings="${this.strings}"
        id="event-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
      <grampsjs-form-select-type
        required
        id="event-role-type"
        .strings="${this.strings}"
        typeName="event_role_types"
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
    `
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define('grampsjs-form-eventref', GrampsjsFormEventRef)
