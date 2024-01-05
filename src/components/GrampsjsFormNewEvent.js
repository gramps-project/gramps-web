import {html} from 'lit'

import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsNewEventMixin} from '../mixins/GrampsjsNewEventMixin.js'

export class GrampsjsFormNewEvent extends GrampsjsNewEventMixin(
  GrampsjsObjectForm
) {
  static get properties() {
    return {
      defaultRole: {type: String},
    }
  }

  constructor() {
    super()
    this.data = {_class: 'Event'}
    this.defaultRole = 'Primary'
  }

  _renderCitationForm() {
    return html`
      <h4 class="label">${this._('Citation')}</h4>

      <grampsjs-form-select-object-list
        multiple
        id="object-citation"
        objectType="citation"
        .strings="${this.strings}"
      ></grampsjs-form-select-object-list>
    `
  }

  renderForm() {
    return html`
      ${super.renderForm()}

      <grampsjs-form-select-type
        required
        id="event-role-type"
        defaultTypeName="${this.defaultRole}"
        heading="${this._('Role')}"
        .strings="${this.strings}"
        typeName="event_role_types"
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
    `
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector(
      'grampsjs-form-select-type'
    )
    let valid = true
    if (!selectType !== null && !selectType.isValid()) {
      valid = false
    }
    const selectDate = this.shadowRoot.querySelector(
      'grampsjs-form-select-date'
    )
    if (!selectDate !== null && !selectDate.isValid()) {
      valid = false
    }
    this.isFormValid = valid
  }
}

window.customElements.define('grampsjs-form-new-event', GrampsjsFormNewEvent)
