import {html} from 'lit'

import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'
import {emptyDate, typeString} from '../util.js'

export const GrampsjsNewEventMixin = superClass =>
  class extends superClass {
    // type, date, description and place, filled from this.data
    renderEventFields() {
      return html`
        <h3 class="label">${this._('Type')}</h3>
        <grampsjs-form-select-type
          required
          noheading
          id="event-type"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="event_types"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
          value="${typeString(this.data?.type)}"
        >
        </grampsjs-form-select-type>

        <h3 class="label">${this._('Date')}</h3>
        <p>
          <grampsjs-form-select-date
            id="date"
            .data="${this.data?.date ?? emptyDate}"
            .appState="${this.appState}"
          >
          </grampsjs-form-select-date>
        </p>

        <h3 class="label">${this._('Description')}</h3>
        <p>
          <grampsjs-form-string
            fullwidth
            id="description"
            @formdata:changed="${this._handleFormData}"
            label="${this._('Description')}"
            value="${this.data?.description || ''}"
            .appState="${this.appState}"
          >
          </grampsjs-form-string>
        </p>

        <h3 class="label">${this._('Place')}</h3>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          id="place"
          objectType="place"
          allowNew
          .appState="${this.appState}"
          .objectsInitial="${this.data?.place
            ? [{object_type: 'place', object: {}, handle: this.data.place}]
            : []}"
        ></grampsjs-form-select-object-list>
      `
    }

    renderForm() {
      return html`
        ${this.renderEventFields()} ${this._renderCitationForm()}
        ${this._renderMediaForm()} ${this._renderTagsForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }
  }
