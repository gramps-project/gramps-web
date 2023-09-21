/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditEventDetails extends GrampsjsObjectForm {
  static get properties() {
    return {
      place: {type: Object},
    }
  }

  constructor() {
    super()
    this.place = {}
  }

  renderForm() {
    return html`
      <h4 class="label">${this._('Date')}</h4>
      <p>
        <grampsjs-form-select-date
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="date"
          label="${this._('Date')}"
          .data="${this.data.date}"
          .strings="${this.strings}"
        >
        </grampsjs-form-select-date>
      </p>
      <h4 class="label">${this._('Place')}</h4>
      <p>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          style="min-height: 300px;"
          objectType="place"
          .strings="${this.strings}"
          id="place"
          label="${this._('Select')}"
          .objectsInitial="${this.data.place
            ? [
                {
                  object_type: 'place',
                  object: this.place,
                  handle: this.data.place,
                },
              ]
            : []}"
          class="edit"
        ></grampsjs-form-select-object-list>
      </p>
    `
  }

  get isValid() {
    return this._areDateSelectValid()
  }
}

window.customElements.define(
  'grampsjs-form-edit-event-details',
  GrampsjsFormEditEventDetails
)
