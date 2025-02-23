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
  static get properties() {
    return {
      defaultRole: {type: String},
    }
  }

  constructor() {
    super()
    this.defaultRole = 'Primary'
  }

  renderForm() {
    return html`
      ${!this.new // select event shown only for new event ref
        ? ''
        : html`
            <grampsjs-form-select-object-list
              fixedMenuPosition
              style="min-height: 300px;"
              objectType="event"
              .appState="${this.appState}"
              id="event-select"
              label="${this._('Select')}"
              class="edit"
              .data="${this.data}"
            ></grampsjs-form-select-object-list>
          `}
      <grampsjs-form-select-type
        required
        id="event-role-type"
        defaultTypeName="${this.defaultRole}"
        heading="${this._('Role')}"
        .appState="${this.appState}"
        typeName="event_role_types"
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        initialValue="${this.data?.role?.string || this.data?.role || ''}"
      >
      </grampsjs-form-select-type>
    `
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define('grampsjs-form-eventref', GrampsjsFormEventRef)
