/*
Form for adding a new place reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormPlaceRef extends GrampsjsObjectForm {
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
      <h4 class="label">${this._('Place')}</h4>
      <p>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          notDeletable
          style="min-height: 300px;"
          objectType="place"
          .objectsInitial="${this.data.ref
            ? [
                {
                  object_type: 'place',
                  object: this.place,
                  handle: this.data.ref,
                },
              ]
            : []}"
          .strings="${this.strings}"
          id="place-select"
          label="${this._('Select')}"
          class="edit"
        ></grampsjs-form-select-object-list>
      </p>

      <h4 class="label">${this._('Date')}</h4>
      <p>
        ${this.data?.date
          ? html`
              <grampsjs-form-select-date
                fullwidth
                id="date"
                @formdata:changed="${this._handleFormData}"
                .strings="${this.strings}"
                .data="${this.data.date}"
              >
              </grampsjs-form-select-date>
            `
          : html`
              <grampsjs-form-select-date
                fullwidth
                id="date"
                @formdata:changed="${this._handleFormData}"
                .strings="${this.strings}"
              >
              </grampsjs-form-select-date>
            `}
      </p>
    `
  }

  get isValid() {
    if (!this.data.ref) {
      return false
    }
    return this._areDateSelectValid()
  }
}

window.customElements.define('grampsjs-form-placeref', GrampsjsFormPlaceRef)
